import useMediaQuery from './useMediaQuery';

/** Ancho mínimo para la administración. */
export const QUERY_ESCRITORIO = '(min-width: 1024px)';

/**
 * Indica si la pantalla es lo bastante ancha para la administración.
 * @returns {boolean}
 */
export default function useEsEscritorio() {
  return useMediaQuery(QUERY_ESCRITORIO);
}
