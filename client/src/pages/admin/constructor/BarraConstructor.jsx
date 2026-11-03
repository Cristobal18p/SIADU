import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, Pencil, Save } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { LOGO_UP } from '../../../utils/logos';

/** Nombre de la plantilla, editable al hacer clic. */
function NombreEditable({ nombre, editable, onCambio }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nombre);
  const campoRef = useRef(null);

  useEffect(() => {
    if (editando) campoRef.current?.select();
  }, [editando]);

  const mostrado = nombre.trim() || 'Plantilla sin nombre';

  const confirmar = () => {
    setEditando(false);
    if (valor.trim() && valor !== nombre) onCambio(valor);
  };

  if (!editable) {
    return <span className="text-base leading-6 font-semibold text-slate-900 truncate">{mostrado}</span>;
  }

  if (editando) {
    return (
      <input
        ref={campoRef}
        value={valor}
        maxLength={150}
        aria-label="Nombre de la plantilla"
        onChange={(e) => setValor(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirmar();
          if (e.key === 'Escape') {
            setValor(nombre);
            setEditando(false);
          }
        }}
        className="text-base font-semibold text-slate-900 bg-white border border-brand rounded-md px-2 py-0.5 w-72 focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValor(nombre);
        setEditando(true);
      }}
      title="Cambiar el nombre"
      className="group flex items-center gap-1.5 min-w-0 rounded-md px-2 py-1 -mx-2 hover:bg-slate-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <span className="text-base leading-6 font-semibold text-slate-900 truncate">{mostrado}</span>
      <Pencil className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 shrink-0" aria-hidden="true" />
    </button>
  );
}

/** Divisor vertical. */
const Divisor = () => <span aria-hidden="true" className="w-px h-7 bg-slate-200 mx-1 shrink-0" />;

/**
 * Barra del editor del documento: marca, nombre editable, estado de guardado y acciones.
 *
 * @param {Object} props
 * @param {Object} props.borrador
 * @param {boolean} props.editable
 * @param {boolean} props.guardando
 * @param {boolean} props.sucio - Hay cambios sin guardar
 * @param {(nombre: string) => void} props.onNombre
 * @param {() => void} props.onAtras
 * @param {() => void} props.onGuardar
 * @param {() => void} props.onSiguiente
 * @param {() => void} [props.onVistaPrevia]
 */
export default function BarraConstructor({ borrador, editable, guardando, sucio, onNombre, onAtras, onGuardar, onSiguiente, onVistaPrevia }) {
  const sinGuardar = borrador.idPlantilla === null || sucio;

  // Estado, versión y guardado; solo el nombre cede espacio
  const separador = (
    <span aria-hidden="true" className="text-slate-300 shrink-0">
      ·
    </span>
  );

  return (
    <div
      role="toolbar"
      aria-label="Barra del editor"
      className="min-h-[60px] bg-white border-b border-slate-200 px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-4 shrink-0"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Marca */}
        <div className="flex items-center gap-2 shrink-0" aria-label="SIADU">
          <img src={LOGO_UP} alt="" className="h-8 w-auto object-contain" />
          <span className="hidden sm:block text-sm font-bold text-brand tracking-tight">SIADU</span>
        </div>
        <Divisor />
        <div className="min-w-0 flex-1">
          <NombreEditable nombre={borrador.nombre} editable={editable} onCambio={onNombre} />
          <p className="flex items-center gap-2 text-xs text-slate-600 mt-0.5">
            <span className="shrink-0">
              <Badge variant={borrador.estado} />
            </span>
            {borrador.idPlantilla !== null && (
              <>
                {separador}
                <span className="font-medium whitespace-nowrap shrink-0">Versión {borrador.numeroVersion}</span>
              </>
            )}
            {editable && (
              <>
                {separador}
                <span className="flex items-center gap-1.5 font-medium whitespace-nowrap shrink-0" role="status">
                  <span
                    aria-hidden="true"
                    className={`w-2 h-2 rounded-full ${guardando ? 'bg-brand animate-pulse' : sinGuardar ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  />
                  {guardando ? 'Guardando…' : sinGuardar ? 'Sin guardar' : 'Guardado'}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {/* En pantallas angostas, solo iconos */}
        {onVistaPrevia && (
          <Button variant="ghost" size="sm" icon={Eye} onClick={onVistaPrevia} aria-label="Vista previa" title="Ver el documento final con datos de ejemplo">
            <span className="hidden md:inline">Vista previa</span>
          </Button>
        )}
        <Button variant="outline" size="sm" icon={ArrowLeft} disabled={guardando} onClick={onAtras} aria-label="Atrás">
          <span className="hidden md:inline">Atrás</span>
        </Button>
        {editable && (
          <Button variant="outline" size="sm" icon={Save} loading={guardando} onClick={onGuardar} aria-label="Guardar">
            <span className="hidden md:inline">Guardar</span>
          </Button>
        )}
        <Button size="sm" iconRight={ArrowRight} disabled={guardando} onClick={onSiguiente} aria-label="Siguiente">
          <span className="hidden sm:inline">Siguiente</span>
        </Button>
      </div>
    </div>
  );
}
