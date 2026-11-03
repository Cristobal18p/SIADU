import { Check } from 'lucide-react';

/**
 * Casilla de verificación. La variante `tarjeta` muestra icono, título y descripción.
 *
 * @param {Object} props
 * @param {string} props.id
 * @param {string} props.label
 * @param {string} [props.description]
 * @param {React.ElementType} [props.icon] - Icono de la variante `tarjeta`
 * @param {boolean} props.checked
 * @param {(checked: boolean) => void} props.onChange
 * @param {boolean} [props.disabled=false]
 * @param {'simple'|'tarjeta'} [props.variant='simple']
 */
export default function Checkbox({
  id,
  label,
  description,
  icon: Icon,
  checked,
  onChange,
  disabled = false,
  variant = 'simple',
}) {
  const input = (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="peer sr-only"
    />
  );

  const estadoCursor = disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer';

  // `relative`: el input `sr-only` queda dentro de la etiqueta y enfocarlo no desplaza la pantalla
  if (variant === 'tarjeta') {
    return (
      <label
        htmlFor={id}
        className={`relative flex items-start gap-3 p-4 rounded-xl border transition-colors ${
          checked ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 bg-white hover:border-blue-200'
        } ${estadoCursor} has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2`}
      >
        {input}
        {Icon && (
          <span
            aria-hidden="true"
            className="w-10 h-10 rounded-lg bg-blue-50 text-brand border border-blue-100 flex items-center justify-center shrink-0"
          >
            <Icon className="w-5 h-5" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900">{label}</span>
          {description && <span className="block text-xs text-slate-500 mt-0.5 leading-snug">{description}</span>}
        </span>
        <span
          aria-hidden="true"
          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
            checked ? 'bg-brand border-brand text-white' : 'bg-white border-slate-300 text-transparent'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
        </span>
      </label>
    );
  }

  return (
    <label htmlFor={id} className={`relative flex items-start gap-2.5 ${estadoCursor}`}>
      {input}
      <span
        aria-hidden="true"
        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          checked ? 'bg-brand border-brand text-white' : 'bg-white border-slate-300 text-transparent'
        } peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2`}
      >
        <Check className="w-3.5 h-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        {description && <span className="block text-xs text-slate-500 mt-0.5">{description}</span>}
      </span>
    </label>
  );
}
