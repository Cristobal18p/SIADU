import { Extension } from '@tiptap/core';
import { SANGRIA_POR_NIVEL } from '@siadu/documento';

/** Bloques que llevan interlineado y sangría propios. */
const TIPOS = ['paragraph', 'heading'];

/** Sangría máxima, en niveles de media pulgada. */
export const SANGRIA_MAXIMA = 8;

/**
 * Cambia un atributo de todos los párrafos y títulos de la selección.
 * @param {(actual: Object) => Object|null} calcular - Atributos nuevos para el nodo, o null para no tocarlo
 */
const cambiarBloques = (calcular) => ({ state, tr, dispatch }) => {
  const { from, to } = state.selection;
  let cambio = false;
  state.doc.nodesBetween(from, to, (nodo, posicion) => {
    if (!TIPOS.includes(nodo.type.name)) return undefined;
    const nuevos = calcular(nodo.attrs);
    if (nuevos) {
      tr.setNodeMarkup(posicion, undefined, { ...nodo.attrs, ...nuevos });
      cambio = true;
    }
    return false; // no recorre el texto del bloque
  });
  if (cambio && dispatch) dispatch(tr);
  return cambio;
};

/**
 * Interlineado (`lineHeight`) y sangría (`indent`) de párrafos y títulos.
 * Comandos: `setInterlineado`, `aumentarSangria`, `disminuirSangria`. Tab y Shift+Tab cambian la sangría
 * o anidan los ítems de una lista; en una tabla pasan de celda.
 */
export const FormatoBloque = Extension.create({
  name: 'formatoBloque',

  addGlobalAttributes() {
    return [
      {
        types: TIPOS,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (attrs) => (attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {}),
          },
          indent: {
            default: 0,
            parseHTML: (el) => Number.parseInt(el.getAttribute('data-indent'), 10) || 0,
            renderHTML: (attrs) =>
              attrs.indent > 0
                ? { 'data-indent': attrs.indent, style: `margin-left: calc(${attrs.indent} * ${SANGRIA_POR_NIVEL})` }
                : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      /** Interlineado del párrafo; `null` vuelve al del documento. */
      setInterlineado: (valor) => cambiarBloques((attrs) => (attrs.lineHeight === valor ? null : { lineHeight: valor })),
      aumentarSangria: () =>
        cambiarBloques((attrs) => (attrs.indent >= SANGRIA_MAXIMA ? null : { indent: (attrs.indent || 0) + 1 })),
      disminuirSangria: () => cambiarBloques((attrs) => (attrs.indent > 0 ? { indent: attrs.indent - 1 } : null)),
    };
  },

  addKeyboardShortcuts() {
    const sangria = (aumentar) => () => {
      const { editor } = this;
      if (editor.isActive('table')) return false; // la tabla usa Tab para pasar de celda
      if (editor.isActive('listItem')) {
        return aumentar ? editor.commands.sinkListItem('listItem') : editor.commands.liftListItem('listItem');
      }
      if (aumentar) editor.commands.aumentarSangria();
      else editor.commands.disminuirSangria();
      return true; // Tab no saca el foco del documento
    };
    return { Tab: sangria(true), 'Shift-Tab': sangria(false) };
  },
});
