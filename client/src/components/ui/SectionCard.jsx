
/**
 * Tarjeta de sección con título, acción opcional y contenido.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {React.ReactNode} [props.action] - Elemento a la derecha del título
 */
export default function SectionCard({ title, action, children }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 md:py-3 border-b border-slate-100 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
