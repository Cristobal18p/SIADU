import { useState, useEffect } from 'react';
import {
  Files,
  PlusCircle,
  FileCheck2,
  FileEdit,
  Archive,
  ArrowRight,
} from 'lucide-react';
import templatesApi from '../../api/templates.api';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import QuickActionCard from '../../components/ui/QuickActionCard';
import SectionCard from '../../components/ui/SectionCard';
import LoadingState from '../../components/ui/Skeleton';
import { getSaludoBienvenida, nombreCompletoUnidad } from '../../utils/formatters';
import TablaPlantillas from '../admin/TablaPlantillas';

/** Inicio del administrador. */
export default function InicioAdmin({ usuario, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ total: 0, datos: [] });
  // null mientras no hay dato; se muestra «—»
  const [conteos, setConteos] = useState({ ACTIVO: null, BORRADOR: null, INACTIVO: null });
  const [error, setError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      // Indicadores del resumen por estado; el listado trae la primera página
      const [res, resumen] = await Promise.all([
        templatesApi.getTemplates(),
        templatesApi.getTemplatesSummary(),
      ]);
      setData(res || { total: 0, datos: [] });
      setConteos({
        ACTIVO: resumen?.activas ?? null,
        BORRADOR: resumen?.borradores ?? null,
        INACTIVO: resumen?.inactivas ?? null,
      });
    } catch (err) {
      console.error('Error al cargar plantillas:', err);
      setError(true);
      setData({ total: 0, datos: [] });
      setConteos({ ACTIVO: null, BORRADOR: null, INACTIVO: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activasCount = conteos.ACTIVO ?? '—';
  const borradoresCount = conteos.BORRADOR ?? '—';
  const inactivasCount = conteos.INACTIVO ?? '—';

  const saludo = getSaludoBienvenida(usuario);

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <PageHeader
        badge="Gobernanza y Control Normativo"
        title={usuario?.nombreCompleto ? `${saludo}, ${usuario.nombreCompleto}` : saludo}
        description="Administración de plantillas oficiales, versionado inmutable y catálogo documental"
        unidad={nombreCompletoUnidad(usuario?.unidad)}
      />

      {/* Indicadores */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          loading={loading}
          title="Plantillas vigentes"
          value={activasCount}
          description="Habilitadas y disponibles en el catálogo"
          icon={FileCheck2}
          intent="success"
          onClick={() => onNavigate('/admin/plantillas?estado=ACTIVO')}
        />
        <StatCard
          loading={loading}
          title="Borradores en diseño"
          value={borradoresCount}
          description="En edición, aún sin publicar"
          icon={FileEdit}
          intent={typeof borradoresCount === 'number' && borradoresCount > 0 ? 'warning' : 'default'}
          onClick={() => onNavigate('/admin/plantillas?estado=BORRADOR')}
        />
        <StatCard
          loading={loading}
          title="Plantillas inactivas"
          value={inactivasCount}
          description="Deshabilitadas o archivadas fuera de vigencia"
          icon={Archive}
          intent="default"
          onClick={() => onNavigate('/admin/plantillas?estado=INACTIVO')}
        />
      </section>

      {/* Accesos rápidos */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickActionCard
          icon={PlusCircle}
          title="Diseñar plantilla"
          description="Crea nuevos oficios y certificaciones con variables dinámicas."
          actionLabel="Abrir constructor"
          onClick={() => onNavigate('/admin/editor')}
        />
        <QuickActionCard
          tone="slate"
          icon={Files}
          title="Plantillas"
          description="Consulta las plantillas activas, los borradores y las inactivas."
          actionLabel="Ver plantillas"
          onClick={() => onNavigate('/admin/plantillas')}
        />
      </section>

      {/* Plantillas recientes */}
      <SectionCard
        title="Plantillas recientes"
        action={
          data.datos.length > 0 && (
            <Button
              variant="link"
              size="sm"
              iconRight={ArrowRight}
              onClick={() => onNavigate('/admin/plantillas')}
            >
              Ver todas ({data.total})
            </Button>
          )
        }
      >
        {loading ? (
          <LoadingState label="Consultando inventario normativo de la facultad..." />
        ) : error ? (
          <ErrorState onRetry={fetchData} />
        ) : data.datos.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Files}
              title="No hay plantillas registradas en la facultad"
              description="Aún no se han configurado documentos oficiales en la unidad académica. Puedes diseñar la primera plantilla de certificación u oficio institucional utilizando el constructor visual."
              actionLabel="Diseñar primera plantilla"
              actionIcon={PlusCircle}
              onAction={() => onNavigate('/admin/editor')}
            />
          </div>
        ) : (
          <TablaPlantillas rows={data.datos} caption="Plantillas recientes" onNavigate={onNavigate} />
        )}
      </SectionCard>
    </div>
  );
}
