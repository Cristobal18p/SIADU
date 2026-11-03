import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Bold,
  Braces,
  CornerUpLeft,
  Ellipsis,
  Hash,
  PanelBottom,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  PanelRightClose,
  PanelRightOpen,
  PanelTop,
  Plus,
  Redo2,
  SeparatorHorizontal,
  Signature,
  Table2,
  TableColumnsSplit,
  TableRowsSplit,
  Trash2,
  Underline,
  Undo2,
} from 'lucide-react';
import { TextSelection } from '@tiptap/pm/state';
import { FORMATO_POR_DEFECTO, TAMANOS_PIE } from '@siadu/documento';
import useMediaQuery from '../../../hooks/useMediaQuery';
import MenuDesplegable from './MenuDesplegable';

/** Botón de la barra: icono con nombre accesible y estado activo. */
function BotonHerramienta({ icon: Icon, etiqueta, atajo, activo = false, disabled = false, onClick }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // conserva la selección del documento
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      aria-pressed={activo}
      title={atajo ? `${etiqueta} (${atajo})` : etiqueta}
      className={`p-1.5 rounded-md transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-35 disabled:cursor-not-allowed shrink-0 ${
        activo ? 'bg-blue-100 text-brand' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
    </button>
  );
}

const Separador = () => <span aria-hidden="true" className="w-px h-5 bg-slate-200 mx-1 shrink-0" />;

/** Selector compacto de la barra. */
function Selector({ id, etiqueta, value, opciones, disabled, onChange, ancho = '' }) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {etiqueta}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        title={etiqueta}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 text-sm text-slate-700 bg-white border border-slate-200 rounded-md px-2 cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 ${ancho}`}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </>
  );
}

const ESTILOS_PARRAFO = [
  { valor: 'p', etiqueta: 'Texto normal' },
  { valor: 'h1', etiqueta: 'Título 1' },
  { valor: 'h2', etiqueta: 'Título 2' },
];
const FUENTES = [
  { valor: 'Arial', etiqueta: 'Arial' },
  { valor: 'Times New Roman', etiqueta: 'Times New Roman' },
];
const TAMANOS = [
  { valor: '11pt', etiqueta: '11 pt' },
  { valor: '12pt', etiqueta: '12 pt' },
];
const INTERLINEADOS = [
  { valor: '1.0', etiqueta: 'Sencillo (1.0)' },
  { valor: '1.15', etiqueta: 'Estándar UP (1.15)' },
  { valor: '1.5', etiqueta: 'Amplio (1.5)' },
];

/** El pie usa 8 pt sin marca; los demás tamaños se guardan como `textStyle.fontSize`. */
const TAMANO_PIE_BASE = '8pt';
const OPCIONES_TAMANO_PIE = TAMANOS_PIE.map((t) => ({ valor: t, etiqueta: t.replace('pt', ' pt') }));

/** Inserta un bloque sin texto y deja el cursor en la línea siguiente. */
const insertarBloque = (editor, tipo) =>
  editor
    .chain()
    .focus()
    .insertContent({ type: tipo })
    .command(({ tr, dispatch }) => {
      const { selection } = tr;
      // Busca el final del bloque insertado
      let fin = selection.to;
      if (!(selection.node?.type.name === tipo)) {
        const $pos = tr.doc.resolve(selection.from);
        const antes = $pos.nodeBefore;
        if (antes?.type.name !== tipo) return true;
        fin = selection.from;
      }
      const siguiente = tr.doc.nodeAt(fin);
      if (!siguiente || !siguiente.isTextblock) {
        tr.insert(fin, tr.doc.type.schema.nodes.paragraph.create());
      }
      if (dispatch) tr.setSelection(TextSelection.create(tr.doc, fin + 1));
      return true;
    })
    .run();

/** Indica si el documento ya tiene bloque de firmas. */
const tieneBloqueFirmas = (editor) => {
  let existe = false;
  editor?.state.doc.descendants((nodo) => {
    if (nodo.type.name === 'signatureBlock') existe = true;
    return !existe;
  });
  return existe;
};

