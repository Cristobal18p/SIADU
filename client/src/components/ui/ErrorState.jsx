import { AlertTriangle, RotateCw } from 'lucide-react';
import Button from './Button';

/**
 * Estado de error con reintento opcional.
 *
 * @param {Object} props
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {function} [props.onRetry] - Sin él no se muestra el botón de reintento
 */
export default function ErrorState({
  title = 'No pudimos cargar la información',
  description = 'Ocurrió un problema al comunicarse con el servidor. Verifica tu conexión e inténtalo de nuevo.',
  onRetry,
}) {
  return (
    <div role="alert" className="flex flex-col items-center text-center px-6 py-10">
      <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-600 mt-1 max-w-sm leading-relaxed">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" icon={RotateCw} onClick={onRetry} className="mt-4">
          Reintentar
        </Button>
      )}
    </div>
  );
}
