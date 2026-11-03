import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FilePlus2,
  FileText,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import templatesApi from '../../api/templates.api';
import requestsApi from '../../api/requests.api';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import CodeChip from '../../components/ui/CodeChip';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import FormularioDinamico from './FormularioDinamico';
import DatosAutomaticos from './DatosAutomaticos';
import { automaticosDelDocumento } from '../../utils/datosSolicitante';
import { nombreCompletoUnidad } from '../../utils/formatters';
import {
  construirDatosJson,
  formatearRespuesta,
  validarCampo,
  validarFormulario,
} from '../../utils/formularios';

/** Nueva solicitud: elegir el trámite, llenar el formulario de la versión activa y enviarlo. */
/** Indica si hay algo escrito en el formulario. */
const hayAlgoEscrito = (valores) =>
  Object.values(valores).some((v) => v !== undefined && v !== null && v !== false && String(v).trim() !== '');

export default function NuevaSolicitudPage({ usuario, onNavigate }) {
  const unidad = nombreCompletoUnidad(usuario?.unidad);
  const { notify } = useToast();

  // Paso 1: catálogo
  const [catalogo, setCatalogo] = useState([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Paso 2: formulario
  const [seleccion, setSeleccion] = useState(null);
  const [plantilla, setPlantilla] = useState(null);
  const [cargandoPlantilla, setCargandoPlantilla] = useState(false);
  const [errorPlantilla, setErrorPlantilla] = useState(false);
  const [valores, setValores] = useState({});
  const [errores, setErrores] = useState({});
  const [tocados, setTocados] = useState({});
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [descartando, setDescartando] = useState(false);

  // Paso 3: resultado
  const [resultado, setResultado] = useState(null);

  const cargarCatalogo = async () => {
    setCargandoCatalogo(true);
    setErrorCatalogo(false);
    try {
      const res = await templatesApi.getCatalog();
      setCatalogo(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error al cargar el catálogo de trámites:', err);
      setErrorCatalogo(true);
      setCatalogo([]);
    } finally {
      setCargandoCatalogo(false);
    }
  };

  useEffect(() => {
    cargarCatalogo();
  }, []);

  const cargarPlantilla = async (item) => {
    setCargandoPlantilla(true);
    setErrorPlantilla(false);
    try {
      const res = await templatesApi.getTemplateById(item.idPlantilla, { idVersion: item.idVersion });
      setPlantilla(res);
    } catch (err) {
      console.error('Error al cargar el formulario de la plantilla:', err);
      setErrorPlantilla(true);
      setPlantilla(null);
    } finally {
      setCargandoPlantilla(false);
    }
  };

  const elegirTramite = (item) => {
    setSeleccion(item);
    setValores({});
    setErrores({});
    setTocados({});
    cargarPlantilla(item);
  };

  const volverAlCatalogo = () => {
    setSeleccion(null);
    setPlantilla(null);
    setValores({});
    setErrores({});
    setTocados({});
  };

  /** Cancela; si hay algo escrito, pide confirmar. */
  const cancelar = () => {
    if (hayAlgoEscrito(valores)) setDescartando(true);
    else volverAlCatalogo();
  };

  const descartar = () => {
    setDescartando(false);
    volverAlCatalogo();
  };

  const variables = useMemo(() => plantilla?.variableFormJson?.variables ?? [], [plantilla]);
  // Datos automáticos que entrega el servidor
  const automaticos = useMemo(
    () => automaticosDelDocumento(plantilla?.disenoFormJson?.cuerpoDocumento),
    [plantilla]
  );

  const handleChange = (id, valor) => {
    setValores((prev) => ({ ...prev, [id]: valor }));
    const variable = variables.find((v) => v.id === id);
    if (!variable) {
      // Texto de «Otro»: solo se limpia su error
      setErrores((prev) => ({ ...prev, [id]: undefined }));
      return;
    }
    // Revalida solo los campos ya tocados
    if (tocados[id]) {
      setErrores((prev) => ({ ...prev, [id]: validarCampo(variable, valor) || undefined }));
    }
  };

  const handleBlur = (id) => {
    setTocados((prev) => ({ ...prev, [id]: true }));
    const variable = variables.find((v) => v.id === id);
    setErrores((prev) => ({ ...prev, [id]: validarCampo(variable, valores[id]) || undefined }));
  };

  const enfocarPrimerError = (erroresActuales) => {
    const primero = variables.find((v) => erroresActuales[v.id]);
    const campo = primero && document.getElementById(`campo-${primero.id}`);
    if (!campo) return;
    // Centrado para no quedar bajo la barra fija del móvil
    campo.focus({ preventScroll: true });
    campo.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const revisar = (e) => {
    e.preventDefault();
    const erroresActuales = validarFormulario(variables, valores);
    setErrores(erroresActuales);
    setTocados(Object.fromEntries(variables.map((v) => [v.id, true])));

    if (Object.keys(erroresActuales).length > 0) {
      enfocarPrimerError(erroresActuales);
      return;
    }
    setConfirmando(true);
  };

  const enviar = async () => {
    setEnviando(true);
    try {
      const res = await requestsApi.createRequest({
        idVersion: seleccion.idVersion,
        datosJson: construirDatosJson(variables, valores),
      });
      setConfirmando(false);
      setResultado(res);
    } catch (err) {
      setConfirmando(false);

      if (err.status === 400 && Array.isArray(err.detalles) && err.detalles.length > 0) {
        // Errores por campo del servidor
        const erroresApi = Object.fromEntries(err.detalles.map((d) => [d.campo, d.mensaje]));
        setErrores(erroresApi);
        enfocarPrimerError(erroresApi);
        notify('Revisa los campos marcados en el formulario.');
      } else if (err.status === 409) {
        notify(err.message || 'La plantilla cambió. Vuelve a elegir el trámite.');
        volverAlCatalogo();
        cargarCatalogo();
      } else {
        notify(err.message || 'No se pudo enviar la solicitud. Inténtalo de nuevo.');
      }
    } finally {
      setEnviando(false);
    }
  };

  const catalogoFiltrado = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return catalogo;
    return catalogo.filter(
      (t) =>
        t.nombre.toLowerCase().includes(termino) ||
        (t.descripcion || '').toLowerCase().includes(termino)
    );
  }, [catalogo, busqueda]);

  // ---------------------------------------------------------------- Paso 3
  if (resultado) {
    return (
      <div className="space-y-6">
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Solicitud enviada</h1>
          <p className="text-sm text-slate-600 mt-1">Tu trámite quedó registrado con éxito.</p>

          <div className="mt-5 inline-flex flex-col items-center gap-1">
            <span className="text-xs text-slate-500">Código de seguimiento</span>
            <CodeChip className="text-sm">{resultado.codigoDocumento}</CodeChip>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
            <Button
              iconRight={ArrowRight}
              onClick={() => onNavigate(`/solicitante/mis-solicitudes/${resultado.idSolicitud}`)}
            >
              Ver seguimiento
            </Button>
            <Button variant="outline" onClick={() => onNavigate('/inicio')}>
              Volver al inicio
            </Button>
            <Button
              variant="outline"
              icon={FilePlus2}
              onClick={() => {
                setResultado(null);
                volverAlCatalogo();
              }}
            >
              Hacer otra solicitud
            </Button>
          </div>
        </section>
      </div>
    );
  }

  // ---------------------------------------------------------------- Paso 2
  if (seleccion) {
    const volver = (
      <div>
        <Button variant="link" size="sm" icon={ArrowLeft} onClick={volverAlCatalogo}>
          Volver al catálogo
        </Button>
      </div>
    );
    const cabecera = (
      <PageHeader
        badge="Nueva solicitud"
        title={seleccion.nombre}
        description={seleccion.descripcion || 'El oficio se genera automáticamente; tú solo completas este formulario.'}
      />
    );

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {volver}
        {cabecera}

        {cargandoPlantilla || errorPlantilla || !plantilla ? (
          <section className="bg-white rounded-xl border border-slate-200 shadow-xs">
            {cargandoPlantilla ? (
              <LoadingState label="Cargando formulario..." rows={4} />
            ) : (
              <ErrorState title="No pudimos cargar el formulario" onRetry={() => cargarPlantilla(seleccion)} />
            )}
          </section>
        ) : (
          <form noValidate onSubmit={revisar} className="space-y-6">
            <SectionCard title="Datos de la solicitud">
              <div className="p-4 sm:p-6 space-y-5">
                <DatosAutomaticos automaticos={automaticos} datos={plantilla?.variablesSistema ?? null} perfil={usuario} />

                {variables.length === 0 ? (
                  <p className="text-sm text-slate-600">Este trámite no requiere datos adicionales.</p>
                ) : (
                  <FormularioDinamico
                    variables={variables}
                    valores={valores}
                    errores={errores}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={enviando}
                  />
                )}

                <p className="text-xs text-slate-500">
                  Los campos marcados con <span className="text-rose-600">*</span> son obligatorios.
                </p>
              </div>
            </SectionCard>

            {/* Barra fija al pie en móvil */}
            <div className="sticky -bottom-4 z-10 -mx-4 -mb-4 px-4 pt-3 pb-3 bg-white/95 backdrop-blur-sm border-t border-slate-200 flex gap-2 sm:static sm:z-auto sm:m-0 sm:p-0 sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:justify-end">
              <Button variant="outline" icon={X} onClick={cancelar}>
                Cancelar
              </Button>
              <Button type="submit" iconRight={ArrowRight} className="flex-1 sm:flex-none">
                Revisar y enviar
              </Button>
            </div>
          </form>
        )}

        {descartando && (
          <Modal
            onClose={() => setDescartando(false)}
            title="¿Salir sin enviar?"
            subtitle={seleccion.nombre}
            icon={Trash2}
            tone="danger"
            footer={
              <>
                <Button variant="outline" size="sm" onClick={() => setDescartando(false)}>
                  Seguir llenando
                </Button>
                <Button variant="danger" size="sm" icon={Trash2} onClick={descartar}>
                  Salir y descartar
                </Button>
              </>
            }
          >
            <p className="p-5 text-sm text-slate-600">
              Lo que escribiste en este formulario se perderá: no se guarda hasta que envías la solicitud.
            </p>
          </Modal>
        )}

        {confirmando && (
          <Modal
            size="lg"
            onClose={() => !enviando && setConfirmando(false)}
            title="Confirmar envío"
            subtitle={seleccion.nombre}
            icon={Send}
            tone="brand"
            footer={
              <>
                <Button variant="outline" size="sm" disabled={enviando} onClick={() => setConfirmando(false)}>
                  Corregir
                </Button>
                <Button size="sm" icon={Send} loading={enviando} onClick={enviar}>
                  Enviar solicitud
                </Button>
              </>
            }
          >
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                Revisa tus respuestas. Una vez enviada, la solicitud pasa a revisión y no se puede editar.
              </p>
              <dl className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {variables.map((v) => (
                  <div key={v.id} className="px-3 py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1">
                    <dt className="text-xs font-medium text-slate-500">{v.etiqueta}</dt>
                    <dd className="sm:col-span-2 text-sm text-slate-900 break-words whitespace-pre-line">
                      {formatearRespuesta(v, valores[v.id], valores)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------- Paso 1
  return (
    <div className="space-y-6">

      <PageHeader
        badge="Nueva solicitud"
        title="Nueva solicitud"
        description="Selecciona una plantilla publicada disponible para tu perfil y unidad."
        unidad={unidad}
      />

      <SectionCard
        title="Trámites disponibles"
        action={
          !cargandoCatalogo &&
          !errorCatalogo && (
            <span className="text-xs text-slate-500" aria-live="polite">
              {catalogoFiltrado.length} de {catalogo.length}
            </span>
          )
        }
      >
        {cargandoCatalogo ? (
          <LoadingState label="Cargando trámites disponibles..." />
        ) : errorCatalogo ? (
          <ErrorState onRetry={cargarCatalogo} />
        ) : catalogo.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={FileText}
              title="No hay trámites disponibles"
              description="Por ahora no hay plantillas publicadas para tu estamento. Vuelve a consultar más adelante."
            />
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="max-w-md">
              <Field
                id="buscar-tramite"
                type="search"
                size="sm"
                label="Buscar trámite"
                hideLabel
                icon={<Search className="w-4 h-4" aria-hidden="true" />}
                placeholder="Buscar por nombre o descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                autoComplete="off"
              />
            </div>

            {catalogoFiltrado.length === 0 ? (
              <p className="text-sm text-slate-600 py-6 text-center">
                No hay trámites que coincidan con "{busqueda}".
              </p>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {catalogoFiltrado.map((item) => (
                  <li key={`${item.idPlantilla}-${item.idVersion}`}>
                    <button
                      type="button"
                      onClick={() => elegirTramite(item)}
                      className="group w-full h-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-200 hover:shadow-xs transition-all flex gap-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                    >
                      <span className="w-10 h-10 rounded-lg bg-blue-50 text-brand border border-blue-100 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900">{item.nombre}</span>
                        <span className="block text-xs text-slate-500 mt-1 leading-relaxed">
                          {item.descripcion}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand group-hover:underline">
                            Completar formulario
                            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
