import { ArrowRight } from 'lucide-react';

// Solo tonos de marca y neutro; los demás colores indican estado
const TONES = {
  brand: {
    hover: 'hover:border-blue-200',
    icon: 'bg-blue-50 text-brand border-blue-100',
    action: 'text-brand',
  },
  slate: {
    hover: 'hover:border-slate-300',
    icon: 'bg-slate-100 text-slate-700 border-slate-200',
    action: 'text-slate-700',
  },
};

/**
 * Tarjeta de acceso rápido; toda la tarjeta es un botón.
 *
 * @param {Object} props
 * @param {React.ElementType} props.icon
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} props.actionLabel
 * @param {function} props.onClick
 * @param {'brand'|'slate'} [props.tone='brand']
 */
export default function QuickActionCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onClick,
  tone = 'brand',
}) {
  const t = TONES[tone] || TONES.brand;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full text-left bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs ${t.hover} transition-all flex items-center gap-3.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2`}
    >
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${t.icon}`}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed text-pretty">{description}</p>
      </div>

      <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold group-hover:underline ${t.action}`}>
        <span className="hidden lg:inline">{actionLabel}</span>
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </button>
  );
}
