
/**
 * Tabla en pantallas medianas y grandes; lista de tarjetas en móvil.
 *
 * @param {Object} props
 * @param {Array<{header: string, cell: function, align?: 'left'|'right', wrap?: boolean}>} props.columns
 * @param {Array} props.rows
 * @param {function} props.rowKey - Clave única de cada fila
 * @param {function} props.renderMobile - Contenido de la tarjeta móvil
 * @param {string} props.caption - Descripción accesible de la tabla
 */
export default function DataTable({ columns, rows, rowKey, renderMobile, caption }) {
  return (
    <div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-ui border-collapse tabular-nums">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-slate-50/70 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.header}
                  scope="col"
                  className={`px-4 py-2.5 ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((item) => (
              <tr key={rowKey(item)} className="hover:bg-slate-50/60 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.header}
                    className={`px-4 py-2.5 ${col.wrap ? '' : 'whitespace-nowrap'} ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    {col.cell(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-slate-100">
        {rows.map((item) => (
          <div key={rowKey(item)} className="p-4 space-y-2.5">
            {renderMobile(item)}
          </div>
        ))}
      </div>
    </div>
  );
}

