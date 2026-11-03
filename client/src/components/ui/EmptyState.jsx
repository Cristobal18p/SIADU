import Button from './Button';

/**
 * Estado vacío con una acción opcional.
 *
 * @param {Object} props
 * @param {React.ElementType} props.icon
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} [props.actionLabel]
 * @param {function} [props.onAction]
 * @param {React.ElementType} [props.actionIcon]
 * @param {string} [props.className]
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className = '',
}) {
  return (
    <div
      className={`
        bg-white rounded-lg border border-slate-200 p-8 md:p-10
        flex flex-col items-center justify-center text-center ${className}
      `}
    >
      {Icon && (
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3.5">
          <Icon className="w-5 h-5" />
        </div>
      )}

      <h3 className="text-sm font-semibold text-slate-900 mb-1">
        {title}
      </h3>

      <p className="text-xs text-slate-500 max-w-md mb-5 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="sm"
          icon={actionIcon}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
