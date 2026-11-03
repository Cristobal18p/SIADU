import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { AlertTriangle, Braces, MoveHorizontal, ZoomIn, ZoomOut } from 'lucide-react';
import { ESTILOS_DOCUMENTO, formatoHoja, pieHtml } from '@siadu/documento';
import useMediaQuery from '../../hooks/useMediaQuery';
import { pasosDelDocumento, tieneBloqueFirmas } from '../../utils/plantillas';
import { extensionesDocumento, extensionesPie } from './schema/extensiones';
import BarraHerramientas from './toolbar/BarraHerramientas';
import PanelLateral from './panels/PanelLateral';
import MenuSugerencias from './MenuSugerencias';
import MembreteEditable from './MembreteEditable';
import VistaPreviaFormulario from './VistaPreviaFormulario';
import { refrescarVariables } from './nodes/Variable';
import { refrescarFirmas } from './nodes/bloques';
import { insertarVariable, irAVariable, quitarDelDocumento, renombrarEnDocumento, seleccionConvertible } from './comandosVariables';
import { variableNueva } from '../../utils/variables';
import './editor.css';

/** Hoja Carta a 96 ppp: 8.5 × 11 in. */
const ANCHO_HOJA_PX = 816;
const ALTO_PAGINA_PX = 1056;

/** Alto externo de un elemento (con márgenes) sin el zoom del lienzo. */
const altoExterno = (el, escala) => {
  if (!el) return 0;
  const cs = getComputedStyle(el);
  return (
    el.getBoundingClientRect().height / escala +
    (Number.parseFloat(cs.marginTop) || 0) +
    (Number.parseFloat(cs.marginBottom) || 0)
  );
};
const ZOOM_MIN = 0.5;
const ZOOM_AJUSTE_MIN = 0.3;
const ZOOM_MAX = 1.5;
const PASO_ZOOM = 0.1;

const limitarZoom = (z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));

// Props estables del menú «Convertir en variable»: si cambian, el menú reenvía sus opciones al editor
const mostrarConvertir = ({ editor: e, view }) => e.isEditable && view.hasFocus() && seleccionConvertible(e) !== null;
const menuEnBody = () => document.body;
const OPCIONES_MENU = { placement: 'top' };

/** Botón pequeño de la barra de estado. */
function BotonEstado({ icon: Icon, etiqueta, disabled, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      title={etiqueta}
      className="flex items-center gap-1 p-1 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
      {children}
    </button>
  );
}

/**
 * Editor del documento (paso 2 del constructor): barra de herramientas, hojas Carta, panel lateral y zoom.
 * Usa los estilos y la paginación del motor compartido; entrega el árbol en `onCambio({ cuerpoDocumento })`.
 *
 * @param {Object} props
 * @param {Object} props.borrador - Borrador del constructor
 * @param {(cambios: Object) => void} props.onCambio
 * @param {boolean} props.soloLectura
 * @param {Object<number, string>} [props.erroresFlujo] - Errores de los pasos del flujo, por índice
 * @param {{ cargos: Array, cargando: boolean, error: boolean, recargar: () => void }} props.catalogoCargos
 */
