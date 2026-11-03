/** Utilidades de formato. */

/**
 * Fecha ISO en formato corto; '—' si falta o es inválida.
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('es-PA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Tiempo transcurrido desde una fecha; cadena vacía si falta o es inválida.
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export const tiempoTranscurrido = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'hace 1 día';
  return `hace ${dias} días`;
};

const TIPOS_UNIDAD = {
  FACULTAD: 'Facultad',
  DIRECCION: 'Dirección',
  INSTITUTO: 'Instituto',
  VICERRECTORIA: 'Vicerrectoría',
  'SECRETARÍA': 'Secretaría',
  SECRETARIA: 'Secretaría',
};

/**
 * Nombre completo de la unidad: tipo y nombre.
 * @param {{ nombre?: string, tipoUnidad?: string|null }} [unidad]
 * @returns {string}
 */
export const nombreCompletoUnidad = (unidad) => {
  const nombre = unidad?.nombre?.trim();
  if (!nombre) return '';
  const tipo = TIPOS_UNIDAD[String(unidad?.tipoUnidad || '').trim().toUpperCase()];
  return tipo ? `${tipo} de ${nombre}` : nombre;
};

/**
 * Iniciales del usuario para el avatar.
 * @param {Object} usuario
 * @returns {string} Hasta dos letras
 */
export const getIniciales = (usuario) => {
  const partes = [usuario?.nombre, usuario?.apellido]
    .filter(Boolean)
    .flatMap((p) => p.trim().split(/\s+/));
  const fuente = partes.length > 0 ? partes : (usuario?.nombreCompleto || '').trim().split(/\s+/);
  const letras = fuente.filter(Boolean).map((p) => p[0].toUpperCase());
  if (letras.length === 0) return '';
  return letras.length === 1 ? letras[0] : letras[0] + letras[letras.length - 1];
};

/**
 * Saludo según el tratamiento (Dr./Dra.) o el primer nombre.
 * @param {Object} usuario
 * @returns {'Bienvenido' | 'Bienvenida'}
 */
export const getSaludoBienvenida = (usuario) => {
  if (!usuario) return 'Bienvenido';

  const nombreCompleto = (usuario.nombreCompleto || '').trim();
  if (!nombreCompleto) return 'Bienvenido';

  // Tratamiento
  if (/^Dra\./i.test(nombreCompleto) || /^Profra\./i.test(nombreCompleto) || /^Licda\./i.test(nombreCompleto)) {
    return 'Bienvenida';
  }
  if (/^Dr\./i.test(nombreCompleto) || /^Profr\./i.test(nombreCompleto) || /^Licdo\./i.test(nombreCompleto)) {
    return 'Bienvenido';
  }

  // Primer nombre
  const limpio = nombreCompleto.replace(/^(Dr\.|Dra\.|Lic\.|Licda\.|Prof\.|Profra\.|Ing\.)\s+/i, '').trim();
  const primerNombre = limpio.split(' ')[0]?.toLowerCase() || '';

  // Nombres femeninos comunes
  const nombresFemeninos = new Set([
    'ana', 'maria', 'maría', 'karina', 'carmen', 'isabel', 'raquel', 'beatriz',
    'laura', 'patricia', 'gloria', 'diana', 'elena', 'sofia', 'sofía', 'lucia', 'lucía',
    'paola', 'andrea', 'daniela', 'valeria', 'gabriela', 'claudia', 'monica', 'mónica',
    'natalia', 'rosa', 'marta', 'martha', 'silvia', 'sandra', 'lorena', 'mercedes',
    'lourdes', 'pilar', 'ines', 'inés', 'julia', 'teresa', 'alicia', 'irene', 'miriam'
  ]);

  if (nombresFemeninos.has(primerNombre) || primerNombre.endsWith('a')) {
    return 'Bienvenida';
  }

  return 'Bienvenido';
};
