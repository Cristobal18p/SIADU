
/**
 * Distintivo de estado de solicitudes y versiones.
 *
 * @param {Object} props
 * @param {'PENDIENTE'|'APROBADO'|'RECHAZADO'|'ACTIVO'|'BORRADOR'|'INACTIVO'|string} props.variant
 * @param {string} [props.children]
 * @param {string} [props.className]
 */
export default function Badge({ variant = 'BORRADOR', children, className = '' }) {
  const normVariant = (variant || '').toUpperCase();

  const styles = {
    PENDIENTE: 'bg-amber-50 text-amber-900 border-amber-300/80',
    APROBADO: 'bg-emerald-50 text-emerald-950 border-emerald-300/80',
    RECHAZADO: 'bg-rose-50 text-rose-950 border-rose-300/80',
    ACTIVO: 'bg-blue-50 text-brand border-blue-200/90',
    BORRADOR: 'bg-slate-100 text-slate-800 border-slate-300/80',
    INACTIVO: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const dots = {
    PENDIENTE: 'bg-amber-500',
    APROBADO: 'bg-emerald-600',
    RECHAZADO: 'bg-rose-600',
    ACTIVO: 'bg-brand',
    BORRADOR: 'bg-slate-400',
    INACTIVO: 'bg-gray-400',
  };

  const labels = {
    PENDIENTE: 'En revisión',
    APROBADO: 'Aprobada',
    RECHAZADO: 'Rechazada',
    ACTIVO: 'Activo',
    BORRADOR: 'Borrador',
    INACTIVO: 'Inactivo',
  };

  const activeStyle = styles[normVariant] || styles.BORRADOR;
  const dotColor = dots[normVariant] || 'bg-slate-400';
  const labelText = children || labels[normVariant] || normVariant;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${activeStyle} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{labelText}</span>
    </span>
  );
}
