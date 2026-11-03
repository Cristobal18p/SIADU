import { useState, useEffect } from 'react';
import {
  PlusCircle,
  FileText,
  FolderOpen,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import requestsApi from '../../api/requests.api';
import StatCard from '../../components/ui/StatCard';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import QuickActionCard from '../../components/ui/QuickActionCard';
import Button from '../../components/ui/Button';
import SectionCard from '../../components/ui/SectionCard';
import LoadingState from '../../components/ui/Skeleton';
import { getSaludoBienvenida, nombreCompletoUnidad } from '../../utils/formatters';
import TablaSolicitudes from '../solicitudes/TablaSolicitudes';

/** Solicitudes que muestra el inicio. */
const RECIENTES = 5;

export default function InicioSolicitante({ usuario, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await requestsApi.getMyRequests();
      setRequests(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error al cargar solicitudes del solicitante:', err);
      setError(true);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pendientesCount = requests.filter((r) => r.estado === 'PENDIENTE').length;
  const aprobadosCount = requests.filter((r) => r.estado === 'APROBADO').length;
  const saludo = getSaludoBienvenida(usuario);

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <PageHeader
        badge="Portal del Solicitante"
        title={usuario?.nombreCompleto ? `${saludo}, ${usuario.nombreCompleto}` : saludo}
        description="Gestiona tus solicitudes de documentos institucionales"
        unidad={nombreCompletoUnidad(usuario?.unidad)}
      />

      {/* Acción principal (móvil) */}
      <Button
        size="lg"
        icon={PlusCircle}
        className="w-full md:hidden"
        onClick={() => onNavigate('/solicitante/nueva-solicitud')}
      >
        Nueva solicitud
      </Button>

      {/* Indicadores */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          loading={loading}
          title="Trámites en curso"
          value={error ? '—' : pendientesCount}
          description="Solicitudes en proceso de evaluación por las autoridades"
          icon={Clock}
          intent={!error && pendientesCount > 0 ? 'warning' : 'default'}
          onClick={() => onNavigate('/solicitante/mis-solicitudes')}
        />
        <StatCard
          loading={loading}
          title="Documentos emitidos"
          value={aprobadosCount}
          description="Certificaciones y oficios oficiales listos para descarga"
          icon={CheckCircle2}
          intent="success"
          onClick={() => onNavigate('/solicitante/documentos')}
        />
      </section>

      {/* Accesos rápidos (escritorio) */}
      <section className="hidden md:grid grid-cols-3 gap-4">
        <QuickActionCard
          icon={PlusCircle}
          title="Nueva solicitud"
          description="Elige una plantilla publicada y completa el formulario."
          actionLabel="Iniciar solicitud"
          onClick={() => onNavigate('/solicitante/nueva-solicitud')}
        />
        <QuickActionCard
          tone="slate"
          icon={FileText}
          title="Mis solicitudes"
          description="Revisa el estado de tus trámites en curso y anteriores."
          actionLabel="Ver solicitudes"
          onClick={() => onNavigate('/solicitante/mis-solicitudes')}
        />
        <QuickActionCard
          tone="slate"
          icon={FolderOpen}
          title="Documentos"
          description="Consulta y descarga los oficios y certificaciones ya aprobados."
          actionLabel="Ver documentos"
          onClick={() => onNavigate('/solicitante/documentos')}
        />
      </section>

      {/* Solicitudes recientes */}
      <SectionCard
        title="Solicitudes recientes"
        action={
          requests.length > 0 && (
            <Button
              variant="link"
              size="sm"
              iconRight={ArrowRight}
              onClick={() => onNavigate('/solicitante/mis-solicitudes')}
            >
              Ver todas
            </Button>
          )
        }
      >
        {loading ? (
          <LoadingState label="Cargando solicitudes..." />
        ) : error ? (
          <ErrorState onRetry={fetchData} />
        ) : requests.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={FileText}
              title="No tienes trámites en curso"
              description="Aún no has radicado solicitudes en este semestre. Haz clic en Nueva solicitud para iniciar tu gestión digital."
              actionLabel="Iniciar solicitud"
              actionIcon={PlusCircle}
              onAction={() => onNavigate('/solicitante/nueva-solicitud')}
            />
          </div>
        ) : (
          <TablaSolicitudes caption="Solicitudes recientes" rows={requests.slice(0, RECIENTES)} onNavigate={onNavigate} />
        )}
      </SectionCard>
    </div>
  );
}
