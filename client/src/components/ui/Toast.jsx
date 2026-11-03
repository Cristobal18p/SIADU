import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

const ToastContext = createContext({ notify: () => {} });

const TONES = {
  error: { box: 'bg-rose-50 border-rose-200 text-rose-900', icon: AlertCircle, iconColor: 'text-rose-700' },
  success: { box: 'bg-emerald-50 border-emerald-200 text-emerald-900', icon: CheckCircle2, iconColor: 'text-emerald-700' },
};

/** Proveedor de avisos no bloqueantes (`useToast().notify`). */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message, tone = 'error') => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, tone }]);
      setTimeout(() => dismiss(id), 6000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        aria-live="polite"
        // Sobre la barra inferior del móvil (--alto-barra-inferior)
        className="fixed bottom-[calc(1rem+var(--alto-barra-inferior,0px))] right-4 left-4 sm:left-auto sm:w-96 z-[70] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => {
          const tone = TONES[t.tone] || TONES.error;
          const Icon = tone.icon;
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-3 p-3 rounded-xl border shadow-lg text-sm animate-pop ${tone.box}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-px ${tone.iconColor}`} aria-hidden="true" />
              <p className="flex-1 leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Cerrar aviso"
                className="p-1 -m-1 rounded-md opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
