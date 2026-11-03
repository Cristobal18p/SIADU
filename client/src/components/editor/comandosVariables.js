/** Operaciones sobre las cápsulas de variable; las que cambian ids o quitan cápsulas no entran al historial. */
import { etiquetaDesdeTexto } from '../../utils/variables';

/** Inserta la cápsula en el cursor (o en el rango indicado, reemplazándolo). */
export const insertarVariable = (editor, id, rango) => {
  if (!editor) return false;
  const nodo = { type: 'variable', attrs: { id } };
  const cadena = editor.chain().focus();
  return (rango ? cadena.insertContentAt(rango, nodo) : cadena.insertContent(nodo)).run();
};

/**
 * Selección convertible en variable: un párrafo, sin cápsulas, hasta 80 caracteres.
 * Devuelve `{ desde, hasta, texto }` o null.
 */
export const seleccionConvertible = (editor) => {
  if (!editor) return null;
  const { selection, doc } = editor.state;
  if (selection.empty || !selection.$from.sameParent(selection.$to) || !selection.$from.parent.isTextblock) return null;
  const crudo = doc.textBetween(selection.from, selection.to, undefined, '\ufffc');
  if (crudo.includes('\ufffc')) return null;
  const texto = etiquetaDesdeTexto(crudo);
  if (!texto || crudo.trim().length > 80) return null;
  return { desde: selection.from, hasta: selection.to, texto };
};

/** Cambia el `id` de las cápsulas de una variable. */
export const renombrarEnDocumento = (editor, viejo, nuevo) => {
  if (!editor || editor.isDestroyed || viejo === nuevo) return;
  const { tr } = editor.state;
  editor.state.doc.descendants((nodo, pos) => {
    if (nodo.type.name === 'variable' && nodo.attrs.id === viejo) tr.setNodeMarkup(pos, undefined, { ...nodo.attrs, id: nuevo });
  });
  if (tr.docChanged) editor.view.dispatch(tr.setMeta('addToHistory', false));
};

/** Quita del documento todas las cápsulas de la variable. */
export const quitarDelDocumento = (editor, id) => {
  if (!editor || editor.isDestroyed) return;
  const posiciones = [];
  editor.state.doc.descendants((nodo, pos) => {
    if (nodo.type.name === 'variable' && nodo.attrs.id === id) posiciones.push(pos);
  });
  if (posiciones.length === 0) return;
  const { tr } = editor.state;
  // De atrás hacia adelante para no mover las posiciones
  posiciones.reverse().forEach((pos) => tr.delete(pos, pos + 1));
  editor.view.dispatch(tr.setMeta('addToHistory', false));
};

/**
 * Selecciona la siguiente cápsula de la variable, de forma circular.
 * @returns {{ indice: number, total: number }|null}
 */
export const irAVariable = (editor, id) => {
  if (!editor) return null;
  const posiciones = [];
  editor.state.doc.descendants((nodo, pos) => {
    if (nodo.type.name === 'variable' && nodo.attrs.id === id) posiciones.push(pos);
  });
  if (posiciones.length === 0) return null;
  const desde = editor.state.selection.from;
  const siguiente = posiciones.findIndex((pos) => pos > desde);
  const i = siguiente === -1 ? 0 : siguiente;
  editor.chain().focus().setNodeSelection(posiciones[i]).scrollIntoView().run();
  return { indice: i + 1, total: posiciones.length };
};
