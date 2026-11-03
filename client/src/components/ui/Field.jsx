
/**
 * Campo de formulario (`input`, `textarea` o `select`) con etiqueta, ayuda y error.
 *
 * @param {Object} props
 * @param {string} props.id
 * @param {string} props.label
 * @param {'input'|'textarea'|'select'} [props.as='input']
 * @param {Array<{ valor: string, etiqueta: string, disabled?: boolean }>} [props.options] - Opciones del `select`
 * @param {string|null} [props.emptyOption='Selecciona una opción'] - `null` la omite
 * @param {boolean} [props.hideLabel=false] - Oculta la etiqueta visualmente
 * @param {boolean} [props.required=false]
 * @param {string} [props.hint] - Texto de ayuda
 * @param {string} [props.error] - Mensaje de error
 * @param {React.ReactNode} [props.icon] - Elemento a la izquierda
 * @param {React.ReactNode} [props.trailing] - Elemento a la derecha
 * @param {'md'|'sm'} [props.size='md']
 */
export default function Field({
  id,
  label,
  as = 'input',
  options = [],
  emptyOption = 'Selecciona una opción',
  hideLabel = false,
  required = false,
  hint,
  error,
  icon,
  trailing,
  size = 'md',
  className = '',
  ...inputProps
}) {
  const sizes = {
    // 16 px en móvil: con menos, iOS amplía la pantalla al enfocar
    md: 'py-2.5 md:py-2 text-base sm:text-sm rounded-lg',
    sm: 'py-2 text-base sm:text-xs rounded-lg',
  };

  const hintId = hint ? `${id}-ayuda` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [inputProps['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined;

  const controlClass = `w-full ${icon ? 'pl-10' : 'pl-3.5'} ${trailing ? 'pr-10' : 'pr-3.5'} ${sizes[size]} bg-white border ${
    error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/30' : 'border-slate-300 focus:border-brand focus:ring-brand/30'
  } text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${className}`;

  const sharedProps = {
    id,
    name: id,
    required,
    'aria-invalid': error ? true : inputProps['aria-invalid'],
    'aria-describedby': describedBy,
  };

  let control;
  if (as === 'textarea') {
    control = <textarea {...inputProps} {...sharedProps} rows={inputProps.rows ?? 4} className={`${controlClass} resize-y`} />;
  } else if (as === 'select') {
    control = (
      <select {...inputProps} {...sharedProps} className={`${controlClass} cursor-pointer`}>
        {emptyOption !== null && <option value="">{emptyOption}</option>}
        {options.map((o) => (
          <option key={o.valor} value={o.valor} disabled={o.disabled}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    );
  } else {
    control = <input {...inputProps} {...sharedProps} className={controlClass} />;
  }

  return (
    <div>
      <label
        htmlFor={id}
        className={hideLabel ? 'sr-only' : 'block text-xs font-medium text-slate-700 mb-1'}
      >
        {label}
        {required && !hideLabel && (
          <span className="text-rose-600 ml-0.5" aria-hidden="true">*</span>
        )}
      </label>
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-500">
            {icon}
          </div>
        )}
        {control}
        {trailing && <div className="absolute right-3.5 flex items-center">{trailing}</div>}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
