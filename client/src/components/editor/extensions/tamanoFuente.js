import { Extension } from '@tiptap/core';

/**
 * Atributo `fontSize` de la marca `textStyle`.
 * Comandos: `setTamanoFuente(valor)` y `unsetTamanoFuente()`.
 */
export const TamanoFuente = Extension.create({
  name: 'tamanoFuente',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize || null,
            renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {}),
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTamanoFuente:
        (valor) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: valor }).run(),
      unsetTamanoFuente:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});
