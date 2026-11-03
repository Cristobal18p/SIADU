import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  renderDocumento, documentoHtml, fechaFormal, fechaHoraPanama, valorVariable, datosEjemplo,
  repartirPaginas, capacidades, ALTO_UTIL_PX, pieHtml, contenidoDelPie, firmasHtml,
} from '../documento/index.js';

const doc = (...content) => ({ cuerpoDocumento: { type: 'doc', content } });
const p = (...content) => ({ type: 'paragraph', content });
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) });
const v = (id) => ({ type: 'variable', attrs: { id } });
const cuerpo = (html) => html.slice(html.indexOf('doc-pagina-cuerpo'), html.lastIndexOf('</section>'));

const VARIABLES = [
  { id: 'fecha', tipo: 'date', etiqueta: 'Fecha', requerido: true },
  { id: 'motivo', tipo: 'select', etiqueta: 'Motivo', requerido: true, opcionOtro: true,
    opciones: [{ valor: 'LABORAL', etiqueta: 'Cruce de horario laboral' }] },
  { id: 'acepto', tipo: 'checkbox', etiqueta: 'Declaración', requerido: true, textoLegal: 'Declaro…' },
  { id: 'nota', tipo: 'number', etiqueta: 'Nota', requerido: false },
];

test('fechas: formal y hora de Panamá sin depender de la zona horaria', () => {
  assert.equal(fechaFormal('2026-10-05'), '5 de octubre de 2026');
  assert.equal(fechaHoraPanama('2026-10-06T15:00:00Z'), '6 de octubre de 2026, 10:00 a. m.');
  assert.equal(fechaHoraPanama('2026-10-07T02:30:00Z'), '6 de octubre de 2026, 9:30 p. m.');
  assert.equal(fechaHoraPanama('2026-10-06T05:05:00Z'), '6 de octubre de 2026, 12:05 a. m.');
  assert.equal(fechaHoraPanama('2026-10-06T17:00:00Z'), '6 de octubre de 2026, 12:00 p. m.');
});

test('representación de valores según el contrato', () => {
  const [fecha, motivo, acepto, nota] = VARIABLES;
  assert.equal(valorVariable(fecha, '2026-01-15'), '15 de enero de 2026');
  assert.equal(valorVariable(motivo, 'LABORAL'), 'Cruce de horario laboral');
  assert.equal(valorVariable(motivo, 'OTRO', { motivoOtro: ' Viaje oficial ' }), 'Viaje oficial');
  assert.equal(valorVariable(acepto, true), 'Sí');
  assert.equal(valorVariable(acepto, false), '');
  assert.equal(valorVariable(nota, 0), '0');
  assert.equal(valorVariable(nota, undefined), '');
});

test('variables del formulario y automáticas; vacías no imprimen nada', () => {
  const html = renderDocumento({
    diseno: doc(p(t('Fecha: '), v('fecha'), t(' — '), v('auth.cedula'), t(' — '), v('nota'), v('estudiante.carrera'))),
    variables: VARIABLES,
    datos: { fecha: '2026-10-05' },
    sistema: { 'auth.cedula': '8-1-1', 'estudiante.carrera': null },
  });
  assert.match(html, /data-variable="fecha">5 de octubre de 2026</);
  assert.match(html, /data-variable="auth.cedula">8-1-1</);
  assert.doesNotMatch(html, /data-variable="nota"/);
  assert.doesNotMatch(html, /data-variable="estudiante.carrera"/);
});

test('escapa el texto y los valores: no se puede inyectar HTML', () => {
  const html = renderDocumento({
    diseno: doc(p(t('<script>alert(1)</script>'), v('nombre'))),
    variables: [{ id: 'nombre', tipo: 'text', etiqueta: 'Nombre', requerido: true }],
    datos: { nombre: '"><img src=x onerror=alert(1)>' },
  });
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;script&gt;/);
});

