import { useState, useEffect, useMemo } from 'react';
import { FolderOpen, Download, ArrowRight, FilterX } from 'lucide-react';
import requestsApi from '../../api/requests.api';
import documentsApi from '../../api/documents.api';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import Field from '../../components/ui/Field';
import LoadingState from '../../components/ui/Skeleton';
import MiniaturaDocumento from '../../components/documento/MiniaturaDocumento';
import { formatDate, nombreCompletoUnidad } from '../../utils/formatters';

const DIA_MS = 24 * 60 * 60 * 1000;

const PERIODOS = [
  { valor: 'todo', etiqueta: 'Cualquier fecha' },
  { valor: '30d', etiqueta: 'Últimos 30 días' },
  { valor: '6m', etiqueta: 'Últimos 6 meses' },
  { valor: 'anio', etiqueta: 'Este año' },
];

const ORDENES = [
  { valor: 'recientes', etiqueta: 'Más recientes' },
  { valor: 'antiguos', etiqueta: 'Más antiguos' },
];

/** Fecha de aprobación o, en su defecto, de envío. */
const fechaDe = (doc) => new Date(doc.resolucion?.fecha || doc.fechaCreacion);

function dentroDelPeriodo(fecha, periodo, ahora) {
  if (periodo === '30d') return ahora - fecha <= 30 * DIA_MS;
  if (periodo === '6m') {
    const limite = new Date(ahora);
    limite.setMonth(limite.getMonth() - 6);
    return fecha >= limite;
  }
  if (periodo === 'anio') return fecha.getFullYear() === ahora.getFullYear();
  return true;
}

/** Documentos aprobados del solicitante, con miniatura y filtros por tipo y período. */
export default function DocumentosPage({ usuario, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [tipo, setTipo] = useState('');
  const [periodo, setPeriodo] = useState('todo');
  const [orden, setOrden] = useState('recientes');
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState(false);
  const { notify } = useToast();

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await requestsApi.getMyRequests();
      const all = Array.isArray(res) ? res : [];
      setDocuments(all.filter((r) => r.estado === 'APROBADO'));
    } catch (err) {
      console.error('Error al cargar documentos aprobados:', err);
      setError(true);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownload = async (item) => {
    try {
      setDownloadingId(item.idSolicitud);
      await documentsApi.downloadPdf(item.idSolicitud, item.codigoDocumento);
    } catch (err) {
      console.error('Error al descargar PDF:', err);
      notify(err?.message || 'No se pudo descargar el documento. Inténtalo de nuevo en unos momentos.');
    } finally {
      setDownloadingId(null);
    }
  };

  const verDetalle = (item) => onNavigate(`/solicitante/mis-solicitudes/${item.idSolicitud}`);

  const tipos = useMemo(
    () =>
      [...new Set(documents.map((d) => d.nombrePlantilla).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'es'))
        .map((nombre) => ({ valor: nombre, etiqueta: nombre })),
    [documents]
  );

  const visibles = useMemo(() => {
    const ahora = new Date();
    return documents
      .filter((d) => !tipo || d.nombrePlantilla === tipo)
      .filter((d) => dentroDelPeriodo(fechaDe(d), periodo, ahora))
      .sort((a, b) => (orden === 'recientes' ? fechaDe(b) - fechaDe(a) : fechaDe(a) - fechaDe(b)));
  }, [documents, tipo, periodo, orden]);

  const hayFiltros = tipo !== '' || periodo !== 'todo';
  const limpiarFiltros = () => {
    setTipo('');
    setPeriodo('todo');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Documentos"
        title="Documentos"
        description="Oficios aprobados listos para consultar y descargar."
        unidad={nombreCompletoUnidad(usuario?.unidad)}
      />

      <div className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="w-full sm:w-64">
            <Field
              id="filtro-tipo"
              as="select"
              size="sm"
              label="Tipo de documento"
              hideLabel
              emptyOption="Todos los tipos"
              options={tipos}
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              disabled={loading || tipos.length === 0}
            />
          </div>
          <div className="flex-1 sm:flex-none sm:w-44">
            <Field
              id="filtro-periodo"
              as="select"
              size="sm"
              label="Período de aprobación"
              hideLabel
              emptyOption={null}
              options={PERIODOS}
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex-1 sm:flex-none sm:w-44">
            <Field
              id="filtro-orden"
              as="select"
              size="sm"
              label="Orden"
              hideLabel
              emptyOption={null}
              options={ORDENES}
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="w-full sm:w-auto sm:ml-auto flex items-center justify-between sm:justify-end gap-3">
            <p aria-live="polite" className="text-xs text-slate-500 font-medium">
              {loading
                ? 'Cargando documentos…'
                : `${visibles.length} documento${visibles.length === 1 ? '' : 's'}`}
            </p>
            {hayFiltros && (
              <Button variant="ghost" size="sm" icon={FilterX} onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <LoadingState label="Cargando documentos…" />
          </section>
        ) : error ? (
          <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <ErrorState onRetry={fetchData} />
          </section>
        ) : visibles.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={hayFiltros ? 'Ningún documento coincide con los filtros' : 'Aún no tienes documentos aprobados'}
            description={
              hayFiltros
                ? 'Prueba con otro tipo de documento o amplía el período.'
                : 'Cuando una de tus solicitudes sea aprobada, su oficio aparecerá aquí para descargarlo.'
            }
            actionLabel={hayFiltros ? 'Limpiar filtros' : 'Iniciar una solicitud'}
            actionIcon={hayFiltros ? FilterX : ArrowRight}
            onAction={hayFiltros ? limpiarFiltros : () => onNavigate('/solicitante/nueva-solicitud')}
          />
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {visibles.map((item) => (
              <li
                key={item.idSolicitud}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col transition-all hover:border-slate-300 hover:shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => verDetalle(item)}
                  aria-label={`Ver ${item.nombrePlantilla}, ${item.codigoDocumento}`}
                  className="group flex-1 flex flex-col text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                >
                  <div className="border-b border-slate-200">
                    <MiniaturaDocumento idSolicitud={item.idSolicitud} />
                  </div>
                  <div className="px-2.5 pt-2">
                    <h2 className="text-ui font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:underline">
                      {item.nombrePlantilla}
                    </h2>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">{item.codigoDocumento}</p>
                  </div>
                </button>

                <div className="px-2.5 pb-2 pt-1 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">{formatDate(item.resolucion?.fecha)}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Download}
                    loading={downloadingId === item.idSolicitud}
                    aria-label={`Descargar PDF de ${item.codigoDocumento}`}
                    title="Descargar PDF"
                    onClick={() => handleDownload(item)}
                    className="!px-2 -mr-1 shrink-0"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
