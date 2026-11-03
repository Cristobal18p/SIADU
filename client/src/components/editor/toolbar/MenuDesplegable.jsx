import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Menú desplegable de la barra de herramientas; posición fija y sin quitar la selección del documento.
 *
 * @param {Object} props
 * @param {string} props.etiqueta
 * @param {React.ElementType} [props.icon]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.resaltado] - Muestra el botón como activo
 * @param {Array<{ etiqueta?: string, icon?: React.ElementType, onSelect?: () => void, disabled?: boolean,
 *   ayuda?: string, peligro?: boolean, separador?: boolean, activo?: boolean }>} props.items
 */
export default function MenuDesplegable({ etiqueta, icon: Icon, disabled = false, resaltado = false, items }) {
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState({ top: 0, left: 0 });
  const botonRef = useRef(null);
  const menuRef = useRef(null);
  const idMenu = useId();

  const cerrar = (devolverFoco = false) => {
    setAbierto(false);
    if (devolverFoco) botonRef.current?.focus();
  };

  // Bajo el botón; si no cabe, alineado a su borde derecho
  useLayoutEffect(() => {
    if (!abierto) return;
    const r = botonRef.current.getBoundingClientRect();
    const ancho = menuRef.current?.offsetWidth ?? 240;
    const left = r.left + ancho > window.innerWidth - 8 ? Math.max(8, r.right - ancho) : r.left;
    setPosicion({ top: r.bottom + 4, left });
    menuRef.current?.querySelector('[role=menuitem]:not([disabled])')?.focus();
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => {
      if (!menuRef.current?.contains(e.target) && !botonRef.current?.contains(e.target)) cerrar();
    };
    const cerrarSinFoco = () => cerrar();
    document.addEventListener('mousedown', fuera);
    window.addEventListener('resize', cerrarSinFoco);
    window.addEventListener('scroll', cerrarSinFoco, true);
    return () => {
      document.removeEventListener('mousedown', fuera);
      window.removeEventListener('resize', cerrarSinFoco);
      window.removeEventListener('scroll', cerrarSinFoco, true);
    };
  }, [abierto]);

  const alTeclear = (e) => {
    const opciones = [...(menuRef.current?.querySelectorAll('[role=menuitem]:not([disabled])') ?? [])];
    const actual = opciones.indexOf(document.activeElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      cerrar(true);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const paso = e.key === 'ArrowDown' ? 1 : -1;
      opciones[(actual + paso + opciones.length) % opciones.length]?.focus();
    } else if (e.key === 'Tab') {
      cerrar();
    }
  };

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        onMouseDown={(e) => e.preventDefault()} // conserva la selección del documento
        onClick={() => setAbierto((a) => !a)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !abierto) {
            e.preventDefault();
            setAbierto(true);
          }
        }}
        className={`flex items-center gap-1 h-8 px-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-35 disabled:cursor-not-allowed ${
          resaltado || abierto ? 'bg-blue-100 text-brand' : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
        {etiqueta}
        <ChevronDown className="w-3.5 h-3.5 opacity-70" aria-hidden="true" />
      </button>

      {abierto && (
        <div
          ref={menuRef}
          id={idMenu}
          role="menu"
          aria-label={etiqueta}
          onKeyDown={alTeclear}
          style={{ position: 'fixed', top: posicion.top, left: posicion.left }}
          className="z-50 min-w-56 max-w-xs bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 animate-pop"
        >
          {items.map((item, i) =>
            item.separador ? (
              <div key={`sep-${i}`} role="separator" className="my-1 h-px bg-slate-100" />
            ) : (
              <button
                key={item.etiqueta}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                aria-checked={item.activo === undefined ? undefined : item.activo}
                title={item.disabled && item.ayuda ? item.ayuda : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  cerrar();
                  item.onSelect?.();
                }}
                className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm cursor-pointer focus:outline-none focus-visible:bg-slate-100 hover:bg-slate-100 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-transparent ${
                  item.peligro ? 'text-rose-700' : 'text-slate-700'
                }`}
              >
                {item.icon && <item.icon className="w-4 h-4 mt-0.5 shrink-0 opacity-80" aria-hidden="true" />}
                <span className="min-w-0">
                  <span className={`block ${item.activo ? 'font-semibold text-brand' : ''}`}>{item.etiqueta}</span>
                  {item.disabled && item.ayuda && <span className="block text-xs text-slate-500 mt-0.5">{item.ayuda}</span>}
                </span>
              </button>
            )
          )}
        </div>
      )}
    </>
  );
}
