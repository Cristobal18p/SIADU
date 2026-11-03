import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Braces, Plus, UserRound } from 'lucide-react';
import { VARIABLES_SISTEMA } from '@siadu/documento';
import { etiquetaDesdeTexto, nombreTipo } from '../../utils/variables';

const MAX_POR_GRUPO = 6;
const ALTO_MAX_PX = 288;

/** Compara sin tildes ni mayúsculas; «_» cuenta como espacio. */
const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/_/g, ' ')
    .toLowerCase();

/**
 * Buscador de variables que abre «@» en el documento; se maneja con el teclado del editor.
 *
 * @param {Object} props
 * @param {import('@tiptap/react').Editor} props.editor
 * @param {{ desde: number, hasta: number, consulta: string }} props.estado
 * @param {Array} props.variables
 * @param {import('react').MutableRefObject} props.teclaRef - Manejador de teclas
 * @param {(id: string) => void} props.onElegir
 * @param {(etiqueta: string) => void} props.onCrear
 */
export default function MenuSugerencias({ editor, estado, variables, teclaRef, onElegir, onCrear }) {
  const [activo, setActivo] = useState(0);
  const [, setDesplazado] = useState(0);
  const listaRef = useRef(null);
  const consulta = estado.consulta;

  const items = useMemo(() => {
    const q = normalizar(consulta).trim();
    const coincide = (v) => !q || normalizar(v.etiqueta).includes(q) || normalizar(v.id).includes(q);
    const delFormulario = variables
      .filter(coincide)
      .slice(0, MAX_POR_GRUPO)
      .map((v) => ({ clave: `f-${v.id}`, id: v.id, etiqueta: v.etiqueta?.trim() || v.id, detalle: nombreTipo(v.tipo), icon: Braces }));
    const delSistema = VARIABLES_SISTEMA.filter(coincide)
      .slice(0, MAX_POR_GRUPO)
      .map((v) => ({ clave: `s-${v.id}`, id: v.id, etiqueta: v.etiqueta, detalle: 'Dato automático', icon: UserRound }));
    const etiquetaNueva = etiquetaDesdeTexto(consulta.replace(/_/g, ' '));
    const exacta = variables.some((v) => normalizar(v.etiqueta).trim() === q);
    const crear =
      etiquetaNueva && !exacta
        ? { clave: 'crear', crear: etiquetaNueva, etiqueta: `Crear «${etiquetaNueva}»`, detalle: 'Variable nueva del formulario', icon: Plus }
        : { clave: 'crear', crear: '', etiqueta: 'Crear variable nueva', detalle: 'Se configura en el panel', icon: Plus };
    // Variables del formulario primero; los datos automáticos al final
    return [...delFormulario, crear, ...delSistema];
  }, [consulta, variables]);

  useEffect(() => setActivo(0), [consulta]);

  const elegir = (item) => (item.crear !== undefined ? onCrear(item.crear) : onElegir(item.id));

  // El editor cede las teclas de navegación mientras el buscador está abierto
  useEffect(() => {
    teclaRef.current = (e) => {
      if (e.key === 'ArrowDown') setActivo((a) => (a + 1) % items.length);
      else if (e.key === 'ArrowUp') setActivo((a) => (a - 1 + items.length) % items.length);
      else if (e.key === 'Enter' || e.key === 'Tab') elegir(items[activo]);
      else return false;
      e.preventDefault();
      return true;
    };
    return () => {
      teclaRef.current = () => false;
    };
  });

  useLayoutEffect(() => {
    listaRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activo]);

  // El foco sigue en el documento; el editor anuncia la lista y la opción activa
  useEffect(() => {
    const dom = editor.view.dom;
    dom.setAttribute('aria-autocomplete', 'list');
    dom.setAttribute('aria-expanded', 'true');
    dom.setAttribute('aria-controls', 'sugerencias-variables');
    return () => ['aria-autocomplete', 'aria-expanded', 'aria-controls', 'aria-activedescendant'].forEach((a) => dom.removeAttribute(a));
  }, [editor]);
  useEffect(() => {
    if (items[activo]) editor.view.dom.setAttribute('aria-activedescendant', `sugerencia-${items[activo].clave}`);
  }, [editor, items, activo]);

  // Sigue a la «@» al desplazar o redimensionar
  useEffect(() => {
    const mover = () => setDesplazado((n) => n + 1);
    window.addEventListener('scroll', mover, true);
    window.addEventListener('resize', mover);
    return () => {
      window.removeEventListener('scroll', mover, true);
      window.removeEventListener('resize', mover);
    };
  }, []);

  let coords;
  try {
    coords = editor.view.coordsAtPos(estado.desde);
  } catch {
    return null;
  }
  const arriba = coords.bottom + 4 + ALTO_MAX_PX > window.innerHeight && coords.top - 4 - ALTO_MAX_PX > 0;
  const estilo = {
    position: 'fixed',
    left: Math.max(8, Math.min(coords.left, window.innerWidth - 296)),
    ...(arriba ? { bottom: window.innerHeight - coords.top + 4 } : { top: coords.bottom + 4 }),
    maxHeight: ALTO_MAX_PX,
  };

  return (
    <div
      style={estilo}
      className="z-40 w-72 overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-lg py-1"
      onMouseDown={(e) => e.preventDefault()} // el cursor sigue en el documento
    >
      <ul ref={listaRef} id="sugerencias-variables" role="listbox" aria-label="Variables para insertar">
        {items.map((item, i) => {
          const Icon = item.icon;
          const automatico = item.clave.startsWith('s-');
          const titulo = i === 0 ? 'Formulario' : automatico && !items[i - 1].clave.startsWith('s-') ? 'Automáticos' : null;
          return (
            <React.Fragment key={item.clave}>
              {titulo && (
                <li
                  role="presentation"
                  className={`px-3.5 pt-1.5 pb-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wide ${
                    automatico ? 'mt-1 border-t border-slate-100' : ''
                  }`}
                >
                  {titulo}
                </li>
              )}
              <li
                id={`sugerencia-${item.clave}`}
                role="option"
                aria-selected={i === activo}
                onMouseEnter={() => setActivo(i)}
                onClick={() => elegir(item)}
                className={`mx-1 px-2.5 py-1.5 rounded-lg flex items-start gap-2.5 cursor-pointer ${i === activo ? 'bg-slate-100' : ''}`}
              >
                <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-800 truncate">{item.etiqueta}</span>
                  <span className="block text-xs text-slate-500 truncate">{item.detalle}</span>
                </span>
              </li>
            </React.Fragment>
          );
        })}
      </ul>
    </div>
  );
}
