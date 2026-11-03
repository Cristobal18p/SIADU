
/**
 * Grupo de botones de filtro; en móvil, una fila con desplazamiento horizontal.
 *
 * @param {Object} props
 * @param {string} props.label - Nombre accesible del grupo
 * @param {Array<{ id: string, label: string }>} props.opciones
 * @param {string} props.valor - Opción activa
 * @param {(id: string) => void} props.onChange
 */
export default function FiltroOpciones({ label, opciones, valor, onChange }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-1.5 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible [scrollbar-width:none]"
    >
      {opciones.map((o) => {
        const activo = valor === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={activo}
            onClick={() => onChange(o.id)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 sm:px-3 min-h-11 sm:min-h-0 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
              activo
                ? 'bg-brand text-white border-brand'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
