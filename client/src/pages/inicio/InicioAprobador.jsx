import { useState, useEffect } from 'react';
import {
  Inbox,
  Clock,
  CheckCircle2,
  ArrowRight,
  FileText,
} from 'lucide-react';
import approvalsApi from '../../api/approvals.api';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import QuickActionCard from '../../components/ui/QuickActionCard';
import CodeChip from '../../components/ui/CodeChip';
import SectionCard from '../../components/ui/SectionCard';
import DataTable from '../../components/ui/DataTable';
import LoadingState from '../../components/ui/Skeleton';
import { getSaludoBienvenida, formatDate, nombreCompletoUnidad, tiempoTranscurrido } from '../../utils/formatters';

/** Expedientes que muestra el inicio. */
const RECIENTES = 5;

/** Inicio del aprobador. */
export default function InicioAprobador({ usuario, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [pendingList, setPendingList] = useState([]);
  const [resueltosMes, setResueltosMes] = useState(null);
  const [error, setError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const [res, historial] = await Promise.all([
        approvalsApi.getPendingApprovals(),
        // Si falla el indicador de resueltos, la bandeja se muestra igual
        approvalsApi.getHistory({ desde: inicioMes.toISOString(), limit: 1 }).catch(() => null),
      ]);
      setPendingList(Array.isArray(res) ? res : []);
      setResueltosMes(historial ? (historial.total ?? 0) : null);
    } catch (err) {
      console.error('Error al cargar pendientes del aprobador:', err);
      setError(true);
      setPendingList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saludo = getSaludoBienvenida(usuario);

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <PageHeader
        badge="Despacho de Autoridad Resolutiva"
        title={usuario?.nombreCompleto ? `${saludo}, ${usuario.nombreCompleto}` : saludo}
        description="Gestión, revisión y resolución de expedientes institucionales"
        unidad={nombreCompletoUnidad(usuario?.unidad)}
      />

      {/* Indicadores */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          loading={loading}
          title="Expedientes por resolver"
          value={pendingList.length}
          description="Solicitudes en espera de tu revisión de motivos y firma"
          icon={Clock}
          intent={pendingList.length > 0 ? 'warning' : 'default'}
          onClick={() => onNavigate('/aprobador/bandeja')}
        />
        <StatCard
          loading={loading}
          title="Trámites resueltos este mes"
          value={resueltosMes ?? '—'}
          description="Resoluciones emitidas por este despacho desde el inicio del mes"
          icon={CheckCircle2}
          intent="success"
          onClick={() => onNavigate('/aprobador/historial')}
        />
      </section>

      {/* Accesos rápidos (escritorio) */}
      <section className="hidden md:grid grid-cols-2 gap-4">
        <QuickActionCard
          icon={Inbox}
          title="Bandeja de expedientes"
          description="Revisa los trámites que requieren tu firma y visto bueno formal."
          actionLabel="Ir a bandeja"
          onClick={() => onNavigate('/aprobador/bandeja')}
        />
        <QuickActionCard
          tone="slate"
          icon={CheckCircle2}
          title="Historial de resoluciones"
          description="Consulta las solicitudes aprobadas y rechazadas anteriormente."
          actionLabel="Ver resoluciones"
          onClick={() => onNavigate('/aprobador/historial')}
        />
      </section>

      {/* Expedientes pendientes */}
      <SectionCard
        title="Expedientes pendientes de resolución"
        action={
          pendingList.length > 0 && (
            <Button
              variant="link"
              size="sm"
              iconRight={ArrowRight}
              onClick={() => onNavigate('/aprobador/bandeja')}
            >
              Ver bandeja completa ({pendingList.length})
            </Button>
          )
        }
      >
        {loading ? (
          <LoadingState label="Consultando expedientes del despacho..." />
        ) : error ? (
          <ErrorState onRetry={fetchData} />
        ) : pendingList.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={CheckCircle2}
              title="No hay expedientes pendientes de resolución"
              description="Su despacho se encuentra al día. Los trámites radicados por estudiantes o docentes que requieran su firma aparecerán aquí inmediatamente."
              actionLabel="Consultar bandeja de entrada"
              actionIcon={Inbox}
              onAction={() => onNavigate('/aprobador/bandeja')}
            />
          </div>
        ) : (
          <DataTable
            caption="Expedientes pendientes de resolución"
            rows={pendingList.slice(0, RECIENTES)}
            rowKey={(item) => item.idAprobacion}
            columns={[
              { header: 'Nº Expediente', cell: (item) => <CodeChip>{item.codigoDocumento}</CodeChip> },
              {
                header: 'Documento',
                wrap: true,
                cell: (item) => <span className="font-medium text-slate-900">{item.nombrePlantilla}</span>,
              },
              {
                header: 'Solicitante',
                cell: (item) => (
                  <>
                    <span className="font-medium text-slate-800 block">{item.solicitanteNombre}</span>
                    <span className="text-xs text-slate-500 block font-mono">{item.solicitanteCedula}</span>
                  </>
                ),
              },
              {
                header: 'Recibido',
                cell: (item) => (
                  <>
                    <span className="text-slate-700 block">{formatDate(item.fechaAsignacion)}</span>
                    <span className="text-xs text-slate-500 block">{tiempoTranscurrido(item.fechaAsignacion)}</span>
                  </>
                ),
              },
              {
                header: 'Acción',
                align: 'right',
                cell: (item) => (
                  <Button
                    size="sm"
                    icon={FileText}
                    aria-label={`Revisar expediente ${item.codigoDocumento}`}
                    onClick={() => onNavigate(`/aprobador/bandeja/${item.idSolicitud}`)}
                  >
                    Revisar
                  </Button>
                ),
              },
            ]}
            renderMobile={(item) => (
              <>
                <div className="flex items-center justify-between gap-2">
                  <CodeChip>{item.codigoDocumento}</CodeChip>
                  <span className="text-xs text-slate-500">
                    {formatDate(item.fechaAsignacion)} · {tiempoTranscurrido(item.fechaAsignacion)}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                    {item.nombrePlantilla}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Solicitante: <strong className="text-slate-800">{item.solicitanteNombre}</strong> ({item.solicitanteCedula})
                  </p>
                </div>

                <div className="pt-1">
                  <Button
                    size="sm"
                    icon={FileText}
                    onClick={() => onNavigate(`/aprobador/bandeja/${item.idSolicitud}`)}
                    className="w-full"
                  >
                    Revisar Expediente
                  </Button>
                </div>
              </>
            )}
          />
        )}
      </SectionCard>
    </div>
  );
}
