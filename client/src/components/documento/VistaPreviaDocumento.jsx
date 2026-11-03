import { useEffect, useMemo, useRef, useState } from 'react';
import { documentoHtml } from '@siadu/documento';

/** Ancho del iframe: hoja Carta a 96 ppp más un margen a cada lado. */
const ANCHO_HOJA_PX = 816;
const MARGEN_PX = 24;
const ANCHO_IFRAME_PX = ANCHO_HOJA_PX + MARGEN_PX * 2;
const FONDO = '#e2e8f0'; // mismo gris que el lienzo del editor
// Constantes para que los valores por defecto no regeneren el documento en cada render
const SIN_LISTA = [];
const SIN_DATOS = {};
// Nonce de la política de contenido; sin él, el script del iframe se bloquea
const NONCE_META = typeof document === 'undefined' ? null : document.querySelector('meta[name="csp-nonce"]')?.content;
const NONCE_CSP = NONCE_META && NONCE_META !== '__CSP_NONCE__' ? NONCE_META : undefined;

/**
 * Vista previa del documento oficial en un iframe, con el mismo motor que genera el PDF.
 * Se ajusta al ancho disponible y crece con el alto del documento.
 *
 * @param {Object} props
 * @param {Object} props.diseno - disenoFormJson
 * @param {Array} [props.variables] - variableFormJson.variables
 * @param {Object} [props.datos] - datosJson
 * @param {Object} [props.sistema] - variablesSistema
 * @param {Array} [props.pasos] - pasosDocumento
 * @param {'PENDIENTE'|'APROBADO'|'RECHAZADO'|null} [props.estado] - Marca de agua
 * @param {boolean} [props.ejemplo] - Resalta las variables
 * @param {string} [props.titulo] - Nombre accesible del documento
 * @param {(paginas: number) => void} [props.onPaginado] - Número de hojas al terminar de paginar
 * @param {string} [props.alto] - Alto fijo del visor (CSS); sin él, crece con el documento
 * @param {number} [props.escala] - Escala fija; sin ella, se ajusta al ancho
 */
export default function VistaPreviaDocumento({
  diseno,
  variables = SIN_LISTA,
  datos = SIN_DATOS,
  sistema = SIN_DATOS,
  pasos = SIN_LISTA,
  estado = null,
  ejemplo = false,
  titulo = 'Documento oficial',
  onPaginado,
  alto: altoVisor,
  escala: escalaFija,
}) {
  const contenedorRef = useRef(null);
  const iframeRef = useRef(null);
  const [escalaAjuste, setEscala] = useState(1);
  const escala = escalaFija ?? escalaAjuste;
  const [alto, setAlto] = useState(0);
  const [listo, setListo] = useState(false);
  const onPaginadoRef = useRef(onPaginado);
  onPaginadoRef.current = onPaginado;

  const html = useMemo(
    () => documentoHtml({ diseno, variables, datos, sistema, pasos, estado, ejemplo, titulo, fondo: FONDO, nonce: NONCE_CSP }),
    [diseno, variables, datos, sistema, pasos, estado, ejemplo, titulo]
  );

  // Cada documento nuevo se vuelve a paginar
  useEffect(() => setListo(false), [html]);

  // Ajuste al ancho del contenedor
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return undefined;
    const observador = new ResizeObserver(() => setEscala(Math.min(1, el.clientWidth / ANCHO_IFRAME_PX)));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  /** Espera a que el iframe termine de paginar y toma su alto. */
  const alCargar = () => {
    const ventana = iframeRef.current?.contentWindow;
    const doc = ventana?.document;
    const raiz = doc?.querySelector('.doc-paginas');
    if (!raiz) return;
    const terminar = () => {
      setAlto(doc.documentElement.scrollHeight);
      setListo(true);
      onPaginadoRef.current?.(Number(raiz.dataset.paginas) || 1);
    };
    if (raiz.dataset.paginado === 'listo') terminar();
    else ventana.addEventListener('doc-paginado', terminar, { once: true });
  };

  return (
    <div
      ref={contenedorRef}
      className="relative w-full rounded-lg"
      // Con alto fijo, el desplazamiento ocurre dentro del visor
      style={{
        background: FONDO,
        ...(altoVisor
          ? { height: altoVisor, overflowX: escalaFija ? 'auto' : 'hidden', overflowY: 'auto' }
          : { overflow: 'hidden' }),
      }}
    >
      {/* Ocupa el tamaño escalado */}
      <div
        className="mx-auto overflow-hidden"
        // Recorta la caja sin escalar del iframe
        style={{ width: ANCHO_IFRAME_PX * escala, height: alto ? (alto + MARGEN_PX * 2) * escala : 480 }}
      >
        <iframe
          ref={iframeRef}
          title={titulo}
          srcDoc={html}
          onLoad={alCargar}
          scrolling="no"
          className="block border-0"
          style={{
            width: ANCHO_IFRAME_PX,
            height: alto || 480,
            marginTop: MARGEN_PX * escala,
            transform: `scale(${escala})`,
            transformOrigin: 'top left',
            visibility: listo ? 'visible' : 'hidden',
          }}
        />
      </div>
      {!listo && (
        <p role="status" className="absolute inset-x-0 top-6 text-center text-sm text-slate-500">
          Preparando la vista previa…
        </p>
      )}
    </div>
  );
}
