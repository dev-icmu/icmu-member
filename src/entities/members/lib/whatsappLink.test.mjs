import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApprovalWhatsappLink } from './whatsappLink.js';

const member = Object.freeze({
  membership_status: 'accepted', is_active: true, member_id: '12M001',
  full_name: 'r m p g t hasarinda', whatsapp_number: '+94771234567', joined_date: '2026-10-14',
});

test('approval drafts target only wa.me with the exact recipient and readable member details', () => {
  const link = buildApprovalWhatsappLink(member);
  const url = new URL(link);
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/94771234567');
  assert.equal(url.hash, '');
  assert.equal(url.username, '');
  assert.equal(url.password, '');
  assert.deepEqual([...url.searchParams.keys()], ['text']);
  const expectedText = [
    'Hello *R. M. P. G. T. HASARINDA*,',
    '',
    'Your *Isipathana College Media Unit* membership has been approved.',
    '',
    '• *Member ID:* 12M001',
    '• *Joined date:* 14 Oct 2026',
    '',
    'Please collect your membership receipt from the ICMU team.',
  ].join('\n');
  assert.equal(url.searchParams.get('text'), expectedText);
  assert.equal(buildApprovalWhatsappLink(member), link);
  assert.equal(member.full_name, 'r m p g t hasarinda');
});

test('Unicode names and URL delimiters remain inside the encoded message', () => {
  const link = buildApprovalWhatsappLink({ ...member, full_name: '  émilie & කවිඳු #one?x=2  ' });
  const url = new URL(link);
  assert.ok(link.includes('%26'));
  assert.ok(link.includes('%23'));
  assert.ok(link.includes('%3F'));
  assert.ok(link.includes('%E0'));
  assert.ok(url.searchParams.get('text').startsWith('Hello *É. & ක. #ONE?X=2*,'));
  assert.deepEqual([...url.searchParams.keys()], ['text']);
  assert.equal(url.hash, '');
});

test('phone formatting is removed without guessing a country code', () => {
  assert.equal(new URL(buildApprovalWhatsappLink({ ...member, whatsapp_number: ' +94 (77) 123-4567 ' })).pathname, '/94771234567');
  assert.equal(new URL(buildApprovalWhatsappLink({ ...member, whatsapp_number: '+442079460123' })).pathname, '/442079460123');
  assert.equal(new URL(buildApprovalWhatsappLink({ ...member, whatsapp_number: '+123456789012345' })).pathname, '/123456789012345');
  for (const phone of ['', null, 94771234567, '0771234567', '94771234567', '0094771234567', '+04771234567', '+1', '+1234567890123456', '+94/771234567', '+94771234567?text=wrong', '+94771234567#extra', '+9477abc4567', '++94771234567']) {
    assert.equal(buildApprovalWhatsappLink({ ...member, whatsapp_number: phone }), null, String(phone));
  }
});

test('drafts require an active approved member and complete identity fields', () => {
  for (const value of [null, undefined, {}, { ...member, membership_status: 'pending' }, { ...member, membership_status: 'rejected' }, { ...member, is_active: false }, { ...member, is_active: undefined }, { ...member, is_active: 'true' }]) {
    assert.equal(buildApprovalWhatsappLink(value), null);
  }
  for (const value of ['', null, undefined, 12001, '12m001', '12M01', '12M0001', '12M001?other=1']) {
    assert.equal(buildApprovalWhatsappLink({ ...member, member_id: value }), null);
  }
  for (const value of ['', '   ', null, undefined]) {
    assert.equal(buildApprovalWhatsappLink({ ...member, full_name: value }), null);
  }
});

test('joined dates must be real date-only calendar values and retain their Colombo day', () => {
  const leap = new URL(buildApprovalWhatsappLink({ ...member, joined_date: '2024-02-29' }));
  assert.ok(leap.searchParams.get('text').includes('*Joined date:* 29 Feb 2024'));
  const yearBoundary = new URL(buildApprovalWhatsappLink({ ...member, joined_date: '2026-01-01' }));
  assert.ok(yearBoundary.searchParams.get('text').includes('*Joined date:* 01 Jan 2026'));
  for (const date of ['', null, undefined, new Date('2026-10-14'), 'invalid', '2026-02-29', '2026-02-30', '2026-13-01', '2026-00-10', '2026-10-00', '0000-01-01', '2026-1-1', '14/10/2026', '2026-10-14T23:59:59Z']) {
    assert.equal(buildApprovalWhatsappLink({ ...member, joined_date: date }), null, String(date));
  }
});
