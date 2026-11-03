
const VARIANTS = {
  code: 'font-mono text-slate-700 bg-slate-100 border-slate-200/70',
  step: 'text-brand bg-blue-50 border-blue-200/70',
};

/** Etiqueta compacta: `code` para códigos y `step` para el paso de un flujo. */
export default function CodeChip({ children, variant = 'code', className = '' }) {
  return (
    <span
      className={`inline-block text-xs font-medium border px-2 py-0.5 rounded ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
