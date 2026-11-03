
const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
};

/**
 * Círculo con las iniciales del usuario.
 *
 * @param {Object} props
 * @param {string} [props.iniciales]
 * @param {string} [props.color='#0b3b70'] - Color de fondo
 * @param {'sm'|'md'} [props.size='md']
 */
export default function Avatar({ iniciales, color = '#0b3b70', size = 'md', className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`${SIZES[size]} rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}
      style={{ backgroundColor: color }}
    >
      {iniciales || '?'}
    </div>
  );
}
