import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationFieldError as error, localPhone, dateDigits, dateFromDigits } from './applicationForm.js';
import { phoneValue } from './memberPayload.js';

test('leading zeros survive local/international phone entry and storage', () => {
  for (const value of ['0701234567', '+94 70 123 4567', '94701234567', '0094701234567']) {
    assert.equal(localPhone(value), '0701234567');
    assert.equal(phoneValue(value), '+94701234567');
  }
  assert.equal(error('whatsapp_number', '0701234567'), '');
  assert.ok(error('contact_number', '070123456'));
  assert.ok(error('contact_number', '07012345678'));
  assert.equal(localPhone('+442079460958'), '+442079460958');
});

test('digit fields check exact form and admission lengths without numeric coercion', () => {
  assert.equal(error('form_number', '0001'), '');
  assert.equal(error('index_number', '00123'), '');
  for (const value of ['123', '12345', '1e03', '00a1']) assert.ok(error('form_number', value));
  assert.ok(error('index_number', '1234'));
  assert.equal(error('index_number', '', { isPaper: false }), '');
});

test('calendar dates reject impossible, future and reversed dates', () => {
  assert.equal(dateFromDigits('20120229'), '2012-02-29');
  assert.equal(dateDigits('2012-02-29'), '20120229');
  assert.equal(error('date_of_birth', '2012-02-29', { today: '2026-10-14' }), '');
  assert.ok(error('date_of_birth', '2011-02-29'));
  assert.ok(error('date_of_birth', '2026-10-14', { today: '2026-10-14' }));
  assert.ok(error('joined_date', '2010-01-01', { form: { date_of_birth: '2012-02-29' } }));
  assert.ok(error('joined_date', '2030-01-01', { today: '2026-10-14' }));
});

test('required text ignores whitespace and optional text still validates', () => {
  assert.ok(error('full_name', '  '));
  assert.ok(error('guardian_name', 'a'));
  assert.ok(error('city', ''));
  assert.ok(error('email_address', ''));
  assert.equal(error('email_address', 'student@example.com'), '');
  assert.ok(error('email_address', 'not-an-email'));
  assert.equal(error('full_name', 'සිසුවාගේ නම'), '');
  assert.equal(error('occupation', ''), '');
  assert.ok(error('occupation', 'x'.repeat(101)));
});