test('solo aplica marcas y atributos permitidos', () => {
  const html = cuerpo(renderDocumento({
    diseno: doc({
      type: 'paragraph',
      attrs: { textAlign: 'center', lineHeight: '1.5', indent: 2 },
      content: [
        t('a', [{ type: 'bold' }, { type: 'underline' }]),
        t('b', [{ type: 'textStyle', attrs: { fontFamily: 'Times New Roman', fontSize: '12pt' } }]),
        t('c', [{ type: 'textStyle', attrs: { fontFamily: 'Comic Sans', fontSize: '40pt' } }, { type: 'link' }]),
      ],
    }, { type: 'paragraph', attrs: { textAlign: 'x; color:red', lineHeight: '9' } }),
  }));
  assert.match(html, /text-align: center; line-height: 1.5; margin-left: calc\(2 \* 12.7mm\)/);
  assert.match(html, /<u><strong>a<\/strong><\/u>/);
  assert.match(html, /font-family: &#39;Times New Roman&#39;.*font-size: 12pt">b</);
  assert.match(html, />c</);
  assert.doesNotMatch(html, /Comic|40pt|color:red/);
  assert.match(html, /<p><br><\/p>/);
});

test('listas, tablas, saltos y nodos desconocidos', () => {
  const html = cuerpo(renderDocumento({
    diseno: doc(
      { type: 'orderedList', attrs: { start: 3 }, content: [{ type: 'listItem', content: [p(t('uno'), { type: 'hardBreak' }, t('dos'))] }] },
      { type: 'table', content: [{ type: 'tableRow', content: [
        { type: 'tableHeader', attrs: { colspan: 2, colwidth: [120] }, content: [p(t('H'))] },
        { type: 'tableCell', attrs: { rowspan: 1 }, content: [p(t('C'))] },
      ] }] },
      { type: 'pageBreak' },
      { type: 'iframe', content: [t('solo texto')] },
    ),
  }));
  assert.match(html, /<ol start="3"><li><p>uno<br>dos<\/p><\/li><\/ol>/);
  assert.match(html, /<th colspan="2" style="width: 120px"><p>H<\/p><\/th><td><p>C<\/p><\/td>/);
  assert.match(html, /doc-salto-pagina/);
  assert.match(html, /solo texto/);
  assert.doesNotMatch(html, /<iframe/);
});

test('bloque de firmas: solo pasos con reqFirma, en orden; aprobados con firma y pendientes en recuadro', () => {
  const pasos = [
    { secuencia: 3, nombreCargo: 'Decano', titular: 'Dr. Demo', reqFirma: true, estado: null },
    { secuencia: 1, nombreCargo: 'Director', titular: 'Dra. Muestra', area: 'Escuela', reqFirma: true,
      estado: 'APROBADO', fechaAccion: '2026-10-06T15:00:00Z', firmaUrl: '/firmas/12.png' },
    { secuencia: 2, nombreCargo: 'Secretaría', titular: 'Ana', reqFirma: false, estado: 'APROBADO' },
  ];
  const html = renderDocumento({ diseno: doc({ type: 'signatureBlock', attrs: { columnas: 3 } }), pasos });
  const casillas = html.match(/class="doc-firma"/g) || [];
  assert.equal(casillas.length, 2);
  assert.ok(html.indexOf('Director') < html.indexOf('Decano'));
  assert.doesNotMatch(html, /Secretaría/);
  assert.match(html, /<img src="\/firmas\/12.png"/);
  assert.match(html, /Aprobado el 6 de octubre de 2026, 10:00 a\. m\./);
  assert.match(html, /\[Pendiente de Aprobación y Firma\]/);
});

test('bloque de firmas sin flujo muestra el aviso', () => {
  const html = renderDocumento({ diseno: doc({ type: 'signatureBlock' }) });
  assert.match(html, /Firmas según el flujo de aprobación/);
});

test('firmasHtml (editor): las mismas casillas que el documento, 3 firmas en dos filas', () => {
  const pasos = [1, 2, 3].map((secuencia) => ({ secuencia, nombreCargo: `Cargo ${secuencia}`, reqFirma: true }));
  const html = firmasHtml(pasos);
  assert.equal((html.match(/class="doc-firma"/g) || []).length, 3);
  assert.equal((html.match(/\[Pendiente de Aprobación y Firma\]/g) || []).length, 3);
  assert.ok(renderDocumento({ diseno: doc({ type: 'signatureBlock' }), pasos }).includes(html));
  assert.match(firmasHtml([]), /Firmas según el flujo de aprobación/);
  assert.match(firmasHtml([{ secuencia: 1, nombreCargo: 'X', reqFirma: false }]), /Firmas según el flujo de aprobación/);
});

test('bloque de firmas por filas: 4 firmas son 2 piezas y se pueden repartir en dos hojas', () => {
  const pasos = [1, 2, 3, 4].map((secuencia) => ({ secuencia, nombreCargo: `Cargo ${secuencia}`, reqFirma: true }));
  const html = firmasHtml(pasos);
  const piezas = html.match(/<div class="doc-firmas[^"]*">/g);
  assert.deepEqual(piezas, ['<div class="doc-firmas doc-firmas-sigue">', '<div class="doc-firmas doc-firmas-continua">']);
  assert.equal((html.match(/class="doc-firma"/g) || []).length, 4);
  // 3 firmas: dos arriba y una sola abajo (centrada por la pieza)
  assert.equal((firmasHtml(pasos.slice(0, 3)).match(/<div class="doc-firmas/g) || []).length, 2);
  // Una sola fila no lleva clases de continuación
  assert.match(firmasHtml(pasos.slice(0, 2)), /^<div class="doc-firmas">/);

  // Texto que deja sitio solo para una fila: la primera queda en la hoja 1 y la segunda pasa a la 2
  const { paginas } = repartirPaginas(
    [{ alto: 700, margen: 10 }, { alto: 150, margen: 0 }, { alto: 140, margen: 10 }],
    { altoPrimera: 870, altoResto: 900 }
  );
  assert.deepEqual(paginas, [[0, 1], [2]]);
});

test('marcas de agua según el estado y escudo siempre presente', () => {
  const base = { diseno: doc(p(t('x'))) };
  assert.match(renderDocumento({ ...base, estado: 'PENDIENTE' }), /doc-marca-estado pendiente/);
  assert.match(renderDocumento({ ...base, estado: 'RECHAZADO' }), /Solicitud rechazada/);
  assert.doesNotMatch(renderDocumento({ ...base, estado: 'APROBADO' }), /doc-marca-estado/);
  assert.match(renderDocumento(base), /escudo_up.png/);
});

test('las líneas del membrete resuelven marcadores {{id}} y se omiten si no hay valor', () => {
  const diseno = {
    encabezado: { activo: true, linea1: 'UNIVERSIDAD DE PANAMÁ', linea3: '{{estudiante.escuela}}' },
    cuerpoDocumento: { type: 'doc', content: [] },
  };
  const conEscuela = renderDocumento({ diseno, sistema: { 'estudiante.escuela': 'Escuela de Mecatrónica' } });
  assert.match(conEscuela, /doc-encabezado-linea3">ESCUELA DE MECATRÓNICA</);
  const sinEscuela = renderDocumento({ diseno, sistema: { 'estudiante.escuela': null } });
  assert.doesNotMatch(sinEscuela, /doc-encabezado-linea3/);
  assert.doesNotMatch(sinEscuela, /\{\{/);
});

test('encabezado, pie, formato y resolución de recursos', () => {
  const html = documentoHtml({
    diseno: {
      formato: { fuente: 'Times New Roman', tamano: '12pt', interlineado: '1.5' },
      encabezado: { activo: true, logoIzqUrl: '/logos/escudo_up.png', logoDerUrl: null, linea1: 'UNIVERSIDAD DE PANAMÁ', linea3: '' },
      cuerpoDocumento: { type: 'doc', content: [] },
      piePagina: { activo: true, lemaOficial: 'Lema', direccion: 'Estafeta', telefonos: '' },
    },
    recurso: (url) => `http://localhost:7001${url}`,
  });
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /font-size: 12pt; line-height: 1.5/);
  assert.match(html, /<img src="http:\/\/localhost:7001\/logos\/escudo_up.png"/);
  assert.match(html, /doc-encabezado-linea1">UNIVERSIDAD DE PANAMÁ/);
  assert.doesNotMatch(html.slice(html.indexOf("<body>")), /doc-encabezado-linea3/);
  assert.ok(html.includes('<p style="text-align: center"><em>Lema</em></p><p style="text-align: center">Estafeta</p>'));
  assert.match(html, /@page/);
});

test('datos de ejemplo para la vista previa del constructor', () => {
  assert.deepEqual(datosEjemplo(VARIABLES), { fecha: '2026-10-05', motivo: 'LABORAL', acepto: true, nota: 1 });
});

test('el servidor (CommonJS) puede cargar el módulo', () => {
  const require = createRequire(import.meta.url);
  const modulo = require('../documento/index.js');
  assert.equal(typeof modulo.documentoHtml, 'function');
});

test('alto útil de la hoja Carta: 279.4 − 25 − 20 mm en px CSS', () => {
  assert.equal(Math.round(ALTO_UTIL_PX * 100) / 100, Math.round(((279.4 - 45) * 96) / 25.4 * 100) / 100);
  assert.deepEqual(capacidades({ altoUtil: 900, membrete: 120, pie: 60 }), { altoPrimera: 720, altoResto: 840 });
});

test('reparto en hojas: corta entre bloques, el membrete solo resta en la primera', () => {
  const b = (alto, extra = {}) => ({ alto, margen: 10, ...extra });
  const { paginas, usados } = repartirPaginas([b(300), b(300), b(130), b(300), b(500)], { altoPrimera: 720, altoResto: 840 });
  // 300+300+130-10 = 720 cabe justo en la primera (el margen del último no cuenta)
  assert.deepEqual(paginas, [[0, 1, 2], [3, 4]]);
  assert.deepEqual(usados, [730, 800]);
});

test('reparto en hojas: salto manual y bloque más alto que una hoja', () => {
  const capacidad = { altoPrimera: 500, altoResto: 600 };
  assert.deepEqual(repartirPaginas([{ alto: 100 }, { alto: 0, salto: true }, { alto: 100 }], capacidad).paginas, [[0, 1], [2]]);
  // Un salto al final no crea una hoja vacía
  assert.deepEqual(repartirPaginas([{ alto: 100 }, { alto: 0, salto: true }], capacidad).paginas, [[0, 1]]);
  // Un bloque que no cabe en ninguna hoja queda solo en la suya (no se generan hojas vacías)
  assert.deepEqual(repartirPaginas([{ alto: 100 }, { alto: 900 }, { alto: 50 }], capacidad).paginas, [[0], [1], [2]]);
  assert.deepEqual(repartirPaginas([], capacidad).paginas, [[]]);
});

test('pie con paginación: siempre una línea propia para que su alto no cambie entre hojas', () => {
  const pie = { activo: true, lemaOficial: 'Lema', mostrarPaginacion: true };
  assert.match(pieHtml(pie, { pagina: 2, total: 5 }), /data-paginacion>Página 2 de 5</);
  assert.doesNotMatch(pieHtml({ ...pie, mostrarPaginacion: false }), /Página/);
  assert.equal(pieHtml({ ...pie, activo: false }), '');
});

test('el documento trae una hoja inicial y el script que la reparte', () => {
  const html = documentoHtml({ diseno: { cuerpoDocumento: { type: 'doc', content: [] } } });
  assert.match(html, /<section class="doc-pagina" data-pagina="1">/);
  assert.ok(html.includes("<script>(function () {"));
  assert.match(html, /function paginarDocumento/);
  assert.match(html, /function repartirPaginas/);
});

test('el nonce de la política de contenido va en el script, escapado; sin nonce no se agrega', () => {
  const diseno = { cuerpoDocumento: { type: 'doc', content: [] } };
  assert.ok(documentoHtml({ diseno, nonce: 'abc123==' }).includes('<script nonce="abc123==">'));
  assert.ok(documentoHtml({ diseno, nonce: '"><b>' }).includes('nonce="&quot;&gt;&lt;b&gt;"'));
  assert.ok(documentoHtml({ diseno }).includes('<script>(function'));
});

test('pie con formato: alineación, marcas y tamaños del pie; nada fuera de lo permitido', () => {
  const contenido = { type: 'doc', content: [
    { type: 'paragraph', attrs: { textAlign: 'right' }, content: [
      { type: 'text', text: 'Lema', marks: [{ type: 'bold' }, { type: 'textStyle', attrs: { fontSize: '10pt' } }] },
      { type: 'hardBreak' },
      { type: 'text', text: 'grande', marks: [{ type: 'textStyle', attrs: { fontSize: '12pt' } }] },
    ] },
    { type: 'paragraph', attrs: { textAlign: 'justify' } },
    { type: 'heading', content: [{ type: 'text', text: 'solo texto' }] },
  ] };
  const html = pieHtml({ activo: true, contenido });
  assert.ok(html.includes('<p style="text-align: right"><span style="font-size: 10pt"><strong>Lema</strong></span><br>grande</p>'));
  assert.ok(html.includes('<p style="text-align: center"><br></p>'));
  assert.match(html, /solo texto/);
  assert.doesNotMatch(html, /12pt|<h1|justify/);
});

test('pie anterior a 2.3.0: se convierte (lema en cursiva, centrado) y el contenido guardado tiene prioridad', () => {
  const viejo = { lemaOficial: 'L', direccion: 'D', telefonos: '' };
  assert.deepEqual(contenidoDelPie(viejo).content.map((p) => p.content[0].text), ['L', 'D']);
  assert.deepEqual(contenidoDelPie(viejo).content[0].content[0].marks, [{ type: 'italic' }]);
  const nuevo = { ...viejo, contenido: { type: 'doc', content: [{ type: 'paragraph' }] } };
  assert.equal(contenidoDelPie(nuevo), nuevo.contenido);
  assert.equal(contenidoDelPie({}).content.length, 1);
});
