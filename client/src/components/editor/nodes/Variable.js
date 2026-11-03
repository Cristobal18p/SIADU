import { Node, mergeAttributes } from '@tiptap/core';
import { VARIABLES_SISTEMA } from '@siadu/documento';

const ETIQUETAS_SISTEMA = new Map(VARIABLES_SISTEMA.map((v) => [v.id, v.etiqueta]));

/**
 * Cápsula de variable (`variable`, inline, `attrs.id`), mostrada como `[Etiqueta]`.
 * `etiquetaDe(id)` devuelve la etiqueta; con `undefined` la cápsula se marca como sin definición.
 * `refrescarVariables(editor)` redibuja las cápsulas sin tocar el documento.
 */
export const Variable = Node.create({
  name: 'variable',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return { etiquetaDe: (id) => id };
  },

  addStorage() {
    return { vistas: new Set() };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-variable'),
        renderHTML: (attrs) => ({ 'data-variable': attrs.id }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-variable]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const id = node.attrs.id;
    const sistema = ETIQUETAS_SISTEMA.has(id);
    const etiqueta = sistema ? ETIQUETAS_SISTEMA.get(id) : this.options.etiquetaDe(id) || id;
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: `doc-capsula-variable${sistema ? ' doc-capsula-sistema' : ''}`,
        title: sistema ? 'Dato automático del solicitante' : 'Dato que completa el solicitante',
      }),
      `[${etiqueta}]`,
    ];
  },

  addNodeView() {
    const { options, storage } = this;
    return ({ node }) => {
      let actual = node;
      const dom = document.createElement('span');
      dom.contentEditable = 'false';
      dom.draggable = true;

      const pintar = () => {
        const id = actual.attrs.id;
        const sistema = ETIQUETAS_SISTEMA.has(id);
        const etiqueta = sistema ? ETIQUETAS_SISTEMA.get(id) : options.etiquetaDe(id);
        const definida = sistema || etiqueta !== undefined;
        dom.setAttribute('data-variable', id ?? '');
        dom.className = `doc-capsula-variable${sistema ? ' doc-capsula-sistema' : ''}${definida ? '' : ' doc-capsula-indefinida'}`;
        dom.title = sistema
          ? 'Dato automático del solicitante'
          : definida
            ? 'Dato que completa el solicitante'
            : 'Variable sin configuración: créala en el panel o quítala del documento';
        dom.textContent = `[${(sistema ? etiqueta : etiqueta?.trim()) || id}]`;
      };
      pintar();

      const vista = { pintar };
      storage.vistas.add(vista);
      return {
        dom,
        update: (nuevo) => {
          if (nuevo.type !== actual.type) return false;
          actual = nuevo;
          pintar();
          return true;
        },
        destroy: () => storage.vistas.delete(vista),
      };
    };
  },

  renderText({ node }) {
    return `[${ETIQUETAS_SISTEMA.get(node.attrs.id) ?? node.attrs.id}]`;
  },
});

/** Redibuja las cápsulas. */
export const refrescarVariables = (editor) => {
  if (!editor || editor.isDestroyed) return;
  editor.storage.variable?.vistas.forEach((v) => v.pintar());
};
