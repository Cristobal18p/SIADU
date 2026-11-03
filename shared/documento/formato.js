/** Formato de los valores del documento; no depende de la zona horaria ni del idioma del equipo. */

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Panamá está en UTC−5 todo el año (sin horario de verano). */
const DESFASE_PANAMA_MS = -5 * 60 * 60 * 1000;

/** Valor que toma un select cuando se elige «Otro». */
export const VALOR_OTRO = 'OTRO';

/** Clave de `datosJson` con el texto libre de «Otro». */
export const claveOtro = (id) => `${id}Otro`;

const vacio = (valor) => valor === undefined || valor === null || String(valor).trim() === '';

/**
 * «AAAA-MM-DD» → «5 de octubre de 2026». Devuelve el texto original si no es una fecha.
 * @param {string} texto
 */
export function fechaFormal(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(texto ?? ''));
  if (!m) return String(texto ?? '');
  const mes = MESES[Number(m[2]) - 1];
  return mes ? `${Number(m[3])} de ${mes} de ${m[1]}` : String(texto);
}

/** Fecha y hora ISO (UTC) en hora de Panamá y formato de 12 horas: «6 de octubre de 2026, 10:00 a. m.». */
export function fechaHoraPanama(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const d = new Date(t + DESFASE_PANAMA_MS);
  const horas = d.getUTCHours();
  const minutos = String(d.getUTCMinutes()).padStart(2, '0');
  const hora = `${horas % 12 || 12}:${minutos} ${horas < 12 ? 'a. m.' : 'p. m.'}`;
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}, ${hora}`;
}

/** Texto impreso de una variable: fecha formal, etiqueta del select (o el texto de «Otro») y «Sí» del checkbox. */
export function valorVariable(variable, valor, datos = {}) {
  if (variable?.tipo === 'checkbox') return valor === true ? 'Sí' : '';
  if (vacio(valor)) return '';
  switch (variable?.tipo) {
    case 'date':
      return fechaFormal(valor);
    case 'select':
      if (valor === VALOR_OTRO) return String(datos[claveOtro(variable.id)] ?? '').trim();
      return variable.opciones?.find((o) => o.valor === valor)?.etiqueta ?? String(valor);
    default:
      return String(valor);
  }
}
