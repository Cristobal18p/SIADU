/**
 * Convierte `disenoFormJson` y los datos en HTML, sin DOM ni dependencias, para el navegador y Node.
 * Solo acepta nodos, marcas y atributos del contrato y escapa todo el texto: un árbol manipulado no inyecta HTML.
 */
import { ESTILOS_DOCUMENTO, FORMATO_POR_DEFECTO, FUENTES, SANGRIA_POR_NIVEL } from './estilos.js';
import { fechaHoraPanama, valorVariable } from './formato.js';
import { SCRIPT_PAGINACION } from './paginacion.js';
import { ALINEACIONES_PIE, TAMANOS_PIE, contenidoDelPie } from './pie.js';

const ALINEACIONES = new Set(['left', 'center', 'right', 'justify']);
const INTERLINEADOS = new Set(['1.0', '1.15', '1.5']);
const TAMANOS = new Set(['11pt', '12pt']);
const TAMANOS_PIE_SET = new Set(TAMANOS_PIE);

/** Escudo de fondo en todas las hojas (docs/06 §3). */
const LOGO_ESCUDO = '/logos/escudo_up.png';

/** Marcas de estado de una solicitud (docs/06 §3); APROBADO no lleva marca. */
const MARCAS_ESTADO = {
  PENDIENTE: { clase: 'pendiente', texto: 'Documento en trámite — Sin validez oficial' },
  RECHAZADO: { clase: 'rechazado', texto: 'Solicitud rechazada' },
};

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa texto para HTML (contenido y atributos). */
export const escapar = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

const entero = (valor, minimo) => {
  const n = Number.parseInt(valor, 10);
  return Number.isInteger(n) && n >= minimo ? n : null;
};

const estilo = (reglas) => {
  const texto = reglas.filter(Boolean).join('; ');
  return texto ? ` style="${escapar(texto)}"` : '';
};

/** Reglas de bloque comunes de paragraph y heading. */
const estiloBloque = (attrs = {}) => {
  const nivel = entero(attrs.indent, 1);
  return estilo([
    ALINEACIONES.has(attrs.textAlign) && `text-align: ${attrs.textAlign}`,
    INTERLINEADOS.has(attrs.lineHeight) && `line-height: ${attrs.lineHeight}`,
    nivel && `margin-left: calc(${nivel} * ${SANGRIA_POR_NIVEL})`,
  ]);
};

/** Aplica las marcas permitidas a un fragmento de texto ya escapado. */
function aplicarMarcas(html, marcas = [], tamanos = TAMANOS) {
  return marcas.reduce((acc, marca) => {
    switch (marca?.type) {
      case 'bold':
        return `<strong>${acc}</strong>`;
      case 'italic':
        return `<em>${acc}</em>`;
      case 'underline':
        return `<u>${acc}</u>`;
      case 'textStyle': {
        const { fontFamily, fontSize } = marca.attrs || {};
        const reglas = estilo([
          FUENTES[fontFamily] && `font-family: ${FUENTES[fontFamily]}`,
          tamanos.has(fontSize) && `font-size: ${fontSize}`,
        ]);
        return reglas ? `<span${reglas}>${acc}</span>` : acc;
      }
      default:
        return acc;
    }
  }, html);
}

/** Nodo del árbol TipTap a HTML. */
function nodoHtml(nodo, ctx) {
  if (!nodo || typeof nodo !== 'object') return '';
  const hijos = () => (Array.isArray(nodo.content) ? nodo.content.map((h) => nodoHtml(h, ctx)).join('') : '');
  const attrs = nodo.attrs || {};

  switch (nodo.type) {
    case 'doc':
      return hijos();
    case 'text':
      return aplicarMarcas(escapar(nodo.text), nodo.marks);
    case 'hardBreak':
      return '<br>';
    case 'paragraph': {
      const contenido = hijos();
      // Un párrafo vacío conserva su línea, como en el editor
      return `<p${estiloBloque(attrs)}>${contenido || '<br>'}</p>`;
    }
    case 'heading': {
      const nivel = attrs.level === 2 ? 2 : 1;
      return `<h${nivel}${estiloBloque(attrs)}>${hijos() || '<br>'}</h${nivel}>`;
    }
    case 'bulletList':
      return `<ul>${hijos()}</ul>`;
    case 'orderedList': {
      const inicio = entero(attrs.start, 1);
      return `<ol${inicio && inicio !== 1 ? ` start="${inicio}"` : ''}>${hijos()}</ol>`;
    }
    case 'listItem':
      return `<li>${hijos()}</li>`;
    case 'table':
      return `<table><tbody>${hijos()}</tbody></table>`;
    case 'tableRow':
      return `<tr>${hijos()}</tr>`;
    case 'tableHeader':
    case 'tableCell': {
      const etiqueta = nodo.type === 'tableHeader' ? 'th' : 'td';
      const colspan = entero(attrs.colspan, 2);
      const rowspan = entero(attrs.rowspan, 2);
      const ancho = Array.isArray(attrs.colwidth) ? entero(attrs.colwidth[0], 1) : null;
      return (
        `<${etiqueta}${colspan ? ` colspan="${colspan}"` : ''}${rowspan ? ` rowspan="${rowspan}"` : ''}` +
        `${estilo([ancho && `width: ${ancho}px`])}>${hijos()}</${etiqueta}>`
      );
    }
    case 'pageBreak':
      return '<div class="doc-salto-pagina"></div>';
    case 'variable':
      return variableHtml(attrs.id, ctx);
    case 'signatureBlock':
      return firmasHtml(ctx.pasos, { recurso: ctx.recurso });
    default:
      // Nodo no permitido por el contrato: se conserva su texto, no su forma
      return hijos();
  }
}

