
/**
 * Indicador de resumen.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {number|string} props.value
 * @param {string} [props.description]
 * @param {React.ElementType} [props.icon]
 * @param {'default'|'accent'|'success'|'warning'|'danger'} [props.intent='default']
 * @param {function} [props.onClick]
 * @param {boolean} [props.loading] - Muestra un marcador en lugar del valor
 */
export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  intent = 'default',
  onClick,
  loading = false,
}) {
  const accentStyles = {
    default: {
      text: 'text-slate-900',
      iconBg: 'text-slate-500 bg-slate-100',
    },
    accent: {
      text: 'text-brand',
      iconBg: 'text-brand bg-blue-50',
    },
    success: {
      text: 'text-emerald-900',
      iconBg: 'text-emerald-700 bg-emerald-50',
    },
    warning: {
      text: 'text-amber-900',
      iconBg: 'text-amber-700 bg-amber-50',
    },
    danger: {
      text: 'text-rose-900',
      iconBg: 'text-rose-700 bg-rose-50',
    },
  };

  const current = accentStyles[intent] || accentStyles.default;

  const Tag = onClick ? 'button' : 'div';
  const interactiveProps = onClick ? { type: 'button', onClick } : {};

  return (
    <Tag
      {...interactiveProps}
      className={`
        block w-full text-left bg-white rounded-xl border border-slate-200
        p-4 md:py-3.5 shadow-2xs transition-all duration-150
        ${onClick ? 'cursor-pointer hover:shadow-xs hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus:outline-none' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-medium text-slate-600 block">
            {title}
          </span>
          <span className={`text-2xl font-semibold tracking-tight mt-1 block ${current.text}`}>
            {loading ? <span aria-busy="true" className="inline-block h-7 w-10 rounded bg-slate-200 animate-pulse align-middle" /> : value}
          </span>
        </div>

        {Icon && (
          <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${current.iconBg}`}>
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
      </div>

      {description && (
        // En móvil, dos por fila y sin descripción
        <p className="hidden sm:block mt-2 text-xs text-slate-500 font-medium">
          {description}
        </p>
      )}
    </Tag>
  );
}
