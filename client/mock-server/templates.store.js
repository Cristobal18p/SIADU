/**
 * Almacén en memoria de plantillas, versiones y flujos. Cada operación devuelve `{ status, body }`.
 * Se reinicia al reiniciar Vite.
 */
import { MOCK_TEMPLATES_ADMIN, MOCK_TEMPLATE_DETAILS } from './templates.mock.js';
import { AREA_ESCUELA_SOLICITANTE, MOCK_CARGOS, MOCK_CARRERAS, MOCK_FLOWS } from './catalogs.mock.js';
import { validarDefinicion, validarPublicacion } from '../../shared/documento/validar.js';

const ESTAMENTOS = ['ESTUDIANTE', 'PROFESOR', 'ADMINISTRATIVO'];

const clone = (v) => JSON.parse(JSON.stringify(v));
const ahora = () => new Date().toISOString();

const error = (status, codigo, mensaje, detalles = []) => ({
  status,
  body: { error: { codigo, mensaje, detalles } },
});
const invalido = (detalles) => error(400, 'VALIDACION_FALLIDA', 'Hay campos requeridos o con formato incorrecto', detalles);

export function createTemplatesStore() {
  // ---- flujos
  const flows = clone(MOCK_FLOWS);
  let siguienteFlujo = Math.max(...flows.map((f) => f.idFlujo)) + 1;

  const cargoDe = (idAsignacion) => MOCK_CARGOS.find((c) => c.idAsignacion === idAsignacion);
  const pasosConCargo = (flujo) =>
    [...flujo.pasos]
      .sort((a, b) => a.secuencia - b.secuencia)
      .map((p) =>
        // Paso por escuela: se resuelve con el solicitante
        p.alcance === 'ESCUELA_SOLICITANTE'
          ? {
              secuencia: p.secuencia,
              alcance: p.alcance,
              idAsignacion: null,
              idCargo: p.idCargo,
              nombreCargo: MOCK_CARGOS.find((c) => c.idCargo === p.idCargo)?.nombreCargo ?? 'Cargo',
              titular: null,
              area: AREA_ESCUELA_SOLICITANTE,
              reqFirma: p.reqFirma !== false,
            }
          : {
              secuencia: p.secuencia,
              alcance: 'FIJO',
              idAsignacion: p.idAsignacion,
              nombreCargo: cargoDe(p.idAsignacion)?.nombreCargo ?? 'Cargo',
              titular: cargoDe(p.idAsignacion)?.titularActual ?? null,
              area: cargoDe(p.idAsignacion)?.area ?? 'Área General',
              reqFirma: p.reqFirma !== false,
            }
      );
  /** Paso tal como se guarda en el flujo. */
  const pasoGuardado = (p) =>
    p.alcance === 'ESCUELA_SOLICITANTE'
      ? { secuencia: p.secuencia, alcance: 'ESCUELA_SOLICITANTE', idCargo: p.idCargo, reqFirma: p.reqFirma !== false }
      : { secuencia: p.secuencia, alcance: 'FIJO', idAsignacion: p.idAsignacion, reqFirma: p.reqFirma !== false };

  // ---- versiones
  const idFlujoInicial = { 6: 4, 7: 5, 8: 6, 9: 4, 10: 6, 11: 7, 12: 8, 13: 6 };
  const versiones = clone(MOCK_TEMPLATE_DETAILS).map((v) => {
    const fila = MOCK_TEMPLATES_ADMIN.datos.find((d) => d.idPlantilla === v.idPlantilla);
    const { flujo: _flujo, ...resto } = v;
    return { ...resto, idFlujo: idFlujoInicial[v.idPlantilla] ?? null, fechaActualizacion: fila?.fechaActualizacion ?? ahora() };
  });
  let siguientePlantilla = Math.max(...versiones.map((v) => v.idPlantilla)) + 1;
  let siguienteVersion = Math.max(...versiones.map((v) => v.idVersion)) + 1;

  /** Versión con el flujo embebido, tal como la devuelve GET /api/templates/{id}. */
  const conFlujo = (v) => {
    const { idFlujo, fechaActualizacion: _f, ...resto } = v;
    const flujo = flows.find((f) => f.idFlujo === idFlujo);
    return {
      ...clone(resto),
      flujo: flujo ? { idFlujo: flujo.idFlujo, nombre: flujo.nombre, codigo: flujo.codigo, estado: flujo.estado, pasos: pasosConCargo(flujo) } : null,
    };
  };

  const versionesDe = (idPlantilla) => versiones.filter((v) => v.idPlantilla === idPlantilla);
  const vigente = (idPlantilla) => {
    const todas = versionesDe(idPlantilla);
    return todas.find((v) => v.estado === 'ACTIVO') || [...todas].sort((a, b) => b.numeroVersion - a.numeroVersion)[0];
  };
  const borradorDe = (idPlantilla) => versionesDe(idPlantilla).find((v) => v.estado === 'BORRADOR') ?? null;
  /** Nunca publicada: su única versión es la 1 en BORRADOR. */
  const nuncaPublicada = (todas) => todas.length === 1 && todas[0].numeroVersion === 1 && todas[0].estado === 'BORRADOR';

  /** Un flujo en BORRADOR pertenece a la primera versión que lo usa; devuelve el error o null. */
  const comprobarFlujoLibre = (idFlujo, idVersion) => {
    const f = flows.find((x) => x.idFlujo === idFlujo);
    if (!f) return invalido([{ campo: 'idFlujo', mensaje: 'El flujo no existe.' }]);
    if (f.estado === 'BORRADOR' && f.idVersionBorrador != null && f.idVersionBorrador !== idVersion) {
      return error(409, 'CONFLICTO_ESTADO', 'El flujo en borrador pertenece a otra versión de plantilla.');
    }
    return null;
  };

  /** Valida los pasos de un flujo; devuelve el error o null. */
  const validarPasos = (pasos) => {
    if (!Array.isArray(pasos) || pasos.length === 0) {
      return invalido([{ campo: 'pasos', mensaje: 'El flujo necesita al menos un paso.' }]);
    }
    const invalidos = [];
    const detalles = [];
    const asignaciones = new Set();
    const personas = new Set();
    const cargosPorEscuela = new Set();
    pasos.forEach((p, i) => {
      if (p.secuencia !== i + 1) detalles.push({ campo: `pasos[${i}].secuencia`, mensaje: 'Las secuencias deben ser 1, 2, 3…' });
      // Paso por escuela: se identifica por cargo
      if (p.alcance === 'ESCUELA_SOLICITANTE') {
        const campoCargo = `pasos[${i}].idCargo`;
        if (!MOCK_CARGOS.some((c) => c.idCargo === p.idCargo && c.escuela)) detalles.push({ campo: campoCargo, mensaje: 'El cargo no es un cargo por escuela.' });
        else if (cargosPorEscuela.has(p.idCargo)) detalles.push({ campo: campoCargo, mensaje: 'Este cargo ya está en el flujo.' });
        cargosPorEscuela.add(p.idCargo);
        return;
      }
      const campo = `pasos[${i}].idAsignacion`;
      const cargo = cargoDe(p.idAsignacion);
      if (!cargo) detalles.push({ campo, mensaje: 'La asignación no existe.' });
      else if (!cargo.esAprobador) invalidos.push({ campo, mensaje: `${cargo.titularActual} no puede aprobar: necesita cuenta activa y el rol de aprobador.` });
      else if (asignaciones.has(p.idAsignacion)) detalles.push({ campo, mensaje: 'Esta autoridad ya está en el flujo.' });
      else if (personas.has(cargo.idUsuarioTitular)) detalles.push({ campo, mensaje: `${cargo.titularActual} ya está en el flujo: una persona aprueba y firma una sola vez.` });
      asignaciones.add(p.idAsignacion);
      if (cargo?.idUsuarioTitular != null) personas.add(cargo.idUsuarioTitular);
    });
    if (invalidos.length) return error(400, 'APROBADOR_INVALIDO', 'Hay pasos cuyo titular no puede aprobar.', invalidos);
    if (detalles.length) return invalido(detalles);
    return null;
  };

  return {
    // ------------------------------------------------------------ lecturas
    inventario({ estado = 'TODOS', search = '' } = {}) {
      const termino = search.trim().toLowerCase();
      const ids = [...new Set(versiones.map((v) => v.idPlantilla))];
      return ids
        .map((id) => vigente(id))
        .filter((v) => (estado === 'TODOS' || v.estado === estado) &&
          (!termino || v.nombre.toLowerCase().includes(termino) || (v.descripcion || '').toLowerCase().includes(termino)))
        .map((v) => ({
          idPlantilla: v.idPlantilla,
          nombre: v.nombre,
          descripcion: v.descripcion,
          codUnidad: v.codUnidad,
          audiencia: v.audiencia,
          numeroVersion: v.numeroVersion,
          estadoVersion: v.estado,
          idVersionBorrador: borradorDe(v.idPlantilla)?.idVersion ?? null,
          fechaActualizacion: v.fechaActualizacion,
        }))
        .sort((a, b) => new Date(b.fechaActualizacion) - new Date(a.fechaActualizacion));
    },

    /** Totales por estado de la versión vigente. */
    resumen() {
      const cuenta = (estado) => this.inventario({ estado }).length;
      return {
        total: cuenta('TODOS'),
        activas: cuenta('ACTIVO'),
        borradores: cuenta('BORRADOR'),
        inactivas: cuenta('INACTIVO'),
      };
    },

    /** Plantillas dirigidas a los estamentos del solicitante. */
    catalogo(estamentos = null) {
      return versiones
        .filter((v) => v.estado === 'ACTIVO' && (!estamentos || v.audiencia.some((a) => estamentos.includes(a))))
        .map((v) => ({
          idPlantilla: v.idPlantilla,
          idVersion: v.idVersion,
          nombre: v.nombre,
          descripcion: v.descripcion || '',
          codUnidad: v.codUnidad,
        }));
    },

    /** Detalle de una plantilla. Los no administradores solo ven versiones ACTIVO. */
    detalle(idPlantilla, idVersion, esAdmin, estamentos = null) {
      const v = idVersion
        ? versionesDe(idPlantilla).find((x) => x.idVersion === idVersion)
        : vigente(idPlantilla);
      if (!v || (!esAdmin && v.estado !== 'ACTIVO')) return error(404, 'NO_ENCONTRADO', 'La plantilla solicitada no existe.');
      // Sin rol de administrador, solo las de su estamento
      if (!esAdmin && estamentos && !v.audiencia.some((a) => estamentos.includes(a))) {
        return error(404, 'NO_ENCONTRADO', 'La plantilla solicitada no existe.');
      }
      const borrador = esAdmin ? borradorDe(idPlantilla) : null;
      return {
        status: 200,
        body: {
          ...conFlujo(v),
          fechaPublicacion: v.estado === 'BORRADOR' ? null : v.fechaActualizacion,
          versionBorrador: borrador ? { idVersion: borrador.idVersion, numeroVersion: borrador.numeroVersion } : null,
        },
      };
    },

    /** Versión por idVersion (con flujo) para validar y registrar solicitudes. */
    buscarVersion(idVersion) {
      const v = versiones.find((x) => x.idVersion === idVersion);
      return v ? conFlujo(v) : null;
    },

    // ------------------------------------------------------------ escrituras
    crear(body) {
      const detalles = [];
      if (!body?.nombre?.trim()) detalles.push({ campo: 'nombre', mensaje: 'El nombre es obligatorio.' });
      if (!Number.isInteger(body?.codUnidad)) detalles.push({ campo: 'codUnidad', mensaje: 'La unidad es obligatoria.' });
      if (!Array.isArray(body?.audiencia) || body.audiencia.length === 0 || body.audiencia.some((a) => !ESTAMENTOS.includes(a))) {
        detalles.push({ campo: 'audiencia', mensaje: 'Indica al menos un estamento válido.' });
      }
      if (detalles.length) return invalido(detalles);
      const defin = validarDefinicion(body.variableFormJson, body.disenoFormJson);
      if (defin.length) return invalido(defin);
      if (body.idFlujo != null) {
        const conflicto = comprobarFlujoLibre(body.idFlujo, null);
        if (conflicto) return conflicto;
      }

      const registro = {
        idPlantilla: siguientePlantilla++,
        nombre: body.nombre.trim(),
        descripcion: (body.descripcion || '').trim(),
        codUnidad: body.codUnidad,
        audiencia: clone(body.audiencia),
        idVersion: siguienteVersion++,
        numeroVersion: 1,
        estado: 'BORRADOR',
        variableFormJson: clone(body.variableFormJson),
        disenoFormJson: clone(body.disenoFormJson),
        idFlujo: body.idFlujo ?? null,
        fechaActualizacion: ahora(),
      };
      versiones.push(registro);
      const flujoNuevo = flows.find((f) => f.idFlujo === registro.idFlujo);
      if (flujoNuevo?.estado === 'BORRADOR' && flujoNuevo.idVersionBorrador == null) flujoNuevo.idVersionBorrador = registro.idVersion;
      return {
        status: 201,
        body: {
          idPlantilla: registro.idPlantilla,
          idVersion: registro.idVersion,
          numeroVersion: 1,
          estado: 'BORRADOR',
          mensaje: 'Plantilla creada en borrador.',
        },
      };
    },

    actualizar(idPlantilla, body) {
      const todas = versionesDe(idPlantilla);
      if (todas.length === 0) return error(404, 'NO_ENCONTRADO', 'La plantilla no existe.');
      const v = todas.find((x) => x.idVersion === body?.idVersion);
      if (!v) return error(404, 'NO_ENCONTRADO', 'La versión no existe en esta plantilla.');
      if (v.estado !== 'BORRADOR') return error(409, 'CONFLICTO_ESTADO', 'Solo se puede editar una versión en borrador.');

      const detalles = [];
      if (body.nombre !== undefined && !body.nombre.trim()) detalles.push({ campo: 'nombre', mensaje: 'El nombre es obligatorio.' });
      if (body.audiencia !== undefined) {
        const a = body.audiencia;
        if (!Array.isArray(a) || a.length === 0 || a.some((x) => !ESTAMENTOS.includes(x)) || new Set(a).size !== a.length) {
          return invalido([{ campo: 'audiencia', mensaje: 'Indica al menos un estamento válido, sin repetir.' }]);
        }
        if (!nuncaPublicada(todas)) {
          return error(409, 'CONFLICTO_ESTADO', 'La audiencia solo se puede cambiar mientras la plantilla nunca se ha publicado.');
        }
      }
      const defin = validarDefinicion(body.variableFormJson, body.disenoFormJson);
      if (detalles.length || defin.length) return invalido([...detalles, ...defin]);
      if (body.idFlujo != null) {
        const conflicto = comprobarFlujoLibre(body.idFlujo, v.idVersion);
        if (conflicto) return conflicto;
      }

      if (body.nombre !== undefined) todas.forEach((x) => { x.nombre = body.nombre.trim(); });
      if (body.descripcion !== undefined) todas.forEach((x) => { x.descripcion = body.descripcion.trim(); });
      if (body.audiencia !== undefined) todas.forEach((x) => { x.audiencia = clone(body.audiencia); });
      v.variableFormJson = clone(body.variableFormJson);
      v.disenoFormJson = clone(body.disenoFormJson);
      if (body.idFlujo !== undefined) {
        // El flujo en borrador pasa a ser de la versión que lo toma
        const anterior = flows.find((f) => f.idFlujo === v.idFlujo);
        if (anterior?.estado === 'BORRADOR' && anterior.idFlujo !== body.idFlujo) anterior.idVersionBorrador = null;
        v.idFlujo = body.idFlujo; // omitido conserva, null quita
        const actual = flows.find((f) => f.idFlujo === v.idFlujo);
        if (actual?.estado === 'BORRADOR') actual.idVersionBorrador = v.idVersion;
      }
      v.fechaActualizacion = ahora();
      return { status: 200, body: { idPlantilla, idVersion: v.idVersion, mensaje: 'Cambios guardados en borrador con éxito.' } };
    },

    /** Elimina una plantilla nunca publicada, con su versión y el flujo en borrador del que era dueña. */
    eliminar(idPlantilla) {
      const todas = versionesDe(idPlantilla);
      if (todas.length === 0) return error(404, 'NO_ENCONTRADO', 'La plantilla especificada no existe.');
      if (!nuncaPublicada(todas)) {
        return error(409, 'CONFLICTO_ESTADO', 'Solo se puede eliminar una plantilla que nunca se ha publicado. Para retirarla del catálogo, desactívela.');
      }
      const ids = new Set(todas.map((v) => v.idVersion));
      for (let i = flows.length - 1; i >= 0; i--) {
        if (flows[i].estado === 'BORRADOR' && ids.has(flows[i].idVersionBorrador)) flows.splice(i, 1);
      }
      for (let i = versiones.length - 1; i >= 0; i--) {
        if (versiones[i].idPlantilla === idPlantilla) versiones.splice(i, 1);
      }
      return { status: 204, body: null };
    },

    nuevaVersion(idPlantilla) {
      const todas = versionesDe(idPlantilla);
      if (todas.length === 0) return error(404, 'NO_ENCONTRADO', 'La plantilla no existe.');
      const borrador = todas.find((x) => x.estado === 'BORRADOR');
      if (borrador) {
        return error(409, 'CONFLICTO_ESTADO', 'La plantilla ya tiene una versión en borrador.', [
          { campo: 'idVersion', mensaje: String(borrador.idVersion) },
        ]);
      }
      // Clona la versión ACTIVO o, si no hay, la de mayor número
      const activa = todas.find((x) => x.estado === 'ACTIVO') ?? [...todas].sort((a, b) => b.numeroVersion - a.numeroVersion)[0];

      const nueva = {
        ...clone(activa),
        idVersion: siguienteVersion++,
        numeroVersion: Math.max(...todas.map((x) => x.numeroVersion)) + 1,
        estado: 'BORRADOR',
        fechaActualizacion: ahora(),
      };
      versiones.push(nueva);
      return {
        status: 201,
        body: {
          idPlantilla,
          idVersion: nueva.idVersion,
          numeroVersion: nueva.numeroVersion,
          estado: 'BORRADOR',
          mensaje: `Nueva versión ${nueva.numeroVersion} creada para edición.`,
        },
      };
    },

    publicar(idPlantilla, body) {
      const todas = versionesDe(idPlantilla);
      if (todas.length === 0) return error(404, 'NO_ENCONTRADO', 'La plantilla no existe.');
      if (!Number.isInteger(body?.idVersion)) return invalido([{ campo: 'idVersion', mensaje: 'idVersion es obligatorio.' }]);
      const v = todas.find((x) => x.idVersion === body.idVersion);
      if (!v) return error(404, 'NO_ENCONTRADO', 'La versión no existe en esta plantilla.');
      if (v.estado !== 'BORRADOR') return error(409, 'CONFLICTO_ESTADO', 'Solo se puede publicar una versión en borrador.');
      const flujo = flows.find((f) => f.idFlujo === v.idFlujo);
      if (!flujo || flujo.pasos.length === 0) {
        return error(409, 'CONFLICTO_ESTADO', 'La versión necesita un flujo de aprobación con al menos un paso para publicarse.');
      }

      // Un paso por escuela exige audiencia estudiantil y un titular por escuela
      const pasosEscuela = flujo.pasos.filter((p) => p.alcance === 'ESCUELA_SOLICITANTE');
      if (pasosEscuela.length && !(v.audiencia?.length === 1 && v.audiencia[0] === 'ESTUDIANTE')) {
        return invalido([{ campo: 'audiencia', mensaje: 'Un paso por escuela solo sirve en plantillas dirigidas únicamente a estudiantes.' }]);
      }
      const escuelasSinAprobador = pasosEscuela.flatMap((p) =>
        [...new Set(MOCK_CARRERAS.map((c) => c.escuela))].filter(
          (escuela) => !MOCK_CARGOS.some((c) => c.idCargo === p.idCargo && c.escuela === escuela && c.esAprobador)
        )
      );
      if (escuelasSinAprobador.length) {
        return error(409, 'APROBADOR_INVALIDO', 'Hay escuelas sin un titular que pueda aprobar.', escuelasSinAprobador.map((escuela) => ({
          campo: 'idFlujo', mensaje: `La ${escuela} no tiene un titular de este cargo que pueda aprobar.`,
        })));
      }

      const docu = validarPublicacion(v.variableFormJson, v.disenoFormJson, { conFirma: flujo.pasos.some((p) => p.reqFirma !== false) });
      if (docu.length) return invalido(docu);

      // Revalida el flujo con los titulares actuales
      const sinAprobar = flujo.pasos.filter((p) => p.alcance !== 'ESCUELA_SOLICITANTE').map((p) => cargoDe(p.idAsignacion)).filter((c) => !c?.esAprobador);
      if (sinAprobar.length) {
        return error(409, 'APROBADOR_INVALIDO', 'Hay pasos cuyo titular ya no puede aprobar.', sinAprobar.map((c) => ({
          campo: 'idFlujo', mensaje: `${c?.titularActual ?? 'El titular'} no puede aprobar.`,
        })));
      }
      todas.forEach((x) => { if (x.estado === 'ACTIVO') { x.estado = 'INACTIVO'; } });
      v.estado = 'ACTIVO';
      v.fechaActualizacion = ahora();
      // El flujo pasa a ACTIVO
      flujo.estado = 'ACTIVO';
      flujo.idVersionBorrador = null;
      return {
        status: 200,
        body: {
          idPlantilla,
          idVersion: v.idVersion,
          numeroVersion: v.numeroVersion,
          estado: 'ACTIVO',
          mensaje: `La versión ${v.numeroVersion} ha sido publicada exitosamente.`,
        },
      };
    },

    /** Desactiva una versión ACTIVO. */
    desactivar(idPlantilla, body) {
      const todas = versionesDe(idPlantilla);
      if (todas.length === 0) return error(404, 'NO_ENCONTRADO', 'La plantilla no existe.');
      if (!Number.isInteger(body?.idVersion)) return invalido([{ campo: 'idVersion', mensaje: 'idVersion es obligatorio.' }]);
      const v = todas.find((x) => x.idVersion === body.idVersion);
      if (!v) return error(404, 'NO_ENCONTRADO', 'La versión no existe en esta plantilla.');
      if (v.estado !== 'ACTIVO') return error(409, 'CONFLICTO_ESTADO', 'Solo se puede desactivar una versión activa.');
      v.estado = 'INACTIVO';
      v.fechaActualizacion = ahora();
      return {
        status: 200,
        body: {
          idPlantilla,
          idVersion: v.idVersion,
          numeroVersion: v.numeroVersion,
          estado: 'INACTIVO',
          mensaje: `La versión ${v.numeroVersion} fue desactivada. Las solicitudes en proceso continúan.`,
        },
      };
    },

    // ------------------------------------------------------------ catálogos y flujos
    /** Cargos de la unidad; con `soloAprobadores`, solo los que pueden aprobar. */
    cargos({ soloAprobadores = false } = {}) {
      return clone(MOCK_CARGOS.filter((c) => !soloAprobadores || c.esAprobador));
    },

    /** Flujos ACTIVO. */
    listarFlujos() {
      return flows.filter((f) => f.estado === 'ACTIVO').map((f) => ({
        idFlujo: f.idFlujo,
        nombre: f.nombre,
        codigo: f.codigo,
        totalPasos: f.pasos.length,
        pasosResumen: pasosConCargo(f).map((p) => (p.alcance === 'ESCUELA_SOLICITANTE' ? `${p.nombreCargo} (del solicitante)` : p.nombreCargo)),
      }));
    },

    obtenerFlujo(idFlujo) {
      const f = flows.find((x) => x.idFlujo === idFlujo);
      if (!f) return error(404, 'NO_ENCONTRADO', 'El flujo no existe.');
      return {
        status: 200,
        body: { idFlujo: f.idFlujo, nombre: f.nombre, codigo: f.codigo, estado: f.estado, descripcion: f.descripcion ?? null, codUnidad: f.codUnidad, pasos: pasosConCargo(f) },
      };
    },

    crearFlujo(body) {
      const detalles = [];
      if (!body?.nombre?.trim()) detalles.push({ campo: 'nombre', mensaje: 'El nombre es obligatorio.' });
      if (!body?.codigo?.trim()) detalles.push({ campo: 'codigo', mensaje: 'El código es obligatorio.' });
      if (!Number.isInteger(body?.codUnidad)) detalles.push({ campo: 'codUnidad', mensaje: 'La unidad es obligatoria.' });
      if (detalles.length) return invalido(detalles);
      const errPasos = validarPasos(body.pasos);
      if (errPasos) return errPasos;
      if (flows.some((f) => f.codigo.toLowerCase() === body.codigo.trim().toLowerCase())) {
        return error(409, 'CONFLICTO_ESTADO', 'Ya existe un flujo con ese código.');
      }

      const flujo = {
        idFlujo: siguienteFlujo++,
        nombre: body.nombre.trim(),
        codigo: body.codigo.trim(),
        descripcion: body.descripcion || null,
        codUnidad: body.codUnidad,
        estado: 'BORRADOR',
        idVersionBorrador: null,
        pasos: body.pasos.map(pasoGuardado),
      };
      flows.push(flujo);
      return {
        status: 201,
        body: { idFlujo: flujo.idFlujo, codigo: flujo.codigo, estado: flujo.estado, totalPasos: flujo.pasos.length, mensaje: 'Flujo creado exitosamente.' },
      };
    },

    /** Reemplaza nombre, descripción y pasos de un flujo en BORRADOR. */
    actualizarFlujo(idFlujo, body) {
      const f = flows.find((x) => x.idFlujo === idFlujo);
      if (!f) return error(404, 'NO_ENCONTRADO', 'El flujo no existe.');
      if (f.estado !== 'BORRADOR') {
        return error(409, 'CONFLICTO_ESTADO', 'Un flujo activo no se edita: cree otro flujo con los pasos que necesita.');
      }
      if (!body?.nombre?.trim()) return invalido([{ campo: 'nombre', mensaje: 'El nombre es obligatorio.' }]);
      const errPasos = validarPasos(body.pasos);
      if (errPasos) return errPasos;

      f.nombre = body.nombre.trim();
      if (body.descripcion !== undefined) f.descripcion = body.descripcion || null;
      f.pasos = body.pasos.map(pasoGuardado);
      return {
        status: 200,
        body: { idFlujo: f.idFlujo, codigo: f.codigo, estado: f.estado, totalPasos: f.pasos.length, mensaje: 'Flujo actualizado exitosamente.' },
      };
    },
  };
}
