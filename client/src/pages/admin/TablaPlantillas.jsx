import { PowerOff, Trash2 } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import CodeChip from '../../components/ui/CodeChip';
import { formatDate } from '../../utils/formatters';

const AUDIENCIA = { ESTUDIANTE: 'Estudiantes', PROFESOR: 'Profesores', ADMINISTRATIVO: 'Administrativos' };

const dirigidoA = (item) => (item.audiencia || []).map((a) => AUDIENCIA[a] || a).join(', ');

const ACCION = { BORRADOR: 'Continuar', ACTIVO: 'Editar', INACTIVO: 'Ver' };
// Una activa con borrador en curso muestra «Continuar»
const etiquetaAccion = (item) => (item.idVersionBorrador ? 'Continuar' : ACCION[item.estadoVersion] ?? 'Abrir');

/**
 * Tabla de plantillas con la acción que corresponde a su estado.
 *
 * @param {Object} props
 * @param {Array} props.rows
 * @param {string} [props.caption]
 * @param {(path: string) => void} props.onNavigate
 * @param {(item: Object) => void} [props.onDesactivar] - Habilita «Desactivar» en las activas
 * @param {(item: Object) => void} [props.onEliminar] - Habilita «Eliminar» en las nunca publicadas
 */
export default function TablaPlantillas({ rows, caption = 'Plantillas oficiales', onNavigate, onDesactivar, onEliminar }) {
  const gestionar = (item) => onNavigate(`/admin/editor/${item.idPlantilla}`);
  const sePuedeDesactivar = (item) => Boolean(onDesactivar) && item.estadoVersion === 'ACTIVO';
  // Nunca publicada: versión 1 en borrador
  const sePuedeEliminar = (item) => Boolean(onEliminar) && item.estadoVersion === 'BORRADOR' && item.numeroVersion === 1;

  const botonEliminar = (item) =>
    sePuedeEliminar(item) && (
      <Button
        variant="ghost"
        size="sm"
        icon={Trash2}
        aria-label={`Eliminar la plantilla ${item.nombre}`}
        onClick={() => onEliminar(item)}
        className="hover:!text-rose-700 hover:!bg-rose-50"
      >
        Eliminar
      </Button>
    );

  return (
    <DataTable
      caption={caption}
      rows={rows}
      rowKey={(item) => item.idPlantilla}
      columns={[
        {
          header: 'Documento',
          wrap: true,
          cell: (item) => <span className="font-medium text-slate-900">{item.nombre}</span>,
        },
        { header: 'Versión', cell: (item) => <CodeChip>v{item.numeroVersion}</CodeChip> },
        { header: 'Estado', cell: (item) => <Badge variant={item.estadoVersion} /> },
        {
          header: 'Dirigido a',
          wrap: true,
          cell: (item) => <span className="text-slate-700">{dirigidoA(item)}</span>,
        },
        {
          header: 'Actualizada',
          cell: (item) => <span className="text-slate-500">{formatDate(item.fechaActualizacion)}</span>,
        },
        {
          header: 'Acción',
          align: 'right',
          cell: (item) => (
            <div className="flex items-center justify-end gap-2">
              {botonEliminar(item)}
              {sePuedeDesactivar(item) && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={PowerOff}
                  aria-label={`Desactivar la plantilla ${item.nombre}`}
                  onClick={() => onDesactivar(item)}
                >
                  Desactivar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                aria-label={`${etiquetaAccion(item)} la plantilla ${item.nombre}`}
                onClick={() => gestionar(item)}
              >
                {etiquetaAccion(item)}
              </Button>
            </div>
          ),
        },
      ]}
      renderMobile={(item) => (
        <>
          <div className="flex items-center justify-between gap-2">
            <CodeChip>v{item.numeroVersion}</CodeChip>
            <Badge variant={item.estadoVersion} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 leading-snug">{item.nombre}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {dirigidoA(item)} · Actualizada: {formatDate(item.fechaActualizacion)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => gestionar(item)}>
              {etiquetaAccion(item)} plantilla
            </Button>
            {botonEliminar(item)}
            {sePuedeDesactivar(item) && (
              <Button
                variant="ghost"
                size="sm"
                icon={PowerOff}
                aria-label={`Desactivar la plantilla ${item.nombre}`}
                onClick={() => onDesactivar(item)}
              >
                Desactivar
              </Button>
            )}
          </div>
        </>
      )}
    />
  );
}
