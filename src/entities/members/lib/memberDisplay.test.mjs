import test from 'node:test';
import assert from 'node:assert/strict';
import { nameWithInitials } from './memberDisplay.js';

test('table initials handle full names, existing initials and whitespace', () => {
  const expected = 'R. M. P. G. T. Hasarinda';
  for (const name of [
    'RATHNAYAKA MUDIYANSELAGE PALLE GEDARA THAMINDU HASARINDA',
    'r m p g t hasarinda', 'R.M.P.G.T. HASARINDA',
    '  R.  M. P. G. T.   Hasarinda  ',
  ]) assert.equal(nameWithInitials(name), expected);
  assert.equal(nameWithInitials('KAVINDU'), 'Kavindu');
  assert.equal(nameWithInitials(''), '');
  assert.equal(nameWithInitials(null), '');
  assert.equal(nameWithInitials('  '), '');
});

test('table initials preserve Unicode marks and the complete last name', () => {
  assert.equal(nameWithInitials('Émilie anne-marie de silva'), 'É. A. D. Silva');
  assert.equal(nameWithInitials('කවිඳු පෙරේරා'), 'ක. පෙරේරා');
});
