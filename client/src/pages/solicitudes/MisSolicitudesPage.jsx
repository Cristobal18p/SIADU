import { useEffect, useMemo, useState } from 'react';
import { FileText, PlusCircle, Search } from 'lucide-react';
import requestsApi from '../../api/requests.api';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/Skeleton';
import { nombreCompletoUnidad } from '../../utils/formatters';
import TablaSolicitudes from './TablaSolicitudes';
import FiltroOpciones from '../../components/ui/FiltroOpciones';

const FILTROS = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'PENDIENTE', label: 'En revisión' },
  { id: 'APROBADO', label: 'Aprobada' },
  { id: 'RECHAZADO', label: 'Rechazada' },
];

/** Solicitudes del usuario con filtro por estado y búsqueda. */
export default function MisSolicitudesPage({ usuario, onNavigate }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [filtro, setFiltro] = useState('TODAS');
  const [busqueda, setBusqueda] = useState('');

  const cargar = async () => {
    setCargando(true);
    setError(false);
    try {
      const res = await requestsApi.getMyRequests();
      setSolicitudes(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error al cargar mis solicitudes:', err);
      setError(true);
      setSolicitudes([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return solicitudes.filter((s) => {
      const coincideEstado = filtro === 'TODAS' || s.estado === filtro;
      const coincideTexto =
        !termino ||
        s.codigoDocumento.toLowerCase().includes(termino) ||
        s.nombrePlantilla.toLowerCase().includes(termino);
      return coincideEstado && coincideTexto;
    });
  }, [solicitudes, filtro, busqueda]);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Mis solicitudes"
        title="Mis solicitudes"
        description="Consulta el estado de cada solicitud, quién la está revisando y el resultado de las ya resueltas."
        unidad={nombreCompletoUnidad(usuario?.unidad)}
      />

      <SectionCard
        title="Historial de solicitudes"
        action={
          <Button size="sm" icon={PlusCircle} onClick={() => onNavigate('/solicitante/nueva-solicitud')}>
            Nueva solicitud
          </Button>
        }
      >
        {cargando ? (
          <LoadingState label="Cargando mis solicitudes..." rows={4} />
        ) : error ? (
          <ErrorState onRetry={cargar} />
        ) : solicitudes.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={FileText}
              title="Aún no has enviado solicitudes"
              description="Cuando envíes una solicitud, aquí podrás ver su estado y la ruta de aprobación."
              actionLabel="Iniciar solicitud"
              actionIcon={PlusCircle}
              onAction={() => onNavigate('/solicitante/nueva-solicitud')}
            />
          </div>
        ) : (
          <>
            <div className="p-4 md:py-3 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <FiltroOpciones label="Filtrar por estado" opciones={FILTROS} valor={filtro} onChange={setFiltro} />

              <div className="w-full lg:max-w-xs">
                <Field
                  id="buscar-solicitud"
                  type="search"
                  size="sm"
                  label="Buscar solicitud"
                  hideLabel
                  icon={<Search className="w-4 h-4" aria-hidden="true" />}
                  placeholder="Buscar por N° o documento…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            <p className="sr-only" aria-live="polite">
              {filtradas.length} solicitudes encontradas
            </p>

            {filtradas.length === 0 ? (
              <p className="text-sm text-slate-600 py-10 text-center">
                No hay solicitudes que coincidan con el filtro seleccionado.
              </p>
            ) : (
              <TablaSolicitudes rows={filtradas} onNavigate={onNavigate} />
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