/**
 * Barra de herramientas del editor activo (cuerpo o pie); en pantallas angostas parte de ella pasa a «Más».
 *
 * @param {Object} props
 * @param {import('@tiptap/react').Editor|null} props.editor - Editor activo
 * @param {'cuerpo'|'pie'} [props.modo='cuerpo']
 * @param {Object} [props.formato] - disenoFormJson.formato
 * @param {boolean} props.soloLectura
 * @param {boolean} props.panelAbierto
 * @param {() => void} props.onAlternarPanel
 * @param {() => void} [props.onVolverAlCuerpo]
 * @param {{ membrete: boolean, pie: boolean, paginacion: boolean }} [props.marco]
 * @param {(accion: 'agregarMembrete'|'agregarPie'|'agregarPaginacion'|'alternarPaginacion'|'quitarPie') => void} [props.onMarco]
 * @param {{ nueva: () => void, convertir: () => void, puedeConvertir: boolean }} [props.variables]
 */
export default function BarraHerramientas({
  editor,
  modo = 'cuerpo',
  formato,
  soloLectura,
  panelAbierto,
  onAlternarPanel,
  onVolverAlCuerpo,
  marco = { membrete: true, pie: true, paginacion: false },
  onMarco = () => {},
  variables,
}) {
  const amplia = useMediaQuery('(min-width: 1280px)');
  const enPie = modo === 'pie';
  const listo = Boolean(editor) && !soloLectura;
  // Sangría, listas y tablas solo en el cuerpo
  const listoCuerpo = listo && !enPie;
  const base = { ...FORMATO_POR_DEFECTO, ...(formato || {}) };
  const cadena = () => editor.chain().focus();
  const activo = (nombre, attrs) => Boolean(editor?.isActive(nombre, attrs));
  const puede = () => editor.can().chain().focus();

  // ---------- texto
  const estiloActual = activo('heading', { level: 1 }) ? 'h1' : activo('heading', { level: 2 }) ? 'h2' : 'p';
  const cambiarEstilo = (valor) => {
    if (valor === 'p') cadena().setParagraph().run();
    else cadena().setHeading({ level: valor === 'h1' ? 1 : 2 }).run();
  };

  const estiloTexto = editor?.getAttributes('textStyle') ?? {};
  const fuenteActual = estiloTexto.fontFamily || base.fuente;
  // Elegir la fuente o el tamaño base quita la marca
  const cambiarFuente = (valor) =>
    valor === base.fuente
      ? cadena().unsetFontFamily().removeEmptyTextStyle().run()
      : cadena().setFontFamily(valor).run();
  const tamanoActual = estiloTexto.fontSize || base.tamano;
  const cambiarTamano = (valor) =>
    valor === base.tamano ? cadena().unsetTamanoFuente().run() : cadena().setTamanoFuente(valor).run();

  const tamanoPie = estiloTexto.fontSize || TAMANO_PIE_BASE;
  const cambiarTamanoPie = (valor) =>
    valor === TAMANO_PIE_BASE ? cadena().unsetTamanoFuente().run() : cadena().setTamanoFuente(valor).run();

  // ---------- párrafo
  const alinear = (alineacion) => cadena().setTextAlign(alineacion).run();
  const alineacionActiva = (alineacion) =>
    activo('paragraph', { textAlign: alineacion }) || activo('heading', { textAlign: alineacion });

  const bloque = editor?.isActive('heading') ? editor.getAttributes('heading') : editor?.getAttributes('paragraph') ?? {};
  const interlineadoActual = bloque.lineHeight || base.interlineado;
  const cambiarInterlineado = (valor) => cadena().setInterlineado(valor === base.interlineado ? null : valor).run();

  // En una lista, la sangría anida o saca el ítem
  const enLista = activo('listItem');
  const aumentarSangria = () =>
    enLista ? cadena().sinkListItem('listItem').run() : cadena().aumentarSangria().run();
  const disminuirSangria = () =>
    enLista ? cadena().liftListItem('listItem').run() : cadena().disminuirSangria().run();
  const puedeAumentar = listoCuerpo && (enLista ? puede().sinkListItem('listItem').run() : puede().aumentarSangria().run());
  const puedeDisminuir = listoCuerpo && (enLista ? puede().liftListItem('listItem').run() : puede().disminuirSangria().run());

  // ---------- insertar
  const hayFirmas = tieneBloqueFirmas(editor);
  const itemsInsertar = [
    ...(variables
      ? [
          { etiqueta: 'Variable nueva', icon: Braces, disabled: !listo, onSelect: variables.nueva },
          {
            etiqueta: 'Convertir la selección en variable',
            icon: Braces,
            disabled: !listo || !variables.puedeConvertir,
            ayuda: 'Selecciona un texto dentro de un mismo párrafo (sin variables) para convertirlo.',
            onSelect: variables.convertir,
          },
          { separador: true },
        ]
      : []),
    {
      etiqueta: 'Tabla (3 × 3 con encabezado)',
      icon: Table2,
      disabled: !listo || activo('table'),
      ayuda: 'No se puede insertar una tabla dentro de otra.',
      onSelect: () => cadena().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      etiqueta: 'Salto de página',
      icon: SeparatorHorizontal,
      disabled: !listo || activo('table'),
      ayuda: 'No se puede insertar dentro de una tabla.',
      onSelect: () => insertarBloque(editor, 'pageBreak'),
    },
    {
      etiqueta: 'Bloque de firmas',
      icon: Signature,
      disabled: !listo || hayFirmas || activo('table'),
      ayuda: hayFirmas
        ? 'El documento ya tiene su bloque de firmas (solo se permite uno).'
        : 'No se puede insertar dentro de una tabla.',
      onSelect: () => insertarBloque(editor, 'signatureBlock'),
    },
    { separador: true },
    // Membrete y pie se agregan aquí y se quitan sobre la hoja
    {
      etiqueta: 'Membrete',
      icon: PanelTop,
      disabled: !listo || marco.membrete,
      ayuda: 'El documento ya tiene membrete. Para quitarlo, usa «Quitar» sobre el membrete.',
      onSelect: () => onMarco('agregarMembrete'),
    },
    {
      etiqueta: 'Pie de página',
      icon: PanelBottom,
      disabled: !listo || marco.pie,
      ayuda: 'El documento ya tiene pie de página. Para quitarlo, haz clic en el pie y usa «Quitar el pie».',
      onSelect: () => onMarco('agregarPie'),
    },
    {
      etiqueta: 'Numeración de hojas',
      icon: Hash,
      disabled: !listo || !marco.pie || marco.paginacion,
      ayuda: marco.pie
        ? 'Las hojas ya están numeradas. Para quitarlo, haz clic en el pie.'
        : 'Va en el pie de página: agrégalo primero.',
      onSelect: () => onMarco('agregarPaginacion'),
    },
  ];

  // ---------- tabla (solo con el cursor dentro de una)
  const itemsTabla = [
    { etiqueta: 'Insertar fila arriba', icon: BetweenHorizontalStart, disabled: !listoCuerpo || !puede().addRowBefore().run(), onSelect: () => cadena().addRowBefore().run() },
    { etiqueta: 'Insertar fila abajo', icon: BetweenHorizontalEnd, disabled: !listoCuerpo || !puede().addRowAfter().run(), onSelect: () => cadena().addRowAfter().run() },
    { etiqueta: 'Insertar columna a la izquierda', icon: BetweenVerticalStart, disabled: !listoCuerpo || !puede().addColumnBefore().run(), onSelect: () => cadena().addColumnBefore().run() },
    { etiqueta: 'Insertar columna a la derecha', icon: BetweenVerticalEnd, disabled: !listoCuerpo || !puede().addColumnAfter().run(), onSelect: () => cadena().addColumnAfter().run() },
    { separador: true },
    { etiqueta: 'Activar o quitar la fila de encabezado', icon: PanelTop, disabled: !listoCuerpo || !puede().toggleHeaderRow().run(), onSelect: () => cadena().toggleHeaderRow().run() },
    { separador: true },
    { etiqueta: 'Eliminar fila', icon: TableRowsSplit, disabled: !listoCuerpo || !puede().deleteRow().run(), onSelect: () => cadena().deleteRow().run() },
    { etiqueta: 'Eliminar columna', icon: TableColumnsSplit, disabled: !listoCuerpo || !puede().deleteColumn().run(), onSelect: () => cadena().deleteColumn().run() },
    { etiqueta: 'Eliminar tabla', icon: Trash2, peligro: true, disabled: !listoCuerpo || !puede().deleteTable().run(), onSelect: () => cadena().deleteTable().run() },
  ];

  // ---------- menú «Más» (pantallas angostas)
  const itemsMas = [
    ...INTERLINEADOS.map((i) => ({
      etiqueta: `Interlineado ${i.etiqueta.toLowerCase()}`,
      activo: interlineadoActual === i.valor,
      disabled: !listo,
      onSelect: () => cambiarInterlineado(i.valor),
    })),
    { separador: true },
    { etiqueta: 'Aumentar sangría', icon: IndentIncrease, disabled: !puedeAumentar, onSelect: aumentarSangria },
    { etiqueta: 'Disminuir sangría', icon: IndentDecrease, disabled: !puedeDisminuir, onSelect: disminuirSangria },
    { separador: true },
    { etiqueta: 'Lista con viñetas', icon: List, activo: activo('bulletList'), disabled: !listo, onSelect: () => cadena().toggleBulletList().run() },
    { etiqueta: 'Lista numerada', icon: ListOrdered, activo: activo('orderedList'), disabled: !listo, onSelect: () => cadena().toggleOrderedList().run() },
  ];

  return (
    <div
      role="toolbar"
      aria-label={enPie ? 'Formato del pie de página' : 'Formato del documento'}
      className={`h-11 border-b px-3 flex items-center gap-0.5 shrink-0 overflow-x-auto ${
        enPie ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
      }`}
    >
      {enPie && (
        <>
          <span className="px-2 py-0.5 mr-1 rounded-md bg-amber-100 text-amber-900 text-xs font-semibold whitespace-nowrap">
            Pie de página
          </span>
          <Separador />
        </>
      )}

      <BotonHerramienta icon={Undo2} etiqueta="Deshacer" atajo="Ctrl+Z" disabled={!listo || !editor.can().undo()} onClick={() => cadena().undo().run()} />
      <BotonHerramienta icon={Redo2} etiqueta="Rehacer" atajo="Ctrl+Y" disabled={!listo || !editor.can().redo()} onClick={() => cadena().redo().run()} />
      <Separador />

      {enPie ? (
        <Selector id="editor-tamano-pie" etiqueta="Tamaño de letra del pie" value={tamanoPie} opciones={OPCIONES_TAMANO_PIE} disabled={!listo} onChange={cambiarTamanoPie} />
      ) : (
        <>
          <Selector id="editor-fuente" etiqueta="Fuente" value={fuenteActual} opciones={FUENTES} disabled={!listo} onChange={cambiarFuente} ancho="w-40" />
          <Selector id="editor-tamano" etiqueta="Tamaño de letra" value={tamanoActual} opciones={TAMANOS} disabled={!listo || activo('heading')} onChange={cambiarTamano} />
          <Separador />
          <Selector id="editor-estilo" etiqueta="Estilo de párrafo" value={estiloActual} opciones={ESTILOS_PARRAFO} disabled={!listo} onChange={cambiarEstilo} />
        </>
      )}
      <Separador />

      <BotonHerramienta icon={Bold} etiqueta="Negrita" atajo="Ctrl+B" activo={activo('bold')} disabled={!listo} onClick={() => cadena().toggleBold().run()} />
      <BotonHerramienta icon={Italic} etiqueta="Cursiva" atajo="Ctrl+I" activo={activo('italic')} disabled={!listo} onClick={() => cadena().toggleItalic().run()} />
      <BotonHerramienta icon={Underline} etiqueta="Subrayado" atajo="Ctrl+U" activo={activo('underline')} disabled={!listo} onClick={() => cadena().toggleUnderline().run()} />
      <Separador />

      {!enPie && (
        <BotonHerramienta icon={AlignJustify} etiqueta="Justificar" atajo="Ctrl+Shift+J" activo={alineacionActiva('justify')} disabled={!listo} onClick={() => alinear('justify')} />
      )}
      <BotonHerramienta icon={AlignLeft} etiqueta="Alinear a la izquierda" atajo="Ctrl+Shift+L" activo={alineacionActiva('left')} disabled={!listo} onClick={() => alinear('left')} />
      <BotonHerramienta icon={AlignCenter} etiqueta="Centrar" atajo="Ctrl+Shift+E" activo={alineacionActiva('center')} disabled={!listo} onClick={() => alinear('center')} />
      <BotonHerramienta icon={AlignRight} etiqueta="Alinear a la derecha" atajo="Ctrl+Shift+R" activo={alineacionActiva('right')} disabled={!listo} onClick={() => alinear('right')} />

      {!enPie && (
        <>
          <Separador />
          {amplia ? (
            <>
              <Selector id="editor-interlineado" etiqueta="Interlineado" value={interlineadoActual} opciones={INTERLINEADOS} disabled={!listo} onChange={cambiarInterlineado} />
              <Separador />
              <BotonHerramienta icon={IndentDecrease} etiqueta="Disminuir sangría" atajo="Shift+Tab" disabled={!puedeDisminuir} onClick={disminuirSangria} />
              <BotonHerramienta icon={IndentIncrease} etiqueta="Aumentar sangría" atajo="Tab" disabled={!puedeAumentar} onClick={aumentarSangria} />
              <Separador />
              <BotonHerramienta icon={List} etiqueta="Lista con viñetas" activo={activo('bulletList')} disabled={!listo} onClick={() => cadena().toggleBulletList().run()} />
              <BotonHerramienta icon={ListOrdered} etiqueta="Lista numerada" activo={activo('orderedList')} disabled={!listo} onClick={() => cadena().toggleOrderedList().run()} />
            </>
          ) : (
            <MenuDesplegable etiqueta="Más" icon={Ellipsis} disabled={!listo} items={itemsMas} />
          )}
          <Separador />
          <MenuDesplegable etiqueta="Insertar" icon={Plus} disabled={!listo} items={itemsInsertar} />
          {activo('table') && <MenuDesplegable etiqueta="Tabla" icon={Table2} resaltado disabled={!listo} items={itemsTabla} />}
        </>
      )}

      {enPie && (
        <>
          <Separador />
          <BotonHerramienta
            icon={Hash}
            etiqueta={marco.paginacion ? 'Quitar la numeración de hojas' : 'Numerar las hojas'}
            activo={marco.paginacion}
            disabled={!listo}
            onClick={() => onMarco('alternarPaginacion')}
          />
          <button
            type="button"
            onClick={() => onMarco('quitarPie')}
            disabled={!listo}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-sm font-medium text-rose-700 hover:bg-rose-50 cursor-pointer whitespace-nowrap disabled:opacity-35 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Quitar el pie
          </button>
        </>
      )}

      <span className="flex-1" />
      {enPie && onVolverAlCuerpo && (
        <button
          type="button"
          onClick={onVolverAlCuerpo}
          className="flex items-center gap-1.5 h-8 px-2.5 mr-1 rounded-md text-sm font-medium text-amber-900 hover:bg-amber-100 cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <CornerUpLeft className="w-4 h-4" aria-hidden="true" />
          Volver al documento
        </button>
      )}
      <BotonHerramienta
        icon={panelAbierto ? PanelRightClose : PanelRightOpen}
        etiqueta={panelAbierto ? 'Ocultar el panel' : 'Mostrar el panel'}
        activo={panelAbierto}
        onClick={onAlternarPanel}
      />
    </div>
  );
}
