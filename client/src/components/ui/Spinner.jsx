
/** Indicador de carga circular; con `label` se anuncia a lectores de pantalla. */
export default function Spinner({ size = 'md', label, className = '' }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-[3px]' };

  return (
    <span role={label ? 'status' : undefined} className="inline-flex">
      <span
        aria-hidden="true"
        className={`${sizes[size]} border-brand border-t-transparent rounded-full animate-spin ${className}`}
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
