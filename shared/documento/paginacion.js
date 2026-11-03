/**
 * Paginación en hojas Carta, igual en el editor, la vista previa y el PDF. Corta entre bloques de primer nivel:
 * un bloque que no cabe pasa entero a la hoja siguiente. El membrete va solo en la primera hoja.
 */
import { HOJA } from './estilos.js';

const mmAPx = (mm) => (mm * 96) / 25.4;

/** Alto útil de una hoja (sin márgenes superior e inferior), en px CSS. */
export const ALTO_UTIL_PX = mmAPx(
  Number.parseFloat(HOJA.alto) - Number.parseFloat(HOJA.margenes.superior) - Number.parseFloat(HOJA.margenes.inferior)
);

/** Capacidad del cuerpo en la primera hoja (con membrete) y en las demás, en px. */
export function capacidades({ altoUtil = ALTO_UTIL_PX, membrete, pie }) {
  return { altoPrimera: altoUtil - membrete - pie, altoResto: altoUtil - pie };
}

/** Reparte bloques en hojas; el margen del último bloque de cada hoja no cuenta y `salto` fuerza hoja nueva. */
export function repartirPaginas(bloques, { altoPrimera, altoResto }) {
  const paginas = [[]];
  const usados = [0];
  let capacidad = altoPrimera;
  let forzar = false;

  bloques.forEach((bloque, i) => {
    const alto = bloque.alto || 0;
    const ultima = paginas.length - 1;
    // Medio píxel de tolerancia para el redondeo de las medidas
    const noCabe = usados[ultima] + alto - (bloque.margen || 0) > capacidad + 0.5;
    if (paginas[ultima].length > 0 && (forzar || noCabe)) {
      paginas.push([]);
      usados.push(0);
      capacidad = altoResto;
    }
    paginas[paginas.length - 1].push(i);
    usados[usados.length - 1] += alto;
    forzar = Boolean(bloque.salto);
  });

  return { paginas, usados };
}

/**
 * Mide los bloques de la hoja inicial, los reparte en hojas y numera los pies; al terminar marca
 * `data-paginado="listo"`. Se serializa con `toString()`, así que no puede llamar a otras funciones del
 * módulo (el minificador las renombra): `repartir` llega como argumento.
 */
export function paginarDocumento(doc, geometria, repartir) {
  const raiz = doc.querySelector('.doc-paginas');
  if (!raiz || raiz.dataset.paginado === 'listo') return 0;
  const primera = raiz.querySelector('.doc-pagina');
  const cuerpo = primera.querySelector('.doc-pagina-cuerpo');

  const altoExterno = (el, { arriba = true, abajo = true } = {}) => {
    if (!el) return 0;
    const cs = doc.defaultView.getComputedStyle(el);
    return (
      el.getBoundingClientRect().height +
      (arriba ? Number.parseFloat(cs.marginTop) || 0 : 0) +
      (abajo ? Number.parseFloat(cs.marginBottom) || 0 : 0)
    );
  };

  const membrete = altoExterno(primera.querySelector('.doc-encabezado'));
  const pie = altoExterno(primera.querySelector('.doc-pie'));
  const bloquesEl = Array.from(cuerpo.children);
  const bloques = bloquesEl.map((el) => {
    const margen = Number.parseFloat(doc.defaultView.getComputedStyle(el).marginBottom) || 0;
    return { alto: altoExterno(el, { arriba: false }), margen, salto: el.classList.contains('doc-salto-pagina') };
  });

  const { paginas } = repartir(bloques, {
    altoPrimera: geometria.altoUtil - membrete - pie,
    altoResto: geometria.altoUtil - pie,
  });

  // Plantilla de las hojas siguientes: misma hoja y marcas de agua, sin membrete y con el cuerpo vacío
  const plantilla = primera.cloneNode(true);
  plantilla.querySelector('.doc-encabezado')?.remove();
  plantilla.querySelector('.doc-pagina-cuerpo').replaceChildren();

  paginas.slice(1).forEach((indices) => {
    const hoja = plantilla.cloneNode(true);
    const destino = hoja.querySelector('.doc-pagina-cuerpo');
    indices.forEach((i) => destino.appendChild(bloquesEl[i]));
    raiz.appendChild(hoja);
  });

  const total = paginas.length;
  raiz.querySelectorAll('.doc-pagina').forEach((hoja, i) => {
    hoja.dataset.pagina = String(i + 1);
    const numero = hoja.querySelector('[data-paginacion]');
    if (numero) numero.textContent = `Página ${i + 1} de ${total}`;
  });
  raiz.dataset.paginado = 'listo';
  raiz.dataset.paginas = String(total);
  doc.defaultView.dispatchEvent(new doc.defaultView.CustomEvent('doc-paginado', { detail: { paginas: total } }));
  return total;
}

/** Script del documento: espera fuentes e imágenes y pagina. Lo ejecutan el iframe y Puppeteer. */
// Las funciones se asignan a nombres propios porque el build de producción las renombra.
export const SCRIPT_PAGINACION = `(function () {
var repartirPaginas = ${repartirPaginas.toString()};
var paginarDocumento = ${paginarDocumento.toString()};
var geometria = ${JSON.stringify({ altoUtil: ALTO_UTIL_PX })};
var imagenes = Array.prototype.map.call(document.images, function (img) {
  return img.complete ? null : new Promise(function (listo) { img.onload = img.onerror = listo; });
});
Promise.all([document.fonts ? document.fonts.ready : null].concat(imagenes)).then(function () {
  paginarDocumento(document, geometria, repartirPaginas);
});
})();`;