export default function EditorDocumento({ borrador, onCambio, soloLectura, erroresFlujo = {}, catalogoCargos }) {
  const pantallaAmplia = useMediaQuery('(min-width: 1024px)');
  const [panelAbierto, setPanelAbierto] = useState(pantallaAmplia);
  const [zoom, setZoom] = useState(1);
  const [altoHoja, setAltoHoja] = useState(ALTO_PAGINA_PX);
  const [contenidoInvalido, setContenidoInvalido] = useState(false);
  const [paginacion, setPaginacion] = useState({ total: 1, rellenoFinal: 0 });
  const [enPie, setEnPie] = useState(false); // la barra de herramientas actúa sobre el pie
  const [pestana, setPestana] = useState('formulario');
  const [editando, setEditando] = useState(null); // id de la variable abierta en el panel
  const [sugerencia, setSugerencia] = useState(null); // buscador «@»: { desde, hasta, consulta }
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const teclaSugerenciaRef = useRef(() => false);
  const lienzoRef = useRef(null);
  const hojaRef = useRef(null);
  const membreteRef = useRef(null);
  const pieRef = useRef(null);

  // Datos que lee la extensión de paginación
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const pieDatosRef = useRef(borrador.piePagina);
  pieDatosRef.current = borrador.piePagina;
  // Bloque de firmas: una casilla por paso con firma
  const pasosFirmas = pasosDelDocumento(borrador.pasosFlujo, catalogoCargos.cargos);
  const pasosFirmasRef = useRef(pasosFirmas);
  pasosFirmasRef.current = pasosFirmas;
  const clavePasos = JSON.stringify(pasosFirmas);

  // Cambios de alto que no tocan el árbol; al cambiar, se vuelven a repartir las hojas
  const claveMarco = JSON.stringify([borrador.encabezado, borrador.piePagina, borrador.formato, clavePasos]);
  const claveMarcoRef = useRef(claveMarco);
  claveMarcoRef.current = claveMarco;

  // Las extensiones se crean una vez y leen los datos por referencia
  const variablesRef = useRef(borrador.variables);
  variablesRef.current = borrador.variables;
  const onCambioRef = useRef(onCambio);
  onCambioRef.current = onCambio;

  const editor = useEditor({
    extensions: extensionesDocumento({
      etiquetaVariable: (id) => variablesRef.current.find((v) => v.id === id)?.etiqueta,
      pasosFirmas: () => pasosFirmasRef.current,
      sugerencias: {
        alCambiar: (s) =>
          setSugerencia((actual) =>
            s && actual && s.desde === actual.desde && s.hasta === actual.hasta && s.consulta === actual.consulta ? actual : s
          ),
        alTecla: (evento) => teclaSugerenciaRef.current(evento),
      },
      paginacion: {
        medirMarco: () => {
          const escala = zoomRef.current;
          return {
            membrete: altoExterno(membreteRef.current?.querySelector('.doc-encabezado'), escala),
            pie: altoExterno(pieRef.current?.querySelector('.doc-pie'), escala),
            escala,
            clave: claveMarcoRef.current,
          };
        },
        crearCorte: ({ pagina, total, relleno }) => {
          const corte = document.createElement('div');
          corte.className = 'doc-editor-corte';
          corte.contentEditable = 'false';
          corte.setAttribute('aria-hidden', 'true');
          corte.innerHTML =
            `<div style="height: ${relleno}px"></div>${pieHtml(pieDatosRef.current, { pagina, total })}` +
            '<div class="doc-editor-corte-margen-inferior"></div><div class="doc-editor-corte-separacion"></div>' +
            '<div class="doc-editor-corte-margen-superior"></div>';
          return corte;
        },
        alPaginar: (datos) =>
          setPaginacion((actual) =>
            actual.total === datos.total && actual.rellenoFinal === datos.rellenoFinal ? actual : datos
          ),
      },
    }),
    content: borrador.cuerpoDocumento,
    editable: !soloLectura,
    // La barra de herramientas lee el estado del editor en cada render
    shouldRerenderOnTransaction: true,
    // Un árbol con nodos no admitidos se avisa y no se edita
    enableContentCheck: true,
    onContentError: () => setContenidoInvalido(true),
    editorProps: {
      attributes: {
        class: 'doc-cuerpo',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Contenido del documento',
      },
    },
    onUpdate: ({ editor: e }) => onCambioRef.current({ cuerpoDocumento: e.getJSON() }),
    onFocus: () => setEnPie(false),
  });

  // Pie de página: texto con formato, editable en la hoja
  const editorPie = useEditor({
    extensions: extensionesPie(),
    content: borrador.piePagina?.contenido ?? null,
    editable: !soloLectura,
    shouldRerenderOnTransaction: true,
    enableContentCheck: true,
    onContentError: () => setContenidoInvalido(true),
    editorProps: {
      attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Pie de página' },
    },
    onUpdate: ({ editor: e }) =>
      onCambioRef.current({ piePagina: { ...pieDatosRef.current, contenido: e.getJSON() } }),
    onFocus: () => setEnPie(true),
  });

  useEffect(() => {
    editor?.setEditable(!soloLectura && !contenidoInvalido);
    editorPie?.setEditable(!soloLectura && !contenidoInvalido);
  }, [editor, editorPie, soloLectura, contenidoInvalido]);

  /** Lleva el cursor al pie de la última hoja. */
  const editarPie = () => {
    if (!editorPie || soloLectura || contenidoInvalido) return;
    editorPie.commands.focus('end');
    pieRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  /** Lleva el cursor a la primera línea del membrete. */
  const editarMembrete = () => {
    if (soloLectura || contenidoInvalido) return;
    const linea = membreteRef.current?.querySelector('.doc-membrete-linea');
    linea?.focus();
    linea?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  /** Agrega o quita el membrete, el pie y la numeración. */
  const alMarco = (accion) => {
    const encabezado = borrador.encabezado || {};
    const pie = borrador.piePagina || {};
    if (accion === 'agregarMembrete') {
      onCambio({ encabezado: { ...encabezado, activo: true } });
      requestAnimationFrame(editarMembrete);
    } else if (accion === 'quitarMembrete') {
      onCambio({ encabezado: { ...encabezado, activo: false } });
      editor?.commands.focus();
    } else if (accion === 'agregarPie') {
      onCambio({ piePagina: { ...pie, activo: true } });
      requestAnimationFrame(editarPie);
    } else if (accion === 'quitarPie') {
      onCambio({ piePagina: { ...pie, activo: false } });
      setEnPie(false);
      editor?.commands.focus();
    } else if (accion === 'agregarPaginacion' || accion === 'alternarPaginacion') {
      onCambio({ piePagina: { ...pie, activo: true, mostrarPaginacion: accion === 'agregarPaginacion' || !pie.mostrarPaginacion } });
    }
  };
  const marco = {
    membrete: borrador.encabezado?.activo !== false,
    pie: borrador.piePagina?.activo !== false,
    paginacion: borrador.piePagina?.activo !== false && Boolean(borrador.piePagina?.mostrarPaginacion),
  };

  // Un clic en el pie de cualquier hoja edita el pie
  const alPresionarHoja = (e) => {
    if (e.target.closest?.('.doc-editor-corte .doc-pie')) {
      e.preventDefault();
      editarPie();
    } else if (e.target.closest?.('[data-bloque-firmas]')) {
      // El bloque de firmas abre la pestaña del flujo
      setPanelAbierto(true);
      setPestana('aprobacion');
    }
  };

  // ---------- bloque de firmas y flujo

  /** Posición del bloque de firmas en el documento, o null. */
  const posicionFirmas = () => {
    let posicion = null;
    editor?.state.doc.forEach((nodo, pos) => {
      if (posicion === null && nodo.type.name === 'signatureBlock') posicion = pos;
    });
    return posicion;
  };

  const ubicarFirmas = () => {
    const pos = posicionFirmas();
    if (pos !== null) editor.chain().focus().setNodeSelection(pos).scrollIntoView().run();
  };

  /** Agrega el bloque de firmas al final del documento. */
  const insertarFirmasAlFinal = () => {
    if (!editor || posicionFirmas() !== null) return;
    editor.chain().insertContentAt(editor.state.doc.content.size, { type: 'signatureBlock' }).run();
    ubicarFirmas();
  };

  // Si el flujo tiene errores, se abre su pestaña y se enfoca el primero
  const claveErroresFlujo = Object.keys(erroresFlujo).join(',');
  useEffect(() => {
    if (!claveErroresFlujo) return;
    setPanelAbierto(true);
    setPestana('aprobacion');
    requestAnimationFrame(() => document.getElementById(`flujo-paso-${claveErroresFlujo.split(',')[0]}`)?.focus());
  }, [claveErroresFlujo]);

  // ---------- variables

  // Cambiar una definición redibuja las cápsulas sin tocar el árbol
  useEffect(() => refrescarVariables(editor), [editor, borrador.variables]);

  // Cambio de flujo o de cargos: se redibuja el bloque de firmas y se vuelve a medir
  useLayoutEffect(() => refrescarFirmas(editor), [editor, clavePasos]);

  /** Fija la lista de variables y actualiza la referencia antes de redibujar. */
  const fijarVariables = (lista) => {
    variablesRef.current = lista;
    onCambioRef.current({ variables: lista });
  };

  const abrirConfiguracion = (id) => {
    setPanelAbierto(true);
    setPestana('formulario');
    setEditando(id);
  };

  const acciones = {
    insertar: (id) => insertarVariable(editor, id),
    /** Crea una variable de texto corto, la inserta y abre su configuración. */
    nueva: (etiqueta, rango, { enfocar = false } = {}) => {
      if (!editor) return;
      const variable = variableNueva(etiqueta, variablesRef.current);
      fijarVariables([...variablesRef.current, variable]);
      insertarVariable(editor, variable.id, rango);
      abrirConfiguracion(variable.id);
      if (enfocar) {
        // Variable nueva: queda lista para escribir su etiqueta
        requestAnimationFrame(() => {
          const campo = document.getElementById(`var-${variable.id}-etiqueta`);
          campo?.focus();
          campo?.select();
        });
      }
    },
    actualizar: (variable) => fijarVariables(variablesRef.current.map((v) => (v.id === variable.id ? variable : v))),
    renombrar: (viejo, nuevo) => {
      fijarVariables(variablesRef.current.map((v) => (v.id === viejo ? { ...v, id: nuevo } : v)));
      renombrarEnDocumento(editor, viejo, nuevo);
      setEditando((actual) => (actual === viejo ? nuevo : actual));
    },
    eliminar: (id) => {
      quitarDelDocumento(editor, id);
      fijarVariables(variablesRef.current.filter((v) => v.id !== id));
      setEditando(null);
    },
    ubicar: (id) => irAVariable(editor, id),
  };

  const elegirSugerencia = (id) => {
    if (!sugerencia) return;
    insertarVariable(editor, id, { from: sugerencia.desde, to: sugerencia.hasta });
  };
  const crearDesdeSugerencia = (etiqueta) => {
    if (!sugerencia) return;
    acciones.nueva(etiqueta, { from: sugerencia.desde, to: sugerencia.hasta });
  };

  const convertirSeleccion = () => {
    const seleccion = seleccionConvertible(editor);
    if (seleccion) acciones.nueva(seleccion.texto, { from: seleccion.desde, to: seleccion.hasta });
  };

  const bloqueado = soloLectura || contenidoInvalido;

  // Cambios en membrete, pie, tipografía o firmas recalculan los cortes de hoja
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta('addToHistory', false));
  }, [editor, claveMarco]);

  // Alto de la hoja sin zoom, para el lienzo y el conteo de páginas
  useEffect(() => {
    const hoja = hojaRef.current;
    if (!hoja) return undefined;
    const observador = new ResizeObserver(() => setAltoHoja(hoja.offsetHeight));
    observador.observe(hoja);
    return () => observador.disconnect();
  }, []);

  // «Ajustar» puede bajar del zoom mínimo para que la hoja quepa entera
  const ajustarAlAncho = () => {
    const ancho = lienzoRef.current?.clientWidth ?? ANCHO_HOJA_PX;
    const ajuste = Math.round(((ancho - 48) / ANCHO_HOJA_PX) * 100) / 100;
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_AJUSTE_MIN, ajuste)));
  };

  // En pantallas angostas la hoja abre ajustada al ancho
  useEffect(() => {
    if (!pantallaAmplia) ajustarAlAncho();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir el editor
  }, []);

  const texto = editor?.state.doc.textContent.trim() ?? '';
  const palabras = texto ? texto.split(/\s+/).length : 0;
  const paginas = paginacion.total;

  return (
    <div className="h-full flex flex-col min-h-0">
      <style>{ESTILOS_DOCUMENTO}</style>

      <BarraHerramientas
        editor={enPie ? editorPie : editor}
        modo={enPie ? 'pie' : 'cuerpo'}
        formato={borrador.formato}
        soloLectura={soloLectura || contenidoInvalido}
        panelAbierto={panelAbierto}
        onAlternarPanel={() => setPanelAbierto((a) => !a)}
        onVolverAlCuerpo={() => editor?.commands.focus()}
        marco={marco}
        onMarco={alMarco}
        variables={{
          nueva: () => acciones.nueva('', undefined, { enfocar: true }),
          convertir: convertirSeleccion,
          puedeConvertir: seleccionConvertible(editor) !== null,
        }}
      />

      {contenidoInvalido && (
        <div role="alert" className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-sm text-amber-900">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          El documento guardado tiene elementos que el editor no reconoce. Se muestra en solo lectura para no perder
          información.
        </div>
      )}

      <div className="relative flex-1 min-h-0 flex">
        <div ref={lienzoRef} className="doc-editor-lienzo flex-1 min-w-0 overflow-auto">
          <div className="p-6">
            {/* Ocupa el tamaño escalado */}
            <div className="mx-auto" style={{ width: ANCHO_HOJA_PX * zoom, height: altoHoja * zoom }}>
              <div ref={hojaRef} style={{ width: ANCHO_HOJA_PX, transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                {/* Clic en el pie de cualquier hoja: edita el pie */}
                <article
                  className={`doc-hoja doc-hoja-editor ${soloLectura || contenidoInvalido ? "" : "doc-hoja-editable"}`}
                  style={formatoHoja(borrador.formato)}
                  onMouseDown={alPresionarHoja}
                >
                  {/* Membrete: solo en la primera hoja */}
                  <div ref={membreteRef} onFocus={() => setEnPie(false)}>
                    <MembreteEditable
                      encabezado={borrador.encabezado}
                      onCambio={(encabezado) => onCambioRef.current({ encabezado })}
                      soloLectura={soloLectura || contenidoInvalido}
                      onIrAlCuerpo={() => editor?.commands.focus('start')}
                      onQuitar={() => alMarco('quitarMembrete')}
                    />
                  </div>
                  <EditorContent editor={editor} />
                  {/* Cierre de la última hoja y su pie */}
                  <div aria-hidden="true" style={{ height: paginacion.rellenoFinal }} />
                  <div ref={pieRef}>
                    {borrador.piePagina?.activo !== false && (
                      <footer className={`doc-pie ${soloLectura || contenidoInvalido ? '' : 'doc-pie-editable'}`}>
                        <EditorContent editor={editorPie} className="doc-pie-contenido" />
                        {borrador.piePagina?.mostrarPaginacion && (
                          <div className="doc-pie-paginacion" data-paginacion>
                            Página {paginas} de {paginas}
                          </div>
                        )}
                      </footer>
                    )}
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>

        {/* En pantallas angostas el panel se superpone a la hoja */}
        {panelAbierto && !pantallaAmplia && (
          <div aria-hidden="true" className="absolute inset-0 z-20 bg-slate-900/30" onClick={() => setPanelAbierto(false)} />
        )}
        {panelAbierto && (
          <div className={pantallaAmplia ? 'flex min-h-0' : 'absolute inset-y-0 right-0 z-30 flex min-h-0 max-w-[90vw] shadow-2xl'}>
          <PanelLateral
            editor={editor}
            borrador={borrador}
            soloLectura={bloqueado}
            pestana={pestana}
            onPestana={setPestana}
            editando={editando}
            onEditar={setEditando}
            acciones={{ ...acciones, nueva: () => acciones.nueva('', undefined, { enfocar: true }) }}
            onVistaPrevia={() => setVistaPrevia(true)}
            onCambio={onCambio}
            aprobacion={{
              catalogo: catalogoCargos,
              errores: erroresFlujo,
              hayBloqueFirmas: tieneBloqueFirmas(borrador.cuerpoDocumento),
              onInsertarFirmas: insertarFirmasAlFinal,
              onUbicarFirmas: ubicarFirmas,
            }}
          />
          </div>
        )}
      </div>

      {/* Convertir la selección en variable; se monta en el body para no escalarse con la hoja */}
      {editor && !bloqueado && (
        <BubbleMenu
          editor={editor}
          pluginKey="convertirEnVariable"
          shouldShow={mostrarConvertir}
          appendTo={menuEnBody}
          options={OPCIONES_MENU}
        >
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={convertirSeleccion}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-lg hover:bg-slate-700 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Braces className="w-3.5 h-3.5" aria-hidden="true" />
            Convertir en variable
          </button>
        </BubbleMenu>
      )}

      {editor && sugerencia && !bloqueado && (
        <MenuSugerencias
          editor={editor}
          estado={sugerencia}
          variables={borrador.variables}
          teclaRef={teclaSugerenciaRef}
          onElegir={elegirSugerencia}
          onCrear={crearDesdeSugerencia}
        />
      )}

      {vistaPrevia && (
        <VistaPreviaFormulario borrador={borrador} onClose={() => setVistaPrevia(false)} />
      )}

      <div className="h-9 bg-white border-t border-slate-200 px-4 flex items-center gap-4 text-xs text-slate-600 shrink-0">
        <span>
          {paginas} {paginas === 1 ? 'hoja' : 'hojas'} Carta
        </span>
        <span>
          {palabras} {palabras === 1 ? 'palabra' : 'palabras'}
        </span>
        <span className="flex-1" />
        <div className="flex items-center gap-1">
          <BotonEstado icon={ZoomOut} etiqueta="Alejar" disabled={zoom <= ZOOM_MIN} onClick={() => setZoom((z) => limitarZoom(z - PASO_ZOOM))} />
          <output aria-live="polite" className="w-11 text-center tabular-nums font-medium text-slate-700">
            {Math.round(zoom * 100)}%
          </output>
          <BotonEstado icon={ZoomIn} etiqueta="Acercar" disabled={zoom >= ZOOM_MAX} onClick={() => setZoom((z) => limitarZoom(z + PASO_ZOOM))} />
          <BotonEstado icon={MoveHorizontal} etiqueta="Ajustar al ancho" onClick={ajustarAlAncho}>
            <span className="hidden sm:inline">Ajustar</span>
          </BotonEstado>
        </div>
      </div>
    </div>
  );
}
