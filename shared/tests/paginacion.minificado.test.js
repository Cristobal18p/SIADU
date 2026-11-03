/**
 * El script de paginación sigue funcionando con el módulo minificado como en el build de Vite.
 * Necesita esbuild (dependencias del cliente); sin él, la prueba se omite.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import vm from 'node:vm';

const requerir = createRequire(fileURLToPath(new URL('../../client/package.json', import.meta.url)));
let esbuild = null;
try { esbuild = requerir('esbuild'); } catch { /* sin esbuild no hay prueba */ }

test('el script de paginación funciona con el módulo minificado', { skip: !esbuild && 'esbuild no está instalado' }, async () => {
  const entrada = fileURLToPath(new URL('../documento/paginacion.js', import.meta.url));
  const { outputFiles } = await esbuild.build({
    entryPoints: [entrada], bundle: true, minify: true, format: 'esm', write: false, outfile: 'salida.mjs',
  });
  const carpeta = mkdtempSync(join(tmpdir(), 'paginacion-'));
  try {
    const archivo = join(carpeta, 'paginacion.min.mjs');
    writeFileSync(archivo, outputFiles[0].text);
    const { SCRIPT_PAGINACION } = await import(pathToFileURL(archivo).href);

    // Con el nombre minificado, el módulo ya no se llama `paginarDocumento`: el script debe definirlo él mismo
    assert.match(SCRIPT_PAGINACION, /var paginarDocumento = /);
    assert.match(SCRIPT_PAGINACION, /var repartirPaginas = /);

    // Ejecución en un "navegador" mínimo: debe llegar hasta medir el documento
    let consultas = 0;
    const documento = { images: [], fonts: null, querySelector: () => { consultas += 1; return null; } };
    vm.runInNewContext(SCRIPT_PAGINACION, { document: documento, Promise, Array });
    await new Promise((listo) => setTimeout(listo, 20));
    assert.equal(consultas, 1, 'paginarDocumento no se ejecutó (¿ReferenceError dentro del script?)');
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
});
