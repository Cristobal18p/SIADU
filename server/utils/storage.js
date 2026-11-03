// Firmas en Supabase Storage (bucket privado): URL firmada, descarga y subida
const BUCKET = process.env.SUPABASE_BUCKET_FIRMAS || 'firmas';
const SEGUNDOS_URL = 600;
const urlsFirmadas = new Map();

const config = () => {
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_KEY;
  return url && clave ? { url: url.replace(/\/+$/, ''), clave } : null;
};

const cabeceras = (clave) => ({ Authorization: `Bearer ${clave}`, apikey: clave });

const rutaCodificada = (ruta) => ruta.split('/').map(encodeURIComponent).join('/');

/** Indica si es la ruta de un objeto del bucket; las rutas locales empiezan con «/». */
const esRutaStorage = (ruta) =>
  typeof ruta === 'string' && ruta !== '' && !ruta.startsWith('/') && !/^(https?:|data:)/.test(ruta);

/** URL firmada y temporal si es de Storage; la misma si es local. */
async function urlDeFirma(ruta) {
  if (!ruta) return null;
  if (!esRutaStorage(ruta)) return ruta;
  const c = config();
  if (!c) return null;

  const enCache = urlsFirmadas.get(ruta);
  if (enCache && enCache.vence > Date.now()) return enCache.url;

  const r = await fetch(`${c.url}/storage/v1/object/sign/${BUCKET}/${rutaCodificada(ruta)}`, {
    method: 'POST',
    headers: { ...cabeceras(c.clave), 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: SEGUNDOS_URL }),
  });
  if (!r.ok) {
    console.warn(`[storage] No se pudo firmar ${ruta}: ${r.status}`);
    return null;
  }
  const { signedURL } = await r.json();
  const url = `${c.url}/storage/v1${signedURL}`;
  // Se reutiliza hasta un minuto antes de vencer
  urlsFirmadas.set(ruta, { url, vence: Date.now() + (SEGUNDOS_URL - 60) * 1000 });
  return url;
}

/** Imagen de una URL como data URI, o null. */
async function aDataUri(url) {
  const r = await fetch(url);
  if (!r.ok) return null;
  const tipo = r.headers.get('content-type') || 'image/png';
  const base64 = Buffer.from(await r.arrayBuffer()).toString('base64');
  return `data:${tipo};base64,${base64}`;
}

/** Sube un archivo al bucket sin reemplazar ninguno. */
async function subirFirma(ruta, contenido, tipo) {
  const c = config();
  if (!c) throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_KEY.');
  const r = await fetch(`${c.url}/storage/v1/object/${BUCKET}/${rutaCodificada(ruta)}`, {
    method: 'POST',
    headers: { ...cabeceras(c.clave), 'Content-Type': tipo, 'x-upsert': 'false' },
    body: contenido,
  });
  if (!r.ok) throw new Error(`No se pudo subir ${ruta}: ${r.status} ${await r.text()}`);
}

module.exports = { BUCKET, esRutaStorage, urlDeFirma, aDataUri, subirFirma };
