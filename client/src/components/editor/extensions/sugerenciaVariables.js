import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const claveSugerencia = new PluginKey('sugerenciaVariables');

/** «@» al inicio del párrafo o tras un espacio, seguido de letras, números o «_» hasta el cursor. */
const PATRON = /(?:^|\s)@([\p{L}\p{N}_]{0,40})$/u;

/** Busca «@consulta» justo antes del cursor. Devuelve `{ desde, hasta, consulta }` o null. */
const buscarDisparador = (state) => {
  const { selection } = state;
  if (!selection.empty) return null;
  const { $from } = selection;
  if (!$from.parent.isTextblock) return null;
  // Los átomos cuentan como un carácter que no es texto
  const antes = $from.parent.textBetween(Math.max(0, $from.parentOffset - 50), $from.parentOffset, undefined, '\ufffc');
  const m = PATRON.exec(antes);
  if (!m) return null;
  return { desde: $from.pos - m[1].length - 1, hasta: $from.pos, consulta: m[1] };
};

/**
 * Buscador de variables con «@»: detecta la consulta, la notifica con `alCambiar` y cede las teclas con `alTecla`.
 * Escape lo descarta para esa «@».
 */
export const SugerenciaVariables = Extension.create({
  name: 'sugerenciaVariables',

  addOptions() {
    return { alCambiar: () => {}, alTecla: () => false };
  },

  addProseMirrorPlugins() {
    const opciones = this.options;
    return [
      new Plugin({
        key: claveSugerencia,
        state: {
          init: () => null,
          apply(tr, previo, _anterior, estado) {
            const disparador = buscarDisparador(estado);
            if (!disparador) return null;
            // Descartada con Escape, sigue cerrada para la misma «@»
            if (tr.getMeta(claveSugerencia) === 'descartar') return { descartadaEn: disparador.desde };
            if (previo?.descartadaEn === disparador.desde) return previo;
            return disparador;
          },
        },
        view: () => ({
          update: (view) => {
            const s = claveSugerencia.getState(view.state);
            opciones.alCambiar(s && !('descartadaEn' in s) && view.editable ? s : null);
          },
          destroy: () => opciones.alCambiar(null),
        }),
        props: {
          handleKeyDown: (view, evento) => {
            const s = claveSugerencia.getState(view.state);
            if (!s || 'descartadaEn' in s) return false;
            if (evento.key === 'Escape') {
              view.dispatch(view.state.tr.setMeta(claveSugerencia, 'descartar'));
              return true;
            }
            return opciones.alTecla(evento);
          },
        },
      }),
    ];
  },
});
