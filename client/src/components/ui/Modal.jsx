import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const SIZES = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  '2xl': 'max-w-2xl',
  '5xl': 'max-w-5xl',
};

const ICON_TONES = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  brand: 'bg-blue-50 text-brand border-blue-100',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

/**
 * Diálogo modal accesible: cierre con Escape o clic fuera, foco atrapado y devuelto al cerrar.
 * En móvil se abre como hoja inferior.
 *
 * @param {Object} props
 * @param {function} props.onClose
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {React.ElementType} [props.icon]
 * @param {'default'|'brand'|'danger'|'success'} [props.tone='default']
 * @param {React.ReactNode} [props.badge] - Etiqueta junto al título
 * @param {React.ReactNode} [props.footer]
 * @param {'md'|'lg'|'2xl'|'5xl'} [props.size='md']
 * @param {boolean} [props.pantallaCompleta=false] - Ocupa casi toda la pantalla; el contenido gestiona su desplazamiento
 */
export default function Modal({
  onClose,
  title,
  subtitle,
  icon: Icon,
  tone = 'default',
  badge,
  footer,
  size = 'md',
  pantallaCompleta = false,
  children,
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const ENFOCABLES =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      // El foco circula dentro del diálogo
      const enfocables = [...panelRef.current.querySelectorAll(ENFOCABLES)].filter((el) => el.offsetParent !== null);
      if (enfocables.length === 0) {
        e.preventDefault();
        return;
      }
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const dentro = panelRef.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === primero || !dentro || document.activeElement === panelRef.current)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (document.activeElement === ultimo || !dentro)) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  // Se monta en el body para que ningún contenedor lo recorte
  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex justify-center sm:p-4 bg-slate-900/60 backdrop-blur-xs ${
        pantallaCompleta ? 'items-stretch sm:items-center' : 'items-end sm:items-center'
      }`}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white shadow-2xl border border-slate-200 w-full ${SIZES[size]} flex flex-col overflow-hidden animate-pop focus:outline-none ${
          pantallaCompleta
            ? 'h-dvh sm:h-[90vh] sm:rounded-2xl pt-[env(safe-area-inset-top)] sm:pt-0'
            : 'rounded-t-2xl sm:rounded-2xl max-h-[92dvh] sm:max-h-[90vh]'
        }`}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${ICON_TONES[tone]}`}>
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={titleId} className="text-base font-semibold text-slate-900">
                  {title}
                </h2>
                {badge}
              </div>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className={pantallaCompleta ? 'flex-1 min-h-0' : 'overflow-y-auto overscroll-contain'}>{children}</div>

        {footer && (
          <div className="px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3 border-t border-slate-100 flex items-center justify-between gap-3 bg-white shrink-0 *:flex-1 sm:*:flex-none">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
