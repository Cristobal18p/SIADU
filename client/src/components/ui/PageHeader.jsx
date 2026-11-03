
const TONES = {
  brand: {
    bar: 'bg-brand',
    chip: 'text-brand bg-blue-50 border-blue-200/70',
  },
  emerald: {
    bar: 'bg-emerald-600',
    chip: 'text-emerald-800 bg-emerald-50 border-emerald-200/80',
  },
};

/**
 * Cabecera de página: tarjeta en móvil; título, descripción y unidad en escritorio.
 *
 * @param {Object} props
 * @param {string} props.badge - Etiqueta del portal o módulo
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {string} [props.unidad] - Unidad del usuario
 * @param {'brand'|'emerald'} [props.tone='brand']
 */
export default function PageHeader({ badge, title, description, unidad, tone = 'brand' }) {
  const t = TONES[tone] || TONES.brand;

  return (
    <header className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-6 relative overflow-hidden md:bg-transparent md:border-0 md:shadow-none md:rounded-none md:p-0 md:overflow-visible md:flex md:items-end md:justify-between md:gap-8">
      <div className={`absolute top-0 left-0 right-0 h-1 md:hidden ${t.bar}`} />

      <div className="pt-0.5 md:pt-0 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5 md:hidden">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${t.chip}`}>
            {badge}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Universidad de Panamá{unidad ? ` · ${unidad}` : ''}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl md:text-xl font-semibold text-slate-900 tracking-tight text-balance">
          {title}
        </h1>

        {description && (
          <p className="text-sm text-slate-600 mt-1 md:mt-0.5 text-pretty">{description}</p>
        )}
      </div>

      {unidad && (
        <p className="hidden md:block shrink-0 max-w-xs text-right text-xs leading-snug text-slate-500">
          Universidad de Panamá
          <span className="block text-slate-600 font-medium">{unidad}</span>
        </p>
      )}
    </header>
  );
}
