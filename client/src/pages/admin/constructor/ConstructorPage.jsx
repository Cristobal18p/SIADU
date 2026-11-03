import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Info, Save, Upload } from 'lucide-react';
import templatesApi from '../../../api/templates.api';
import catalogsApi from '../../../api/catalogs.api';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/Skeleton';
import { useToast } from '../../../components/ui/Toast';
import useCargos from '../../../hooks/useCargos';
import { nombreCompletoUnidad } from '../../../utils/formatters';
import {
  borradorDesdeDetalle,
  borradorVacio,
  codigoFlujo,
  firmaPasos,
  payloadActualizar,
  payloadCrear,
  pendientesParaPublicar,
  requiereFlujoNuevo,
  validarDatosBasicos,
  validarDocumento,
  validarFlujo,
  pasoParaApi,
} from '../../../utils/plantillas';
import PasoDatosBasicos from './PasoDatosBasicos';
import ModalNuevoFlujo from './ModalNuevoFlujo';
import PasoResumen from './PasoResumen';
import BarraConstructor from './BarraConstructor';
import VistaPreviaPlantilla from '../../../components/documento/VistaPreviaPlantilla';

// El editor se carga al entrar al paso del documento
const EditorDocumento = lazy(() => import('../../../components/editor/EditorDocumento'));

const PASOS = [
  { id: 'datos', titulo: 'Datos básicos' },
  { id: 'documento', titulo: 'Documento y aprobación' },
  { id: 'resumen', titulo: 'Resumen y publicación' },
];

const SUBTITULOS = [
  'Configura el nombre, la descripción y a quién va dirigido el documento.',
  'Redacta el documento oficial, inserta las variables y define quiénes lo aprueban y firman.',
  'Revisa la configuración antes de publicar la plantilla en el catálogo.',
];

/**
 * Asistente de 3 pasos para crear o editar una plantilla: datos básicos, documento con su flujo y resumen.
 * Guarda al avanzar; solo una versión en BORRADOR es editable.
 *
 * @param {Object} props
 * @param {Object} props.usuario
 * @param {number} [props.idPlantilla] - Sin ella, crea una plantilla nueva
 * @param {(path: string) => void} props.onNavigate
 * @param {(activo: boolean) => void} [props.onEditorActivo] - Avisa cuando está en el editor
 */
