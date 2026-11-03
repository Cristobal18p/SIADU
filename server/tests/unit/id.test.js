const test = require('node:test');
const assert = require('node:assert/strict');
const { idDe } = require('../../utils/id');

test('idDe acepta enteros positivos y rechaza el resto', () => {
  assert.equal(idDe('42'), 42);
  assert.equal(idDe(7), 7);
  for (const malo of ['0', '-1', '1.5', '1e3', 'abc', '', undefined, null, '9'.repeat(16)]) {
    assert.equal(idDe(malo), null, String(malo));
  }
});
