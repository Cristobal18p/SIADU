import { Node, mergeAttributes } from '@tiptap/core';
import { firmasHtml } from '@siadu/documento';

/**
 * Bloque de firmas (`signatureBlock`): una casilla por paso del flujo con firma, dibujada con el motor.
 * `pasos()` entrega los pasos; `refrescarFirmas(editor)` redibuja el bloque sin tocar el documento.
 */
export const BloqueFirmas = Node.create({
  name: 'signatureBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return { pasos: () => [] };
  },

  addStorage() {
    return { vistas: new Set() };
  },

  addAttributes() {
    return { columnas: { default: null, rendered: false } };
  },

  parseHTML() {
    return [{ tag: 'div[data-bloque-firmas]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-bloque-firmas': '', class: 'doc-firmas-editor', contenteditable: 'false' }),
      'Bloque de firmas · según el flujo de aprobación',
    ];
  },

  addNodeView() {
    const { options, storage } = this;
    return () => {
      // Contenedor con una pieza por fila de firmas; la paginación puede cortar entre ellas
      const dom = document.createElement('div');
      dom.contentEditable = 'false';
      dom.className = 'doc-firmas-en-editor';
      dom.setAttribute('data-bloque-firmas', '');
      dom.title = 'Bloque de firmas: una casilla por cada paso del flujo que requiere firma';

      const pintar = () => {
        dom.innerHTML = firmasHtml(options.pasos());
        delete dom.dataset.cortes; // los cortes se recalculan al medir
      };
      pintar();

      const vista = { pintar };
      storage.vistas.add(vista);
      return {
        dom,
        update: (nodo) => nodo.type.name === 'signatureBlock',
        // Los cortes internos no son cambios del documento
        ignoreMutation: () => true,
        destroy: () => storage.vistas.delete(vista),
      };
    };
  },
});

/** Redibuja el bloque de firmas. */
export const refrescarFirmas = (editor) => {
  if (!editor || editor.isDestroyed) return;
  editor.storage.signatureBlock?.vistas.forEach((v) => v.pintar());
};

/** Salto de página manual (`pageBreak`). */
export const SaltoPagina = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-salto-pagina]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-salto-pagina': '', class: 'doc-salto-pagina' })];
  },
});
