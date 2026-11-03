import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle, FontFamily } from '@tiptap/extension-text-style';
import { Placeholder } from '@tiptap/extensions';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { FormatoBloque } from '../extensions/formatoBloque';
import { TamanoFuente } from '../extensions/tamanoFuente';
import { Variable } from '../nodes/Variable';
import { BloqueFirmas, SaltoPagina } from '../nodes/bloques';
import { Paginacion } from '../extensions/paginacion';
import { SugerenciaVariables } from '../extensions/sugerenciaVariables';

/**
 * Extensiones del editor del documento: solo los nodos, marcas y atributos que admite `cuerpoDocumento`.
 *
 * @param {Object} [opciones]
 * @param {(id: string) => string|undefined} [opciones.etiquetaVariable] - Etiqueta de una variable
 * @param {Object} [opciones.paginacion] - Opciones de la paginación
 * @param {Object} [opciones.sugerencias] - Opciones del buscador «@»
 * @param {() => Array} [opciones.pasosFirmas] - Pasos para el bloque de firmas
 */
export const extensionesDocumento = ({ etiquetaVariable, paginacion, sugerencias, pasosFirmas } = {}) => [
  ...(paginacion ? [Paginacion.configure(paginacion)] : []),
  ...(sugerencias ? [SugerenciaVariables.configure(sugerencias)] : []),
  StarterKit.configure({
    heading: { levels: [1, 2] },
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    link: false,
    trailingNode: false,
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
    alignments: ['left', 'center', 'right', 'justify'],
    defaultAlignment: 'justify',
  }),
  TextStyle,
  FontFamily.configure({ types: ['textStyle'] }),
  TamanoFuente,
  FormatoBloque,
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  SaltoPagina,
  pasosFirmas ? BloqueFirmas.configure({ pasos: pasosFirmas }) : BloqueFirmas,
  Variable.configure(etiquetaVariable ? { etiquetaDe: etiquetaVariable } : {}),
  Placeholder.configure({ placeholder: 'Escribe aquí el contenido del documento… (con @ insertas una variable)' }),
];

/** Extensiones del editor del pie: párrafos, negrita, cursiva, subrayado, tamaño y saltos de línea. */
export const extensionesPie = () => [
  StarterKit.configure({
    heading: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    link: false,
    trailingNode: false,
  }),
  TextAlign.configure({ types: ['paragraph'], alignments: ['left', 'center', 'right'], defaultAlignment: 'center' }),
  TextStyle,
  TamanoFuente,
  Placeholder.configure({ placeholder: 'Texto del pie de página' }),
];