/** Texto de una variable: del formulario (`datos`) o automática (`sistema`). Vacío si no hay valor. */
function variableHtml(id, ctx) {
  if (typeof id !== 'string' || !id) return '';
  const variable = ctx.variablesPorId.get(id);
  const texto = variable ? valorVariable(variable, ctx.datos[id], ctx.datos) : ctx.sistema[id] ?? '';
  if (!texto) return '';
  const clase = ctx.ejemplo ? 'doc-variable doc-variable-ejemplo' : 'doc-variable';
  return `<span class="${clase}" data-variable="${escapar(id)}">${escapar(texto)}</span>`;
}

/**
 * Bloque de firmas: una casilla por paso con `reqFirma`; los pendientes muestran el titular y el cargo esperados.
 * Cada fila es una pieza `.doc-firmas` para que la paginación corte entre filas.
 */
export function firmasHtml(pasosDocumento = [], { recurso = (url) => url } = {}) {
  const ctx = { recurso };
  const pasos = (Array.isArray(pasosDocumento) ? pasosDocumento : [])
    .filter((p) => p && p.reqFirma !== false)
    .slice()
    .sort((a, b) => (a.secuencia ?? 0) - (b.secuencia ?? 0));

  if (pasos.length === 0) {
    return '<div class="doc-firmas"><div class="doc-firmas-vacio">Firmas según el flujo de aprobación</div></div>';
  }

  const casillas = pasos.map((paso) => {
    const aprobado = paso.estado === 'APROBADO';
    const imagen =
      aprobado && paso.firmaUrl
        ? `<div class="doc-firma-imagen"><img src="${escapar(ctx.recurso(paso.firmaUrl))}" alt=""></div>`
        : aprobado
          ? '<div class="doc-firma-imagen"></div>'
          : '<div class="doc-firma-pendiente">[Pendiente de Aprobación y Firma]</div>';
    const fecha = aprobado && paso.fechaAccion ? fechaHoraPanama(paso.fechaAccion) : '';
    return (
      '<div class="doc-firma">' +
      imagen +
      '<div class="doc-firma-linea"></div>' +
      (paso.titular ? `<div class="doc-firma-nombre">${escapar(paso.titular)}</div>` : '') +
      `<div class="doc-firma-cargo">${escapar(paso.nombreCargo ?? '')}</div>` +
      (paso.area ? `<div class="doc-firma-area">${escapar(paso.area)}</div>` : '') +
      (fecha ? `<div class="doc-firma-fecha">Aprobado el ${escapar(fecha)}</div>` : '') +
      '</div>'
    );
  });
  const filas = [];
  for (let i = 0; i < casillas.length; i += 2) filas.push(casillas.slice(i, i + 2).join(''));
  return filas
    .map((fila, i) => {
      const clases = ['doc-firmas', i > 0 && 'doc-firmas-continua', i < filas.length - 1 && 'doc-firmas-sigue'];
      return `<div class="${clases.filter(Boolean).join(' ')}">${fila}</div>`;
    })
    .join('');
}

/** Línea del membrete con sus `{{id}}` reemplazados; si alguno no tiene valor, la línea no se imprime. */
function lineaMembrete(texto, sistema = {}) {
  let sinValor = false;
  const resuelta = String(texto).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, id) => {
    const valor = sistema?.[id];
    if (!valor) sinValor = true;
    return valor ? String(valor).toUpperCase() : '';
  });
  return sinValor ? '' : resuelta.trim();
}

/** Membrete de la hoja; `sistema` resuelve los marcadores `{{id}}`. */
export function encabezadoHtml(encabezado, { recurso = (url) => url, sistema = {} } = {}) {
  if (!encabezado || encabezado.activo === false) return '';
  const logo = (url) =>
    `<div class="doc-encabezado-logo">${url ? `<img src="${escapar(recurso(url))}" alt="">` : ''}</div>`;
  const lineas = ['linea1', 'linea2', 'linea3', 'linea4']
    .map((k) => [k, encabezado[k] ? lineaMembrete(encabezado[k], sistema) : ''])
    .filter(([, texto]) => texto)
    .map(([k, texto]) => `<div class="doc-encabezado-${k}">${escapar(texto)}</div>`)
    .join('');
  return (
    '<header class="doc-encabezado">' +
    logo(encabezado.logoIzqUrl) +
    `<div class="doc-encabezado-lineas">${lineas}</div>` +
    logo(encabezado.logoDerUrl) +
    '</header>'
  );
}

