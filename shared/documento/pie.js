/**
 * Pie de página: texto con formato más «Página X de Y». Las plantillas anteriores al contrato 2.3.0
 * (`lemaOficial`, `direccion`, `telefonos`) se convierten con `contenidoDelPie`.
 */

/** Tamaños de letra permitidos en el pie; sin marca se usa 8 pt. */
export const TAMANOS_PIE = ['7pt', '8pt', '9pt', '10pt'];

/** Alineaciones permitidas en el pie; sin atributo se centra. */
export const ALINEACIONES_PIE = ['left', 'center', 'right'];

const parrafo = (texto, marcas) => ({
  type: 'paragraph',
  attrs: { textAlign: 'center' },
  ...(texto ? { content: [{ type: 'text', text: texto, ...(marcas ? { marks: marcas } : {}) }] } : {}),
});

/** Árbol del pie a partir de los campos anteriores al contrato 2.3.0. */
export function contenidoPieDesdeCampos(pie = {}) {
  const lineas = [
    pie.lemaOficial && parrafo(pie.lemaOficial, [{ type: 'italic' }]),
    pie.direccion && parrafo(pie.direccion),
    pie.telefonos && parrafo(pie.telefonos),
  ].filter(Boolean);
  return { type: 'doc', content: lineas.length ? lineas : [parrafo('')] };
}

/** Contenido del pie: el guardado o, si no existe, el convertido desde los campos anteriores. */
export function contenidoDelPie(pie) {
  const contenido = pie?.contenido;
  return contenido && contenido.type === 'doc' && Array.isArray(contenido.content) ? contenido : contenidoPieDesdeCampos(pie);
}
