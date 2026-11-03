import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Eraser, GitBranch, LocateFixed, Plus, Signature, X } from 'lucide-react';
import catalogsApi from '../../../api/catalogs.api';
import Button from '../../ui/Button';
import Checkbox from '../../ui/Checkbox';
import Field from '../../ui/Field';
import ErrorState from '../../ui/ErrorState';
import LoadingState from '../../ui/Skeleton';
import { useToast } from '../../ui/Toast';
import {
  ALCANCE_ESCUELA,
  esPasoEscuela,
  pasoQueLaTiene,
  pasoVacio,
  pasosDesdeFlujo,
  requiereFlujoNuevo,
  validarFlujo,
} from '../../../utils/plantillas';

/** Botón de icono de la tarjeta de un paso. */
function BotonIcono({ icon: Icon, etiqueta, disabled, onClick, peligro = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      title={etiqueta}
      className={`p-1.5 rounded-md cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        peligro ? 'text-slate-500 hover:bg-rose-50 hover:text-rose-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
    </button>
  );
}

/**
 * Pestaña «Aprobación»: pasos del flujo, su orden y quién firma. Una persona aparece una sola vez.
 * Si se cambian los pasos de un flujo existente, al guardar se crea uno nuevo.
 *
 * @param {Object} props
 * @param {Object} props.borrador
 * @param {(cambios: Object) => void} props.onCambio
 * @param {{ cargos: Array, cargando: boolean, error: boolean, recargar: () => void }} props.catalogo
 * @param {Object<number, string>} props.errores - Mensaje por índice de paso
 * @param {boolean} props.soloLectura
 * @param {boolean} props.hayBloqueFirmas
 * @param {() => void} props.onInsertarFirmas
 * @param {() => void} props.onUbicarFirmas
 */
export default function PanelAprobacion({
  borrador,
  onCambio,
  catalogo,
  errores = {},
  soloLectura,
  hayBloqueFirmas,
  onInsertarFirmas,
  onUbicarFirmas,
}) {
  const { notify } = useToast();
  const [flujos, setFlujos] = useState([]);
  const [flujoElegido, setFlujoElegido] = useState('');
  const [cargandoFlujo, setCargandoFlujo] = useState(false);
  const { cargos, cargando, error, recargar } = catalogo;

  useEffect(() => {
    if (soloLectura) return;
    catalogsApi
      .getFlows(borrador.codUnidad ? { codUnidad: borrador.codUnidad } : {})
      .then((lista) => setFlujos(Array.isArray(lista) ? lista : []))
      .catch(() => setFlujos([]));
  }, [borrador.codUnidad, soloLectura]);

  const pasos = borrador.pasosFlujo;
  const cargoDe = (idAsignacion) => cargos.find((c) => c.idAsignacion === idAsignacion);
  /** Valor de la opción del paso: `e{idCargo}` para un cargo por escuela; si no, el `idAsignacion`. */
  const valorDelPaso = (p) => (esPasoEscuela(p) ? (p.idCargo ? `e${p.idCargo}` : '') : p.idAsignacion ? String(p.idAsignacion) : '');
  const elegirAutoridad = (i, valor) =>
    actualizarPaso(
      i,
      valor.startsWith('e')
        ? { alcance: ALCANCE_ESCUELA, idCargo: Number(valor.slice(1)), idAsignacion: null }
        : { alcance: 'FIJO', idCargo: null, idAsignacion: valor ? Number(valor) : null }
    );
  /** Cargos por escuela, uno por cargo. */
  const cargosPorEscuela = [...new Map(cargos.filter((c) => c.escuela && c.esAprobador !== false).map((c) => [c.idCargo, c])).values()];
  /** Opciones del paso `i`; las usadas en otro paso quedan desactivadas. */
  const opcionesCargo = (i) => [
    ...cargosPorEscuela.map((c) => ({ valor: `e${c.idCargo}`, etiqueta: `${c.nombreCargo} — de la escuela del solicitante` })),
    ...opcionesFijas(i),
  ];
  const opcionesFijas = (i) =>
    cargos.map((c) => {
      const otro = pasoQueLaTiene(pasos, cargos, c.idAsignacion, i);
      const etiqueta = c.titularActual ? `${c.nombreCargo} — ${c.titularActual}` : c.nombreCargo;
      // Solo se eligen cargos cuyo titular puede aprobar
      if (c.esAprobador === false) return { valor: String(c.idAsignacion), etiqueta: `${etiqueta} (no puede aprobar)`, disabled: true };
      return { valor: String(c.idAsignacion), etiqueta: otro === -1 ? etiqueta : `${etiqueta} (ya en el paso ${otro + 1})`, disabled: otro !== -1 };
    });
  // Personas repetidas en los pasos; se avisan al momento
  const repetidos = validarFlujo(pasos, cargos);

  const cambiarPasos = (lista) => onCambio({ pasosFlujo: lista });
  const actualizarPaso = (i, cambios) => cambiarPasos(pasos.map((p, k) => (k === i ? { ...p, ...cambios } : p)));
  const mover = (i, delta) => {
    const lista = [...pasos];
    [lista[i], lista[i + delta]] = [lista[i + delta], lista[i]];
    cambiarPasos(lista);
  };
  const agregar = () => {
    cambiarPasos([...pasos, pasoVacio()]);
    // El foco pasa al selector del paso nuevo
    requestAnimationFrame(() => document.getElementById(`flujo-paso-${pasos.length}`)?.focus());
  };

  const cargarFlujo = async () => {
    if (!flujoElegido) return;
    setCargandoFlujo(true);
    try {
      const flujo = await catalogsApi.getFlowById(Number(flujoElegido));
      // Sin cambios, la plantilla reutiliza este flujo
      onCambio({
        idFlujo: flujo.idFlujo,
        estadoFlujo: flujo.estado ?? null,
        nombreFlujo: '',
        descripcionFlujo: '',
        nombreFlujoOrigen: flujo.nombre,
        ...pasosDesdeFlujo(flujo),
      });
      setFlujoElegido('');
      notify(`Flujo «${flujo.nombre}» cargado.`, 'success');
    } catch (err) {
      notify(err.message || 'No se pudo cargar el flujo.');
    } finally {
      setCargandoFlujo(false);
    }
  };

  const limpiar = () =>
    onCambio({ idFlujo: null, estadoFlujo: null, pasosFlujo: [], flujoBase: null, nombreFlujo: '', descripcionFlujo: '', nombreFlujoOrigen: '' });

  const conFirma = pasos.filter((p) => p.reqFirma).length;
  const flujoNuevo = requiereFlujoNuevo(borrador);
  const modificado = flujoNuevo && borrador.idFlujo !== null;
  const reutiliza = pasos.length > 0 && !flujoNuevo;

  if (cargando) return <LoadingState label="Cargando autoridades..." rows={3} />;
  if (error) return <ErrorState title="No pudimos cargar las autoridades" onRetry={recargar} />;

  return (
    <div className="space-y-5">
      <p className="px-1 text-xs text-slate-500">
        Quiénes aprueban el documento y en qué orden. Las autoridades que firman aparecen en el bloque de firmas de la
        hoja.
      </p>

      {!soloLectura && flujos.length > 0 && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <Field
            id="flujo-existente"
            as="select"
            size="sm"
            label="Partir de un flujo existente"
            value={flujoElegido}
            onChange={(e) => setFlujoElegido(e.target.value)}
            options={flujos.map((f) => ({ valor: String(f.idFlujo), etiqueta: `${f.nombre} (${f.pasosResumen.join(' → ')})` }))}
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={GitBranch} className="flex-1" disabled={!flujoElegido} loading={cargandoFlujo} onClick={cargarFlujo}>
              Cargar
            </Button>
            <Button variant="ghost" size="sm" icon={Eraser} disabled={pasos.length === 0} onClick={limpiar}>
              Empezar de cero
            </Button>
          </div>
        </div>
      )}

      {pasos.length === 0 ? (
        <p className="px-1 text-xs text-slate-500">Aún no hay autoridades. Sin flujo no se puede publicar la plantilla.</p>
      ) : (
        <ol className="space-y-2">
          {pasos.map((paso, i) => {
            const porEscuela = esPasoEscuela(paso);
            const cargo = porEscuela ? undefined : cargoDe(paso.idAsignacion);
            return (
              <li key={i} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-semibold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-xs font-semibold text-slate-700">Paso {i + 1}</span>
                  {!soloLectura && (
                    <>
                      <BotonIcono icon={ArrowUp} etiqueta={`Subir el paso ${i + 1}`} disabled={i === 0} onClick={() => mover(i, -1)} />
                      <BotonIcono icon={ArrowDown} etiqueta={`Bajar el paso ${i + 1}`} disabled={i === pasos.length - 1} onClick={() => mover(i, 1)} />
                      <BotonIcono icon={X} etiqueta={`Quitar el paso ${i + 1}`} peligro onClick={() => cambiarPasos(pasos.filter((_, k) => k !== i))} />
                    </>
                  )}
                </div>
                <Field
                  id={`flujo-paso-${i}`}
                  as="select"
                  size="sm"
                  hideLabel
                  label={`Autoridad del paso ${i + 1}`}
                  value={valorDelPaso(paso)}
                  onChange={(e) => elegirAutoridad(i, e.target.value)}
                  options={opcionesCargo(i)}
                  error={errores[i] ?? (valorDelPaso(paso) ? repetidos[i] : undefined)}
                  disabled={soloLectura}
                />
                {porEscuela && (
                  <p className="text-xs text-slate-500">
                    Cada estudiante llega al director de la escuela de su carrera. Solo para plantillas dirigidas a
                    estudiantes.
                  </p>
                )}
                {cargo && (
                  <p className="text-xs text-slate-500">
                    {cargo.area ? `${cargo.area} · ` : ''}
                    {cargo.titularActual ? `Titular: ${cargo.titularActual}` : 'Sin titular asignado'}
                  </p>
                )}
                <Checkbox
                  id={`flujo-firma-${i}`}
                  label="Firma el documento"
                  description={paso.reqFirma ? undefined : 'Solo da su visto bueno, sin firma en el documento.'}
                  checked={paso.reqFirma}
                  onChange={(marcado) => actualizarPaso(i, { reqFirma: marcado })}
                  disabled={soloLectura}
                />
              </li>
            );
          })}
        </ol>
      )}

      {!soloLectura && (
        <Button variant="outline" size="sm" icon={Plus} className="w-full" onClick={agregar}>
          Agregar autoridad
        </Button>
      )}

      {/* Agregar o ubicar el bloque de firmas */}
      {conFirma > 0 && !hayBloqueFirmas && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs text-amber-900">
            {conFirma === 1 ? 'Una autoridad firma' : `${conFirma} autoridades firman`}, pero el documento aún no tiene el
            bloque de firmas.
          </p>
          {!soloLectura && (
            <Button size="sm" icon={Signature} onClick={onInsertarFirmas}>
              Agregar al final del documento
            </Button>
          )}
        </div>
      )}
      {hayBloqueFirmas && conFirma === 0 && pasos.length > 0 && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          El documento tiene bloque de firmas, pero ninguna autoridad firma. Marca «Firma el documento» en algún paso o
          quita el bloque.
        </p>
      )}
      {hayBloqueFirmas && (
        <Button variant="link" size="sm" icon={LocateFixed} onClick={onUbicarFirmas}>
          Ubicar el bloque de firmas
        </Button>
      )}

      {!soloLectura && pasos.length > 0 && (
        <p className="px-1 text-xs text-slate-500" role="status">
          {reutiliza
            ? 'Se usará el flujo existente tal como está.'
            : modificado
              ? 'Cambiaste los pasos: al guardar se te pedirá un nombre para el flujo nuevo; el original no se modifica.'
              : 'Al guardar se te pedirá un nombre para este flujo, que podrás reutilizar.'}
        </p>
      )}
    </div>
  );
}
