import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { ALTO_UTIL_PX, capacidades, repartirPaginas } from '@siadu/documento';

export const clavePaginacion = new PluginKey('paginacion');

/**
 * Reparte el documento en hojas Carta durante la edición, con la misma regla que la vista previa y el PDF.
 * Inserta cortes visuales como decoraciones, fuera del documento y del historial. El bloque de firmas se corta por filas.
 *
 * Opciones:
 * - `medirMarco()` → `{ membrete, pie, escala, clave }`: altos sin zoom, zoom actual y clave de cambio.
 * - `crearCorte({ pagina, total, relleno })` → elemento del corte tras la hoja `pagina`.
 * - `alPaginar({ total, rellenoFinal })`: datos de la última hoja.
 */
export const Paginacion = Extension.create({
  name: 'paginacion',

  addOptions() {
    return {
      medirMarco: () => null,
      crearCorte: () => document.createElement('div'),
      alPaginar: () => {},
    };
  },

  addProseMirrorPlugins() {
    const opciones = this.options;

    return [
      new Plugin({
        key: clavePaginacion,
        state: {
          init: () => ({ firma: '', decoraciones: DecorationSet.empty }),
          apply(tr, valor) {
            const nuevo = tr.getMeta(clavePaginacion);
            if (nuevo) return nuevo;
            return { ...valor, decoraciones: valor.decoraciones.map(tr.mapping, tr.doc) };
          },
        },
        props: {
          decorations: (state) => clavePaginacion.getState(state).decoraciones,
        },
        view: (view) => {
          let cuadro = null;

          const medir = () => {
            cuadro = null;
            const marco = opciones.medirMarco();
            if (!marco || !view.dom.isConnected) return;
            const { altoPrimera, altoResto } = capacidades({ altoUtil: ALTO_UTIL_PX, membrete: marco.membrete, pie: marco.pie });

            const medida = (el, salto = false) => {
              const margen = Number.parseFloat(getComputedStyle(el).marginBottom) || 0;
              return { alto: el.getBoundingClientRect().height / marco.escala + margen, margen, salto };
            };

            // Un bloque por nodo de primer nivel; el de firmas, uno por fila
            const bloques = [];
            const refs = [];
            const contenedoresFirmas = [];
            view.state.doc.forEach((nodo, posicion) => {
              const el = view.nodeDOM(posicion);
              if (!(el instanceof HTMLElement)) {
                bloques.push({ alto: 0 });
                refs.push({ posicion });
                return;
              }
              const filas = nodo.type.name === 'signatureBlock' ? [...el.querySelectorAll(':scope > .doc-firmas')] : [];
              if (filas.length > 0) {
                contenedoresFirmas.push(el);
                filas.forEach((fila, k) => {
                  bloques.push(medida(fila));
                  refs.push(k === 0 ? { posicion } : { posicion, contenedor: el, fila });
                });
                return;
              }
              bloques.push(medida(el, nodo.type.name === 'pageBreak'));
              refs.push({ posicion });
            });

            const { paginas, usados } = repartirPaginas(bloques, { altoPrimera, altoResto });
            const total = paginas.length;
            const relleno = (i) => Math.max(0, Math.round((i === 0 ? altoPrimera : altoResto) - usados[i]));
            opciones.alPaginar({ total, rellenoFinal: relleno(total - 1) });

            // Los cortes dentro del bloque de firmas van en su DOM
            const internos = new Map(contenedoresFirmas.map((el) => [el, []]));
            paginas.slice(1).forEach((indices, k) => {
              const ref = refs[indices[0]];
              if (ref.contenedor) internos.get(ref.contenedor).push({ fila: ref.fila, pagina: k + 1, relleno: relleno(k) });
            });
            internos.forEach((cortes, el) => {
              const clave = `${marco.clave}#${total}#${cortes.map((c) => `${c.pagina}:${c.relleno}`).join('|')}`;
              if (el.dataset.cortes === clave) return;
              el.querySelectorAll(':scope > .doc-editor-corte').forEach((c) => c.remove());
              cortes.forEach((c) => el.insertBefore(opciones.crearCorte({ pagina: c.pagina, total, relleno: c.relleno }), c.fila));
              el.dataset.cortes = clave;
            });

            // Solo se redibuja si cambian los cortes o el pie
            const firma = `${marco.clave}#${paginas.map((p, i) => `${p[0]}:${relleno(i)}`).join('|')}`;
            if (clavePaginacion.getState(view.state).firma === firma) return;

            const decoraciones = paginas
              .slice(1)
              .map((indices, k) => ({ ref: refs[indices[0]], k }))
              .filter(({ ref }) => !ref.contenedor)
              .map(({ ref, k }) =>
                Decoration.widget(ref.posicion, () => opciones.crearCorte({ pagina: k + 1, total, relleno: relleno(k) }), {
                  side: -1,
                  ignoreSelection: true,
                  // El editor ignora los clics del corte; los maneja la hoja
                  stopEvent: () => true,
                  key: `corte-${k}-${total}-${relleno(k)}-${marco.clave}`,
                })
              );
            view.dispatch(
              view.state.tr
                .setMeta(clavePaginacion, { firma, decoraciones: DecorationSet.create(view.state.doc, decoraciones) })
                .setMeta('addToHistory', false)
            );
          };

          const programar = () => {
            if (cuadro === null) cuadro = requestAnimationFrame(medir);
          };
          programar();

          return {
            update: programar,
            destroy: () => {
              if (cuadro !== null) cancelAnimationFrame(cuadro);
            },
          };
        },
      }),
    ];
  },
});