export default function ConstructorPage({ usuario, idPlantilla, onNavigate, onEditorActivo }) {
  const { notify } = useToast();

  const [borrador, setBorrador] = useState(() =>
    borradorVacio(usuario?.unidad?.codUnidad ?? usuario?.codUnidad, usuario?.unidad)
  );
  const [cargando, setCargando] = useState(Boolean(idPlantilla));
  const [error, setError] = useState(null);
  const [paso, setPaso] = useState(0);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [sucio, setSucio] = useState(false); // hay cambios sin guardar
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);
  // Acción pendiente de los datos de un flujo nuevo
  const [pidiendoFlujo, setPidiendoFlujo] = useState(null);
  const [publicada, setPublicada] = useState(null); // resultado de publicar
  // Cargos de la unidad
  const catalogoCargos = useCargos(borrador.codUnidad);
  const [viendoDocumento, setViendoDocumento] = useState(false); // vista previa ampliada

  // La cabecera global se oculta en el editor y se restablece al salir
  const editorVisible = paso === 1 && !cargando && !error;
  useEffect(() => {
    onEditorActivo?.(editorVisible);
  }, [editorVisible, onEditorActivo]);
  useEffect(() => () => onEditorActivo?.(false), [onEditorActivo]);

  // Avisa al cerrar o recargar la pestaña con cambios sin guardar
  useEffect(() => {
    if (!sucio) return undefined;
    const avisar = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [sucio]);

  const cargar = useCallback(async (idVersion) => {
    setCargando(true);
    setError(null);
    try {
      const detalle = await templatesApi.getTemplateById(idPlantilla, idVersion ? { idVersion } : {});
      setBorrador(borradorDesdeDetalle(detalle));
      setSucio(false);
    } catch (err) {
      console.error('Error al cargar la plantilla:', err);
      setError(err);
    } finally {
      setCargando(false);
    }
  }, [idPlantilla]);

  useEffect(() => {
    if (idPlantilla) cargar();
  }, [idPlantilla, cargar]);

  const cambiar = (cambios) => {
    setBorrador((b) => ({ ...b, ...cambios }));
    setSucio(true);
    setErrores((e) => {
      // Los errores del flujo se limpian al cambiar los pasos
      if ('pasosFlujo' in cambios) return {};
      const limpio = { ...e };
      Object.keys(cambios).forEach((campo) => delete limpio[campo]);
      return limpio;
    });
  };

  const editable = borrador.estado === 'BORRADOR';

  const salir = () => {
    if (editable && sucio) setConfirmandoSalida(true);
    else onNavigate('/admin/plantillas');
  };

  /** Indica si el flujo guardado es un borrador de esta plantilla. */
  const flujoEditable = borrador.idFlujo !== null && borrador.estadoFlujo === 'BORRADOR';

  /** Indica si hay que pedir antes el nombre de un flujo nuevo. */
  const faltanDatosFlujo = (datosFlujo) => editable && !datosFlujo && requiereFlujoNuevo(borrador) && !flujoEditable;

  const guardarYSalir = async (datosFlujo) => {
    if (!validarPaso()) {
      setConfirmandoSalida(false);
      return;
    }
    if (faltanDatosFlujo(datosFlujo)) {
      setConfirmandoSalida(false);
      setPidiendoFlujo('salir');
      return;
    }
    if (await guardar(datosFlujo)) onNavigate('/admin/plantillas');
  };


  /** `idFlujo` para los pasos actuales: el mismo flujo, el borrador editado o uno nuevo. */
  const resolverFlujo = async (datosFlujo) => {
    const pasos = borrador.pasosFlujo;
    if (pasos.length === 0) return null;
    if (!requiereFlujoNuevo(borrador)) return borrador.idFlujo;

    const pasosPayload = pasos.map(pasoParaApi);

    if (flujoEditable) {
      await catalogsApi.updateFlow(borrador.idFlujo, {
        nombre: datosFlujo?.nombre || borrador.nombreFlujo || borrador.nombreFlujoOrigen,
        ...(borrador.descripcionFlujo ? { descripcion: borrador.descripcionFlujo } : {}),
        pasos: pasosPayload,
      });
      setBorrador((b) => ({ ...b, flujoBase: firmaPasos(pasos) }));
      return borrador.idFlujo;
    }

    const crear = () =>
      catalogsApi.createFlow({
        nombre: datosFlujo.nombre,
        codigo: codigoFlujo(datosFlujo.nombre),
        ...(datosFlujo.descripcion ? { descripcion: datosFlujo.descripcion } : {}),
        codUnidad: borrador.codUnidad,
        pasos: pasosPayload,
      });

    let creado;
    try {
      creado = await crear();
    } catch (err) {
      // Si el código ya existe, se reintenta una vez
      if (err.codigo !== 'CONFLICTO_ESTADO') throw err;
      creado = await crear();
    }
    const idNuevo = creado.idFlujo;
    // Se guarda de inmediato para que un reintento edite este flujo
    setBorrador((b) => ({
      ...b,
      idFlujo: idNuevo,
      estadoFlujo: creado.estado ?? 'BORRADOR',
      nombreFlujoOrigen: datosFlujo.nombre,
      flujoBase: firmaPasos(pasos),
    }));
    return idNuevo;
  };

  /** Guarda el borrador. Devuelve true si se guardó. */
  const guardar = async (datosFlujo) => {
    setGuardando(true);
    try {
      const idFlujo = await resolverFlujo(datosFlujo);
      const aGuardar = { ...borrador, idFlujo };
      let ids = {};

      if (borrador.idPlantilla === null) {
        const res = await templatesApi.createTemplate(payloadCrear(aGuardar));
        ids = { idPlantilla: res.idPlantilla, idVersion: res.idVersion, numeroVersion: res.numeroVersion, estado: res.estado };
      } else {
        await templatesApi.updateTemplate(borrador.idPlantilla, payloadActualizar(aGuardar));
      }
      setBorrador((b) => ({
        ...b,
        ...ids,
        idFlujo,
        flujoBase: idFlujo === null ? null : firmaPasos(b.pasosFlujo),
      }));
      setSucio(false);
      notify('Borrador guardado.', 'success');
      return {
        idPlantilla: ids.idPlantilla ?? borrador.idPlantilla,
        idVersion: ids.idVersion ?? borrador.idVersion,
        numeroVersion: ids.numeroVersion ?? borrador.numeroVersion,
      };
    } catch (err) {
      const detalle = Array.isArray(err.detalles) && err.detalles.length > 0 ? ` ${err.detalles[0].mensaje}` : '';
      notify(`${err.message || 'No se pudo guardar el borrador.'}${detalle}`);
      return null;
    } finally {
      setGuardando(false);
    }
  };

  /** Valida el paso actual; devuelve true si se puede avanzar o guardar. */
  const validarPaso = () => {
    if (paso === 1) {
      if (!editable) return true;
      // Variables mal definidas se avisan antes de enviar
      const problemas = validarDocumento(borrador);
      if (problemas.length > 0) {
        const mas = problemas.length > 1 ? ` (y ${problemas.length - 1} más)` : '';
        notify(`Revisa las variables antes de guardar. ${problemas[0].mensaje}${mas}`);
        return false;
      }
      // Los errores del flujo abren la pestaña «Aprobación»
      const e = validarFlujo(borrador.pasosFlujo, catalogoCargos.cargos);
      setErrores(e);
      if (Object.keys(e).length > 0) {
        notify('Revisa el flujo de aprobación antes de guardar.');
        return false;
      }
      return true;
    }
    if (paso !== 0) return true;
    const e = validarDatosBasicos(borrador);
    setErrores(e);
    if (Object.keys(e).length > 0) {
      document.getElementById(e.nombre ? 'plantilla-nombre' : 'audiencia-ESTUDIANTE')?.focus();
      return false;
    }
    return true;
  };

  const guardarBorrador = async (datosFlujo) => {
    if (!validarPaso()) return;
    if (faltanDatosFlujo(datosFlujo)) {
      setPidiendoFlujo('guardar');
      return;
    }
    await guardar(datosFlujo);
  };

  const siguiente = async (datosFlujo) => {
    if (!validarPaso()) return;
    if (faltanDatosFlujo(datosFlujo)) {
      setPidiendoFlujo('siguiente');
      return;
    }
    if (editable && !(await guardar(datosFlujo))) return;
    setPaso((p) => p + 1);
  };

  const pendientes = pendientesParaPublicar(borrador, catalogoCargos.cargos);

  /** Guarda el borrador y publica la versión. */
  const publicar = async (datosFlujo) => {
    if (pendientes.length > 0) {
      setPaso(pendientes[0].paso);
      return;
    }
    if (faltanDatosFlujo(datosFlujo)) {
      setPidiendoFlujo('publicar');
      return;
    }
    const ids = await guardar(datosFlujo);
    if (!ids) return;

    setGuardando(true);
    try {
      const res = await templatesApi.publishTemplate(ids.idPlantilla, ids.idVersion);
      // El flujo en borrador pasa a ACTIVO
      setBorrador((b) => ({
        ...b,
        estado: res.estado ?? 'ACTIVO',
        estadoFlujo: b.idFlujo !== null ? 'ACTIVO' : b.estadoFlujo,
        numeroVersion: res.numeroVersion ?? b.numeroVersion,
      }));
      setPublicada({ mensaje: res.mensaje, numeroVersion: res.numeroVersion ?? ids.numeroVersion });
    } catch (err) {
      notify(err.message || 'No se pudo publicar la plantilla.');
    } finally {
      setGuardando(false);
    }
  };

  /** Guarda los datos del flujo nuevo y retoma la acción pendiente. */
  const confirmarFlujo = (datosFlujo) => {
    const accion = pidiendoFlujo;
    setPidiendoFlujo(null);
    setBorrador((b) => ({ ...b, nombreFlujo: datosFlujo.nombre, descripcionFlujo: datosFlujo.descripcion }));
    if (accion === 'siguiente') siguiente(datosFlujo);
    else if (accion === 'guardar') guardarBorrador(datosFlujo);
    else if (accion === 'salir') guardarYSalir(datosFlujo);
    else if (accion === 'publicar') publicar(datosFlujo);
  };

  // Si hay otro borrador en curso, se continúa ese
  const otroBorrador =
    borrador.versionBorrador && borrador.versionBorrador.idVersion !== borrador.idVersion ? borrador.versionBorrador : null;

  const crearVersion = async () => {
    setGuardando(true);
    try {
      const res = await templatesApi.createVersion(borrador.idPlantilla);
      notify(res.mensaje || 'Versión nueva creada.', 'success');
      await cargar(res.idVersion);
    } catch (err) {
      // 409 por borrador existente: su idVersion llega en `detalles`
      const existente = err.status === 409 && err.detalles?.find((d) => d.campo === 'idVersion');
      if (existente && Number(existente.mensaje)) {
        notify('La plantilla ya tiene un borrador en curso; se abrió ese.', 'success');
        await cargar(Number(existente.mensaje));
      } else {
        notify(err.message || 'No se pudo crear la versión nueva.');
      }
    } finally {
      setGuardando(false);
    }
  };

  // Barra arriba y contenido con desplazamiento propio
  const marco = (contenido) => <div className="h-full flex flex-col bg-slate-100">{contenido}</div>;

  if (cargando) {
    return marco(
      <div className="flex-1 flex items-center justify-center p-6">
        <section className="w-full max-w-xl bg-white rounded-xl border border-slate-200 shadow-xs">
          <LoadingState label="Cargando la plantilla..." rows={4} />
        </section>
      </div>
    );
  }

  if (error) {
    const noExiste = error.status === 404;
    return marco(
      <div className="flex-1 flex items-center justify-center p-6">
        <section className="w-full max-w-xl bg-white rounded-xl border border-slate-200 shadow-xs">
          <ErrorState
            title={noExiste ? 'La plantilla no existe' : 'No pudimos cargar la plantilla'}
            description={noExiste ? 'Puede que el enlace sea incorrecto.' : undefined}
            onRetry={noExiste ? undefined : () => cargar()}
          />
          <div className="px-6 pb-6 text-center">
            <Button variant="link" size="sm" icon={ArrowLeft} onClick={() => onNavigate('/admin/plantillas')}>
              Volver a plantillas
            </Button>
          </div>
        </section>
      </div>
    );
  }

  const esEditor = paso === 1;
  const ultimoPaso = paso === PASOS.length - 1;
  const atras = () => setPaso((p) => Math.max(p - 1, 0));

  return marco(
    <>
      {/* Barra del editor; los demás pasos llevan sus acciones al final */}
      {esEditor && (
        <BarraConstructor
          borrador={borrador}
          editable={editable}
          guardando={guardando}
          sucio={sucio}
          onNombre={(nombre) => cambiar({ nombre })}
          onAtras={atras}
          onGuardar={() => guardarBorrador()}
          onSiguiente={() => siguiente()}
          onVistaPrevia={() => setViendoDocumento(true)}
        />
      )}

      {/* En el editor solo se desplaza el lienzo */}
      <main
        id="contenido"
        tabIndex={-1}
        className={`flex-1 min-h-0 focus:outline-none ${esEditor ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}
      >
        {/* El resumen usa más ancho */}
        <div
          className={
            esEditor
              ? 'flex-1 min-h-0 flex flex-col'
              : `${ultimoPaso ? 'max-w-7xl' : 'max-w-4xl'} mx-auto w-full px-6 py-6 space-y-6`
          }
        >
          {!editable && (
            <div role="status" className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
              <Info className="w-5 h-5 text-brand shrink-0" aria-hidden="true" />
              <p className="text-sm text-slate-700 flex-1">
                {otroBorrador
                  ? `Esta versión no se puede modificar. La plantilla ya tiene un borrador en curso (versión ${otroBorrador.numeroVersion}).`
                  : borrador.estado === 'ACTIVO'
                    ? 'Esta versión está publicada y no se puede modificar. Crea una versión nueva para editarla; la actual sigue en uso hasta que publiques la nueva.'
                    : 'Esta versión está inactiva y solo se puede consultar.'}
              </p>
              {otroBorrador ? (
                <Button size="sm" loading={cargando} onClick={() => cargar(otroBorrador.idVersion)}>
                  Continuar el borrador
                </Button>
              ) : (
                borrador.estado === 'ACTIVO' && (
                  <Button size="sm" loading={guardando} onClick={crearVersion}>
                    Crear versión nueva
                  </Button>
                )
              )}
            </div>
          )}

          {!esEditor && (
            <PageHeader
              badge={idPlantilla ? 'Editar plantilla' : 'Nueva plantilla'}
              title={PASOS[paso].titulo}
              description={SUBTITULOS[paso]}
              unidad={nombreCompletoUnidad(usuario?.unidad)}
            />
          )}
          {paso === 0 && (
            <PasoDatosBasicos borrador={borrador} onCambio={cambiar} errores={errores} soloLectura={!editable} />
          )}
          {paso === 1 && (
            <div className="flex-1 min-h-0">
              <Suspense
                fallback={
                  <div className="h-full flex items-center justify-center p-6">
                    <section className="w-full max-w-xl bg-white rounded-xl border border-slate-200 shadow-xs">
                      <LoadingState label="Cargando el editor..." rows={3} />
                    </section>
                  </div>
                }
              >
                <EditorDocumento
                  key={borrador.idVersion ?? 'nueva'}
                  borrador={borrador}
                  onCambio={cambiar}
                  soloLectura={!editable}
                  erroresFlujo={errores}
                  catalogoCargos={catalogoCargos}
                />
              </Suspense>
            </div>
          )}
          {paso === 2 && (
            <PasoResumen
              borrador={borrador}
              usuario={usuario}
              pendientes={pendientes}
              onIrAPaso={setPaso}
              soloLectura={!editable}
              cargos={catalogoCargos.cargos}
              onVerDocumento={() => setViendoDocumento(true)}
            />
          )}

          {!esEditor && (
            // En el resumen, las acciones quedan fijas abajo
            <div
              className={`flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 ${
                ultimoPaso ? 'sticky bottom-0 z-10 -mx-6 px-6 py-3 bg-slate-100/95 backdrop-blur-xs' : 'pt-5'
              }`}
            >
              <Button variant="outline" icon={ArrowLeft} disabled={guardando} onClick={paso === 0 ? salir : atras}>
                {paso === 0 ? 'Volver a plantillas' : 'Atrás'}
              </Button>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {editable && ultimoPaso && pendientes.length === 0 && (
                  <span role="status" className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mr-1">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    Todo listo para publicar
                  </span>
                )}
                {editable && ultimoPaso && (
                  <Button variant="outline" icon={Save} loading={guardando} onClick={() => guardarBorrador()}>
                    Guardar borrador
                  </Button>
                )}
                {!ultimoPaso && (
                  <Button iconRight={ArrowRight} loading={guardando} onClick={() => siguiente()}>
                    Siguiente
                  </Button>
                )}
                {ultimoPaso && editable && (
                  <Button
                    icon={Upload}
                    loading={guardando}
                    disabled={pendientes.length > 0}
                    title={pendientes.length > 0 ? 'Completa lo que falta para poder publicar' : undefined}
                    onClick={() => publicar()}
                  >
                    Publicar plantilla
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {publicada && (
        <Modal
          onClose={() => setPublicada(null)}
          title="¡Plantilla publicada!"
          subtitle={borrador.nombre}
          icon={CheckCircle2}
          tone="success"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setPublicada(null)}>
                Seguir aquí
              </Button>
              <Button size="sm" onClick={() => onNavigate('/admin/plantillas')}>
                Ir a las plantillas
              </Button>
            </>
          }
        >
          <div className="p-5 space-y-2">
            <p className="text-sm text-slate-700">
              {publicada.mensaje || 'La plantilla ya está disponible en el catálogo.'}
            </p>
            <p className="text-xs text-slate-500">
              Los grupos elegidos ya pueden verla en «Nueva solicitud». Para modificarla, crea una versión nueva: la
              publicada sigue en uso hasta que publiques la siguiente.
            </p>
          </div>
        </Modal>
      )}

      {viendoDocumento && (
        <Modal
          onClose={() => setViendoDocumento(false)}
          title="Vista previa del documento final"
          subtitle="Así se imprime el oficio, con respuestas de ejemplo resaltadas y las firmas pendientes."
          icon={FileText}
          tone="brand"
          size="5xl"
        >
          <div className="p-4 sm:p-5">
            <VistaPreviaPlantilla borrador={borrador} cargos={catalogoCargos.cargos} />
          </div>
        </Modal>
      )}

      {pidiendoFlujo && (
        <ModalNuevoFlujo
          inicial={{
            nombre: borrador.nombreFlujo || (borrador.nombreFlujoOrigen ? `${borrador.nombreFlujoOrigen} (copia)` : ''),
            descripcion: borrador.descripcionFlujo,
          }}
          totalPasos={borrador.pasosFlujo.length}
          etiquetaConfirmar={
            pidiendoFlujo === 'siguiente'
              ? 'Crear flujo y continuar'
              : pidiendoFlujo === 'salir'
                ? 'Crear flujo y salir'
                : pidiendoFlujo === 'publicar'
                  ? 'Crear flujo y publicar'
                  : 'Crear flujo y guardar'
          }
          enviando={guardando}
          onConfirmar={confirmarFlujo}
          onCancelar={() => setPidiendoFlujo(null)}
        />
      )}

      {confirmandoSalida && (
        <Modal
          onClose={() => setConfirmandoSalida(false)}
          title="Hay cambios sin guardar"
          subtitle="Si sales ahora, se perderán."
          icon={Info}
          tone="brand"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setConfirmandoSalida(false)}>
                Seguir editando
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="danger" size="sm" onClick={() => onNavigate('/admin/plantillas')}>
                  Salir sin guardar
                </Button>
                <Button size="sm" loading={guardando} onClick={() => guardarYSalir()}>
                  Guardar y salir
                </Button>
              </div>
            </>
          }
        >
          <p className="p-5 text-sm text-slate-600">¿Quieres guardar el borrador antes de volver a las plantillas?</p>
        </Modal>
      )}
    </>
  );
}
