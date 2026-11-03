import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import approvalsApi from '../../api/approvals.api';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import DataTable from '../../components/ui/DataTable';
import FiltroOpciones from '../../components/ui/FiltroOpciones';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import CodeChip from '../../components/ui/CodeChip';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/Skeleton';
import { formatDate, nombreCompletoUnidad } from '../../utils/formatters';

const LIMITE = 10;

const FILTROS = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'APROBADO', label: 'Aprobados' },
  { id: 'RECHAZADO', label: 'Rechazados' },
];

/** `hasta` es exclusivo: se envía el día siguiente al elegido. */
const finDeDia = (yyyyMmDd) => {
  const d = new Date(`${yyyyMmDd}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
};

/** Historial de resoluciones, paginado en el servidor; la búsqueda de texto recorre la página cargada. */
export default function HistorialPage({ usuario, onNavigate }) {
  const [filtro, setFiltro] = useState('TODOS');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');

  const [resultado, setResultado] = useState({ total: 0, pagina: 1, totalPaginas: 0, datos: [] });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(false);
    try {
      const res = await approvalsApi.getHistory({
        page: pagina,
        limit: LIMITE,
        ...(filtro !== 'TODOS' ? { decision: filtro } : {}),
        ...(desde ? { desde: new Date(`${desde}T00:00:00`).toISOString() } : {}),
        ...(hasta ? { hasta: finDeDia(hasta) } : {}),
      });
      setResultado({
        total: res?.total ?? 0,
        pagina: res?.pagina ?? 1,
        totalPaginas: res?.totalPaginas ?? 0,
        datos: Array.isArray(res?.datos) ? res.datos : [],
      });
    } catch (err) {
      console.error('Error al cargar el historial de resoluciones:', err);
      setError(true);
    } finally {
      setCargando(false);
    }
  }, [filtro, desde, hasta, pagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarFiltro = (id) => {
    setFiltro(id);
    setPagina(1);
  };

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return resultado.datos;
    return resultado.datos.filter(
      (a) =>
        a.codigoDocumento.toLowerCase().includes(termino) ||
        a.solicitanteNombre.toLowerCase().includes(termino) ||
        a.solicitanteCedula.toLowerCase().includes(termino)
    );
  }, [resultado.datos, busqueda]);

  const hayFiltros = filtro !== 'TODOS' || desde !== '' || hasta !== '';
  const limpiar = () => {
    setFiltro('TODOS');
    setDesde('');
    setHasta('');
    setBusqueda('');
    setPagina(1);
  };

  const verDetalle = (item) => onNavigate(`/aprobador/historial/${item.idSolicitud}`);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Historial"
        title="Historial de resoluciones"
        description="Registro de los trámites que has aprobado o rechazado."
        unidad={nombreCompletoUnidad(usuario?.unidad)}
      />

      <SectionCard title="Resoluciones emitidas">
        <div className="p-4 md:py-3 border-b border-slate-100 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <FiltroOpciones label="Filtrar por decisión" opciones={FILTROS} valor={filtro} onChange={cambiarFiltro} />

            <div className="w-full lg:max-w-xs">
              <Field
                id="buscar-resolucion"
                type="search"
                size="sm"
                label="Buscar en esta página"
                hideLabel
                icon={<Search className="w-4 h-4" aria-hidden="true" />}
                placeholder="Buscar por N°, solicitante o cédula…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-end gap-3">
            <div className="min-w-0 sm:w-44">
              <Field
                id="historial-desde"
                type="date"
                size="sm"
                label="Desde"
                value={desde}
                max={hasta || undefined}
                onChange={(e) => {
                  setDesde(e.target.value);
                  setPagina(1);
                }}
              />
            </div>
            <div className="min-w-0 sm:w-44">
              <Field
                id="historial-hasta"
                type="date"
                size="sm"
                label="Hasta"
                value={hasta}
                min={desde || undefined}
                onChange={(e) => {
                  setHasta(e.target.value);
                  setPagina(1);
                }}
              />
            </div>
            {hayFiltros && (
              <div className="col-span-2">
                <Button variant="link" size="sm" icon={X} onClick={limpiar}>
                  Quitar filtros
                </Button>
              </div>
            )}
          </div>
        </div>

        {cargando ? (
          <LoadingState label="Cargando el historial..." rows={4} />
        ) : error ? (
          <ErrorState onRetry={cargar} />
        ) : resultado.total === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Archive}
              title={hayFiltros ? 'Ninguna resolución coincide' : 'Aún no has resuelto trámites'}
              description={
                hayFiltros
                  ? 'Prueba con otro rango de fechas o quita los filtros.'
                  : 'Las solicitudes que apruebes o rechases aparecerán aquí.'
              }
              actionLabel={hayFiltros ? 'Quitar filtros' : undefined}
              actionIcon={X}
              onAction={hayFiltros ? limpiar : undefined}
            />
          </div>
        ) : visibles.length === 0 ? (
          <p className="text-sm text-slate-600 py-10 text-center">
            Ninguna resolución de esta página coincide con la búsqueda.
          </p>
        ) : (
          <>
            <DataTable
              caption="Historial de resoluciones"
              rows={visibles}
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
                { header: 'Decisión', cell: (item) => <Badge variant={item.decision} /> },
                {
                  header: 'Fecha',
                  cell: (item) => <span className="text-slate-500">{formatDate(item.fechaAccion)}</span>,
                },
                {
                  header: 'Acciones',
                  align: 'right',
                  cell: (item) => (
                    <Button
                      variant="link"
                      size="sm"
                      aria-label={`Ver detalle de ${item.codigoDocumento}`}
                      onClick={() => verDetalle(item)}
                    >
                      Ver detalle
                    </Button>
                  ),
                },
              ]}
              renderMobile={(item) => (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <CodeChip>{item.codigoDocumento}</CodeChip>
                    <Badge variant={item.decision} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 leading-snug">{item.nombrePlantilla}</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      <strong className="text-slate-800">{item.solicitanteNombre}</strong> ({item.solicitanteCedula})
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(item.fechaAccion)}</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => verDetalle(item)}>
                    Ver detalle
                  </Button>
                </>
              )}
            />

            <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-xs text-slate-500" aria-live="polite">
                {resultado.total} resolución{resultado.total === 1 ? '' : 'es'} · Página {resultado.pagina} de{' '}
                {Math.max(resultado.totalPaginas, 1)}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={ChevronLeft}
                  disabled={resultado.pagina <= 1}
                  onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  iconRight={ChevronRight}
                  disabled={resultado.pagina >= resultado.totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
