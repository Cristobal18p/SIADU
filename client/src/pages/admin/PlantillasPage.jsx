import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Files, PowerOff, Search, Trash2, X } from 'lucide-react';
import templatesApi from '../../api/templates.api';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/Skeleton';
import { nombreCompletoUnidad } from '../../utils/formatters';
import TablaPlantillas from './TablaPlantillas';

const LIMITE = 10;

const FILTROS = [
  { id: 'TODOS', label: 'Todas' },
  { id: 'ACTIVO', label: 'Activas' },
  { id: 'BORRADOR', label: 'Borradores' },
  { id: 'INACTIVO', label: 'Inactivas' },
];

/** Inventario de plantillas de la unidad, con filtro por estado, búsqueda y paginación en el servidor. */
export default function PlantillasPage({ usuario, estadoInicial = 'TODOS', onNavigate }) {
  const [filtro, setFiltro] = useState(FILTROS.some((f) => f.id === estadoInicial) ? estadoInicial : 'TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [termino, setTermino] = useState('');
  const [pagina, setPagina] = useState(1);

  const { notify } = useToast();
  const [aDesactivar, setADesactivar] = useState(null);
  const [desactivando, setDesactivando] = useState(false);
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const [resultado, setResultado] = useState({ total: 0, pagina: 1, totalPaginas: 0, datos: [] });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  // La búsqueda se envía al dejar de escribir
  useEffect(() => {
    const t = setTimeout(() => {
      setTermino(busqueda.trim());
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(false);
    try {
      const res = await templatesApi.getTemplates({
        page: pagina,
        limit: LIMITE,
        ...(filtro !== 'TODOS' ? { estado: filtro } : {}),
        ...(termino ? { search: termino } : {}),
      });
      setResultado({
        total: res?.total ?? 0,
        pagina: res?.pagina ?? 1,
        totalPaginas: res?.totalPaginas ?? 0,
        datos: Array.isArray(res?.datos) ? res.datos : [],
      });
    } catch (err) {
      console.error('Error al cargar las plantillas:', err);
      setError(true);
    } finally {
      setCargando(false);
    }
  }, [filtro, termino, pagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /** Desactiva la versión activa; consulta el detalle para obtener su id. */
  const desactivar = async () => {
    const item = aDesactivar;
    setDesactivando(true);
    try {
      const detalle = await templatesApi.getTemplateById(item.idPlantilla);
      if (detalle.estado !== 'ACTIVO') {
        notify('La plantilla ya no está activa. Se actualizó la lista.');
      } else {
        const res = await templatesApi.deactivateTemplate(item.idPlantilla, detalle.idVersion);
        notify(res.mensaje || 'Plantilla desactivada.', 'success');
      }
      setADesactivar(null);
      await cargar();
    } catch (err) {
      notify(err.message || 'No se pudo desactivar la plantilla.');
    } finally {
      setDesactivando(false);
    }
  };

  /** Elimina una plantilla nunca publicada. */
  const eliminar = async () => {
    setEliminando(true);
    try {
      await templatesApi.deleteTemplate(aEliminar.idPlantilla);
      notify('Plantilla eliminada.', 'success');
      setAEliminar(null);
      // Si era la única de la última página, se vuelve a la anterior
      if (resultado.datos.length === 1 && pagina > 1) setPagina((p) => p - 1);
      else await cargar();
    } catch (err) {
      notify(err.message || 'No se pudo eliminar la plantilla.');
      setAEliminar(null);
      await cargar();
    } finally {
      setEliminando(false);
    }
  };

  const cambiarFiltro = (id) => {
    setFiltro(id);
    setPagina(1);
  };

  const hayFiltros = filtro !== 'TODOS' || termino !== '';
  const limpiar = () => {
    setFiltro('TODOS');
    setBusqueda('');
    setTermino('');
    setPagina(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Plantillas oficiales"
        title="Plantillas"
        description="Consulta las plantillas de la unidad, su versión vigente y a quién están dirigidas."
        unidad={nombreCompletoUnidad(usuario?.unidad)}
      />

      <SectionCard title="Inventario de plantillas">
        <div className="p-4 md:py-3 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-1.5">
            {FILTROS.map((f) => {
              const activo = filtro === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => cambiarFiltro(f.id)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    activo
                      ? 'bg-brand text-white border-brand'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="w-full lg:max-w-xs">
            <Field
              id="buscar-plantilla"
              type="search"
              size="sm"
              label="Buscar plantilla"
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
              placeholder="Buscar por nombre…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        {cargando ? (
          <LoadingState label="Cargando plantillas..." rows={4} />
        ) : error ? (
          <ErrorState onRetry={cargar} />
        ) : resultado.total === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Files}
              title={hayFiltros ? 'Ninguna plantilla coincide' : 'No hay plantillas registradas'}
              description={
                hayFiltros
                  ? 'Prueba con otro estado o término de búsqueda.'
                  : 'Las plantillas que se diseñen en el Editor de plantillas aparecerán aquí.'
              }
              actionLabel={hayFiltros ? 'Quitar filtros' : undefined}
              actionIcon={hayFiltros ? X : undefined}
              onAction={hayFiltros ? limpiar : undefined}
            />
          </div>
        ) : (
          <>
            <TablaPlantillas
              rows={resultado.datos}
              caption="Inventario de plantillas"
              onNavigate={onNavigate}
              onDesactivar={setADesactivar}
              onEliminar={setAEliminar}
            />

            <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-xs text-slate-500" aria-live="polite">
                {resultado.total} plantilla{resultado.total === 1 ? '' : 's'} · Página {resultado.pagina} de{' '}
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

      {aDesactivar && (
        <Modal
          onClose={() => !desactivando && setADesactivar(null)}
          title="Desactivar plantilla"
          subtitle={aDesactivar.nombre}
          icon={PowerOff}
          tone="danger"
          footer={
            <>
              <Button variant="outline" size="sm" disabled={desactivando} onClick={() => setADesactivar(null)}>
                Cancelar
              </Button>
              <Button variant="danger" size="sm" loading={desactivando} onClick={desactivar}>
                Desactivar
              </Button>
            </>
          }
        >
          <div className="p-5 space-y-2 text-sm text-slate-600">
            <p>
              La versión {aDesactivar.numeroVersion} dejará de aparecer en el catálogo y nadie podrá iniciar solicitudes
              nuevas con ella.
            </p>
            <p>
              Las solicitudes que ya están en proceso continúan con su versión y su flujo de aprobación. Podrás crear una
              versión nueva a partir de ella cuando quieras volver a publicarla.
            </p>
          </div>
        </Modal>
      )}

      {aEliminar && (
        <Modal
          onClose={() => !eliminando && setAEliminar(null)}
          title="Eliminar plantilla"
          subtitle={aEliminar.nombre}
          icon={Trash2}
          tone="danger"
          footer={
            <>
              <Button variant="outline" size="sm" disabled={eliminando} onClick={() => setAEliminar(null)}>
                Cancelar
              </Button>
              <Button variant="danger" size="sm" icon={Trash2} loading={eliminando} onClick={eliminar}>
                Eliminar
              </Button>
            </>
          }
        >
          <div className="p-5 space-y-2 text-sm text-slate-600">
            <p>Se borrarán la plantilla, su diseño, su formulario y el flujo de aprobación que estabas armando para ella.</p>
            <p>Nunca se publicó, así que no tiene solicitudes. Esta acción no se puede deshacer.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
