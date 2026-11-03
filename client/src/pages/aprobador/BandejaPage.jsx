import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, Search, X } from 'lucide-react';
import approvalsApi from '../../api/approvals.api';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import DataTable from '../../components/ui/DataTable';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import CodeChip from '../../components/ui/CodeChip';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/Skeleton';
import { formatDate, nombreCompletoUnidad, tiempoTranscurrido } from '../../utils/formatters';

/** Bandeja del aprobador: trámites pendientes de su cargo, con búsqueda y filtro en el cliente. */
export default function BandejaPage({ usuario, onNavigate }) {
  const [pendientes, setPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [documento, setDocumento] = useState('TODOS');

  const cargar = async () => {
    setCargando(true);
    setError(false);
    try {
      const res = await approvalsApi.getPendingApprovals();
      setPendientes(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error al cargar la bandeja de entrada:', err);
      setError(true);
      setPendientes([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const documentos = useMemo(
    () => [...new Set(pendientes.map((p) => p.nombrePlantilla))].sort((a, b) => a.localeCompare(b, 'es')),
    [pendientes]
  );

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return pendientes.filter((p) => {
      const coincideDocumento = documento === 'TODOS' || p.nombrePlantilla === documento;
      const coincideTexto =
        !termino ||
        p.codigoDocumento.toLowerCase().includes(termino) ||
        p.solicitanteNombre.toLowerCase().includes(termino) ||
        p.solicitanteCedula.toLowerCase().includes(termino);
      return coincideDocumento && coincideTexto;
    });
  }, [pendientes, busqueda, documento]);

  const revisar = (item) => onNavigate(`/aprobador/bandeja/${item.idSolicitud}`);
  const hayFiltros = busqueda.trim() !== '' || documento !== 'TODOS';

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Bandeja de entrada"
        title="Bandeja de entrada"
        description="Documentos pendientes de tu revisión y firma."
        unidad={nombreCompletoUnidad(usuario?.unidad)}
      />

      <SectionCard title="Expedientes pendientes">
        {cargando ? (
          <LoadingState label="Cargando la bandeja..." rows={4} />
        ) : error ? (
          <ErrorState onRetry={cargar} />
        ) : pendientes.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={CheckCircle2}
              title="No hay expedientes pendientes"
              description="Estás al día. Los trámites que lleguen a tu cargo aparecerán aquí."
            />
          </div>
        ) : (
          <>
            <div className="p-4 md:py-3 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="w-full lg:max-w-xs">
                <Field
                  id="filtrar-documento"
                  as="select"
                  size="sm"
                  label="Filtrar por documento"
                  hideLabel
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  options={[
                    { valor: 'TODOS', etiqueta: 'Todos los documentos' },
                    ...documentos.map((d) => ({ valor: d, etiqueta: d })),
                  ]}
                />
              </div>

              <div className="w-full lg:max-w-xs">
                <Field
                  id="buscar-pendiente"
                  type="search"
                  size="sm"
                  label="Buscar expediente"
                  hideLabel
                  icon={<Search className="w-4 h-4" aria-hidden="true" />}
                  trailing={
                    busqueda && (
                      <button
                        type="button"
                        onClick={() => setBusqueda('')}
                        aria-label="Limpiar búsqueda"
                        className="p-1 text-slate-500 hover:text-slate-700 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )
                  }
                  placeholder="Buscar por N°, solicitante o cédula…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            <p className="sr-only" aria-live="polite">
              {filtrados.length} expedientes encontrados
            </p>

            {filtrados.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={FileText}
                  title="Ningún expediente coincide"
                  description="Prueba con otro término o quita los filtros."
                  actionLabel={hayFiltros ? 'Quitar filtros' : undefined}
                  actionIcon={X}
                  onAction={
                    hayFiltros
                      ? () => {
                          setBusqueda('');
                          setDocumento('TODOS');
                        }
                      : undefined
                  }
                />
              </div>
            ) : (
              <DataTable
                caption="Expedientes pendientes de resolución"
                rows={filtrados}
                rowKey={(item) => item.idAprobacion}
                columns={[
                  { header: 'Nº Solicitud', cell: (item) => <CodeChip>{item.codigoDocumento}</CodeChip> },
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
                    header: 'Acciones',
                    align: 'right',
                    cell: (item) => (
                      <Button
                        size="sm"
                        icon={FileText}
                        aria-label={`Revisar expediente ${item.codigoDocumento}`}
                        onClick={() => revisar(item)}
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
                      <h3 className="text-sm font-semibold text-slate-900 leading-snug">{item.nombrePlantilla}</h3>
                      <p className="text-xs text-slate-600 mt-1">
                        Solicitante: <strong className="text-slate-800">{item.solicitanteNombre}</strong> (
                        {item.solicitanteCedula})
                      </p>
                    </div>
                    <Button size="sm" icon={FileText} className="w-full" onClick={() => revisar(item)}>
                      Revisar expediente
                    </Button>
                  </>
                )}
              />
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