/** Nodo del pie: solo párrafos, texto con marcas y saltos de línea (ver pie.js). */
function nodoPieHtml(nodo) {
  if (!nodo || typeof nodo !== 'object') return '';
  const hijos = () => (Array.isArray(nodo.content) ? nodo.content.map(nodoPieHtml).join('') : '');
  switch (nodo.type) {
    case 'doc':
      return hijos();
    case 'paragraph': {
      const alineacion = ALINEACIONES_PIE.includes(nodo.attrs?.textAlign) ? nodo.attrs.textAlign : 'center';
      return `<p style="text-align: ${alineacion}">${hijos() || '<br>'}</p>`;
    }
    case 'text':
      return aplicarMarcas(escapar(nodo.text), nodo.marks, TAMANOS_PIE_SET);
    case 'hardBreak':
      return '<br>';
    default:
      return hijos();
  }
}

/** Pie de la hoja con su contenido y, si está activada, la línea «Página X de Y». */
export function pieHtml(pie, { pagina = 1, total = 1 } = {}) {
  if (!pie || pie.activo === false) return '';
  return (
    '<footer class="doc-pie">' +
    `<div class="doc-pie-contenido">${nodoPieHtml(contenidoDelPie(pie))}</div>` +
    // El paginador reemplaza el texto en cada hoja; siempre ocupa una línea, así el alto del pie no cambia
    (pie.mostrarPaginacion
      ? `<div class="doc-pie-paginacion" data-paginacion>${escapar(`Página ${pagina} de ${total}`)}</div>`
      : '') +
    '</footer>'
  );
}

/** Tipografía base de `disenoFormJson.formato`; los valores fuera del contrato toman el formato por defecto. */
export function formatoHoja(formato = {}) {
  const f = { ...FORMATO_POR_DEFECTO, ...(formato || {}) };
  return {
    fontFamily: FUENTES[f.fuente] || FUENTES.Arial,
    fontSize: TAMANOS.has(f.tamano) ? f.tamano : FORMATO_POR_DEFECTO.tamano,
    lineHeight: INTERLINEADOS.has(f.interlineado) ? f.interlineado : FORMATO_POR_DEFECTO.interlineado,
  };
}

/**
 * HTML de las hojas, sin `<html>` ni estilos. `estado` define la marca de agua, `ejemplo` resalta las variables
 * y `recurso` resuelve las rutas de logos y firmas.
 */
export function renderDocumento({
  diseno,
  variables = [],
  datos = {},
  sistema = {},
  pasos = [],
  estado = null,
  ejemplo = false,
  recurso = (url) => url,
}) {
  const ctx = {
    variablesPorId: new Map((variables || []).map((v) => [v.id, v])),
    datos: datos || {},
    sistema: sistema || {},
    pasos: Array.isArray(pasos) ? pasos : [],
    ejemplo,
    recurso,
  };

  const { fontFamily, fontSize, lineHeight } = formatoHoja(diseno?.formato);
  const estiloHoja = estilo([`font-family: ${fontFamily}`, `font-size: ${fontSize}`, `line-height: ${lineHeight}`]);
  const marca = MARCAS_ESTADO[estado];

  return (
    // Todo el cuerpo va en la primera hoja; `paginarDocumento` lo reparte en hojas Carta al cargar
    `<div class="doc-paginas"${estiloHoja}>` +
    '<section class="doc-pagina" data-pagina="1">' +
    `<div class="doc-marca-escudo" style="background-image: url('${escapar(recurso(LOGO_ESCUDO))}')"></div>` +
    (marca ? `<div class="doc-marca-estado ${marca.clase}">${escapar(marca.texto)}</div>` : '') +
    '<div class="doc-pagina-contenido">' +
    encabezadoHtml(diseno?.encabezado, ctx) +
    `<div class="doc-cuerpo doc-pagina-cuerpo">${nodoHtml(diseno?.cuerpoDocumento, ctx)}</div>` +
    pieHtml(diseno?.piePagina) +
    '</div></section></div>'
  );
}

/**
 * Página completa para `<iframe srcdoc>` o `page.setContent()`. Puppeteer debe esperar `data-paginado="listo"`
 * antes de imprimir.
 */
export function documentoHtml(opciones) {
  const fondo = /^#[0-9a-f]{3,8}$/i.test(opciones.fondo ?? '') ? opciones.fondo : '#ffffff';
  // `nonce`: el de la política de contenido de la página que aloja el iframe (el PDF no lo necesita)
  const nonce = opciones.nonce ? ` nonce="${escapar(opciones.nonce)}"` : '';
  return (
    '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    `<title>${escapar(opciones.titulo ?? 'Documento oficial')}</title>` +
    `<style>html,body{margin:0;background:${fondo}}${ESTILOS_DOCUMENTO}</style>` +
    `</head><body>${renderDocumento(opciones)}<script${nonce}>${SCRIPT_PAGINACION}</script></body></html>`
  );
}
