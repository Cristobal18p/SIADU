
/** Botón de acción. */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  const sizes = {
    // 44 px de alto en móvil (zona táctil mínima)
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 min-h-11 md:min-h-0',
    md: 'text-sm px-3.5 py-2 gap-2 min-h-11 md:min-h-0',
    lg: 'text-base md:text-sm px-4 py-2.5 gap-2.5 md:gap-2',
  };

  const variants = {
    primary:
      'bg-brand hover:bg-brand-dark text-white focus-visible:ring-brand shadow-2xs',
    secondary:
      'bg-slate-100 hover:bg-slate-200 text-slate-800 focus-visible:ring-slate-500',
    outline:
      'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus-visible:ring-slate-500',
    danger:
      'bg-rose-700 hover:bg-rose-800 text-white focus-visible:ring-rose-600 shadow-2xs',
    ghost:
      'hover:bg-slate-100 text-slate-600 hover:text-slate-900 focus-visible:ring-slate-500',
    link:
      '!px-0 !py-0 text-brand hover:text-brand-dark hover:underline focus-visible:ring-brand rounded-sm font-semibold',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
        />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      ) : null}
      {children != null && children !== false && <span>{children}</span>}
      {!loading && IconRight ? (
        <IconRight className="w-4 h-4 shrink-0" aria-hidden="true" />
      ) : null}
    </button>
  );
}
