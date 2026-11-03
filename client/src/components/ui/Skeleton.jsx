
/** Bloque de carga animado. */
export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

/**
 * Filas de carga con aviso accesible.
 *
 * @param {Object} props
 * @param {string} [props.label='Cargando...']
 * @param {number} [props.rows=3]
 */
export default function LoadingState({ label = 'Cargando...', rows = 3 }) {
  return (
    <div role="status" className="p-4 space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 flex-1" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}
