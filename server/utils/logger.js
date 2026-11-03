const info = (msg) => console.log(`[INFO] ${msg}`)
const error = (msg) => console.error(`[ERROR] ${msg}`)
const warn = (msg) => console.warn(`[WARN] ${msg}`)

/** Cédula o correo con solo los tres primeros caracteres visibles. */
const enmascarar = (valor) => {
  const texto = String(valor ?? '').trim()
  return texto ? `${texto.slice(0, 3)}***` : ''
}

/** Evento de seguridad en una línea JSON. */
const evento = (tipo, datos = {}) =>
  console.log(JSON.stringify({ ts: new Date().toISOString(), nivel: 'SEGURIDAD', tipo, ...datos }))

module.exports = { info, error, warn, evento, enmascarar }
