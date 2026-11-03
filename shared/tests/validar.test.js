import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PATRONES_TEXTO, validarDefinicion, validarPublicacion } from '../documento/validar.js';

const doc = (...content) => ({ type: 'doc', content: [{ type: 'paragraph', content }] });
const variable = (id) => ({ type: 'variable', attrs: { id } });
const campos = (detalles) => detalles.map((d) => d.campo);

test('validarDefinicion acepta una plantilla correcta y un borrador vacío', () => {
  const variables = [{ id: 'motivo', etiqueta: 'Motivo', tipo: 'select', requerido: true, opciones: [{ valor: 'A', etiqueta: 'A' }] }];
  assert.deepEqual(validarDefinicion({ variables }, { cuerpoDocumento: doc(variable('motivo'), variable('auth.cedula')) }), []);
  assert.deepEqual(validarDefinicion({ variables: [] }, { cuerpoDocumento: { type: 'doc', content: [] } }), []);
});

test('validarDefinicion: ids, select, checkbox y min/max', () => {
  const variables = [
    { id: '1x', etiqueta: 'Mal', tipo: 'text' },
    { id: 'a', etiqueta: 'A', tipo: 'select', opciones: [], opcionOtro: true },
    { id: 'aOtro', etiqueta: 'Choque', tipo: 'text' },
    { id: 'a', etiqueta: 'Repetida', tipo: 'text' },
    { id: 'acepto', etiqueta: 'Acepto', tipo: 'checkbox' },
    { id: 'horas', etiqueta: 'Horas', tipo: 'number', validaciones: { min: 5, max: 1 } },
  ];
  const cuerpo = doc(...['a', 'aOtro', 'acepto', 'horas'].map(variable));
  const r = campos(validarDefinicion({ variables }, { cuerpoDocumento: cuerpo }));
  assert.ok(r.includes('variableFormJson.variables[0].id'));
  assert.ok(r.includes('variableFormJson.variables[1].opciones'));
  assert.ok(r.includes('variableFormJson.variables[1].id'));
  assert.ok(r.includes('variableFormJson.variables[3].id'));
  assert.ok(r.includes('variableFormJson.variables[4].textoLegal'));
  assert.ok(r.includes('variableFormJson.variables[5].validaciones'));
});

test('validarDefinicion: solo acepta los formatos predefinidos de texto', () => {
  const definicion = (patron) => validarDefinicion(
    { variables: [{ id: 'codigo', etiqueta: 'Código', tipo: 'text', validaciones: { patron } }] },
    { cuerpoDocumento: doc(variable('codigo')) }
  );
  assert.deepEqual(definicion(PATRONES_TEXTO[0]), []);
  assert.deepEqual(definicion(''), []);
  assert.deepEqual(campos(definicion('(a+)+$')), ['variableFormJson.variables[0].validaciones.patron']);
});

test('validarDefinicion: variables sin definir o sin usar, firmas repetidas y marcadores del membrete', () => {
  const r = validarDefinicion(
    { variables: [{ id: 'sobra', etiqueta: 'Sobra', tipo: 'text' }] },
    {
      encabezado: { linea3: '{{estudiante.escuela}}', linea4: '{{inventada}}' },
      cuerpoDocumento: { type: 'doc', content: [{ type: 'signatureBlock' }, { type: 'signatureBlock' }, doc(variable('falta')).content[0]] },
    }
  );
  const mensajes = r.map((d) => d.mensaje).join(' | ');
  assert.match(mensajes, /«falta» no está definida/);
  assert.match(mensajes, /«sobra» no se usa/);
  assert.match(mensajes, /más de un bloque de firmas/);
  assert.ok(campos(r).includes('disenoFormJson.encabezado.linea4'));
  assert.ok(!campos(r).includes('disenoFormJson.encabezado.linea3'));
});

test('validarPublicacion exige contenido y el bloque de firmas si algún paso firma', () => {
  const vacio = { cuerpoDocumento: { type: 'doc', content: [] } };
  assert.match(validarPublicacion({ variables: [] }, vacio)[0].mensaje, /vacío/);
  const sinFirmas = { cuerpoDocumento: doc({ type: 'text', text: 'Hola' }) };
  assert.equal(validarPublicacion({ variables: [] }, sinFirmas, { conFirma: true }).length, 1);
  assert.deepEqual(validarPublicacion({ variables: [] }, sinFirmas, { conFirma: false }), []);
});
