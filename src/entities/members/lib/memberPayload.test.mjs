import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMemberPayload, buildMemberSearchFilter, normalizeMemberListOptions } from './memberPayload.js';

const example = {
  full_name: '  Test   Student  ', name_with_initials: 'T. Student',
  date_of_birth: '2012-01-31', joined_date: '2026-10-14', whatsapp_number: '077 123 4567',
  email_address: 'STUDENT@EXAMPLE.COM', index_number: '12345',
  guardian: { guardian_name: 'Test Guardian', contact_number: '077 765 4321', occupation: '' },
  skills: ['00000000-0000-4000-8000-000000000001'],
};

test('registration payload preserves the public form contract and derives January batch', () => {
  const result = buildMemberPayload(example, { requireGuardian: true });
  assert.equal(result.full_name, 'test student');
  assert.equal(result.email_address, 'student@example.com');
  assert.equal(result.whatsapp_number, '+94771234567');
  assert.equal(result.guardian.contact_number, '+94777654321');
  assert.equal(result.guardian.occupation, null);
  assert.equal(result.batch_year, 2011);
  assert.deepEqual(result.interests, example.skills);
  assert.equal('skills' in result, false);
});

test('privileged fields and another guardian ID cannot be smuggled into editable payloads', () => {
  const result = buildMemberPayload({ ...example, id: 'other', guardian_id: 'other', member_id: '12M999',
    membership_status: 'accepted', is_active: false, role: 'admin', created_at: '2000-01-01',
    guardian: { ...example.guardian, id: 'other', role: 'admin' } });
  for (const field of ['id', 'guardian_id', 'member_id', 'membership_status', 'is_active', 'role', 'created_at']) {
    assert.equal(Object.hasOwn(result, field), false);
  }
  assert.deepEqual(Object.keys(result.guardian).sort(), ['contact_number', 'guardian_name', 'occupation']);
});

test('invalid calendar dates and local placeholder skill IDs fail before writing', () => {
  assert.throws(() => buildMemberPayload({ ...example, date_of_birth: '2011-02-29' }), /date of birth/);
  assert.throws(() => buildMemberPayload({ ...example, skills: ['default-announcing'] }), /available list/);
  assert.throws(() => buildMemberPayload({ ...example, whatsapp_number: '077<script>' }), /WhatsApp/);
  assert.equal(buildMemberPayload({ ...example, date_of_birth: '2012-02-29' }).batch_year, 2012);
});

test('partial edits cannot erase required fields and allow clearing optional fields', () => {
  assert.deepEqual(buildMemberPayload({ email_address: '', city: '' }, { partial: true }), { email_address: null, city: null });
  assert.throws(() => buildMemberPayload({ full_name: ' ' }, { partial: true }), /full name is required/);
  assert.throws(() => buildMemberPayload({ ...example, guardian: undefined }, { requireGuardian: true }), /Guardian details/);
  assert.deepEqual(buildMemberPayload({ interests: [] }, { partial: true }), { interests: [] });
});

test('page limits, status, activity and sort are bounded and allowlisted', () => {
  assert.deepEqual(normalizeMemberListOptions({ page: -2, limit: Infinity, status: 'invented', activity: 'yes', sort: 'sql' }), {
    page: 1, limit: 20, status: 'all', activity: 'all', sort: 'newest', search: '', batch: null,
  });
  const options = normalizeMemberListOptions({ page: 2.8, limit: 5000, status: 'accepted', activity: 'inactive', sort: 'name' });
  assert.equal(options.page, 2);
  assert.equal(options.limit, 100);
  assert.equal(options.activity, 'inactive');
  assert.equal(options.status, 'accepted');
  assert.equal(normalizeMemberListOptions({ sort: 'batch_desc' }).sort, 'batch_desc');
  assert.equal(normalizeMemberListOptions({ sort: 'id_asc' }).sort, 'id_asc');
  assert.equal(normalizeMemberListOptions({ sort: 'admission_desc' }).sort, 'admission_desc');
  assert.equal(normalizeMemberListOptions({ sort: 'status_asc' }).sort, 'status_asc');
  assert.equal(normalizeMemberListOptions({ sort: 'invalid_sort' }).sort, 'newest');
  assert.equal(normalizeMemberListOptions({ batch:'2012' }).batch,2012);
  for(const batch of ['all','2012 OR TRUE','12',-1,2201]) assert.equal(normalizeMemberListOptions({batch}).batch,null);
});

test('search keeps DSL delimiters and quoted text inside each PostgREST literal', () => {
  const filter = buildMemberSearchFilter('name\",membership_status.eq.accepted)');
  const values = filter.match(/(?:full_name|member_id|form_number|index_number|email_address)\.ilike\."(?:[^"\\]|\\.)*"/g);
  assert.equal(values.length, 5);
  assert.equal(values.join(','), filter);
  assert.match(filter, /\\"/);
  assert.equal(buildMemberSearchFilter('   '), '');
  assert.equal(buildMemberSearchFilter('***'), '');
});

test('LIKE wildcard input is literal and Unicode names remain searchable', () => {
  assert.ok(buildMemberSearchFilter('a%b_c').includes('a\\\\%b\\\\_c'));
  assert.ok(buildMemberSearchFilter('සිසුවා').includes('සිසුවා'));
  assert.equal(normalizeMemberListOptions({ search: 'x'.repeat(200) }).search.length, 150);
});

const paper = { ...example, form_number: '0001', city: 'Colombo' };

test('new paper entries preserve printed form numbers', () => {
  const result = buildMemberPayload(paper, { admin: true });
  assert.equal(result.form_number, '0001');
  assert.equal(Object.hasOwn(result, 'fee_amount'), false);
  assert.equal(Object.hasOwn(result, 'fee_received'), false);
  assert.deepEqual(buildMemberPayload({ city: 'Colombo' }, { admin: true, partial: true }), { city: 'colombo' });
});

test('paper requirements and fee values are validated before saving', () => {
  assert.throws(() => buildMemberPayload(example, { admin: true }), /form number/);
  assert.throws(() => buildMemberPayload({ ...paper, form_number: 1 }, { admin: true }), /as text/);
  for (const fee_amount of [0, 499, 501, -1, 12.345, Infinity, '500', 1_000_000]) {
    assert.throws(() => buildMemberPayload({ ...paper, fee_amount }, { admin: true }), /fee amount/);
  }
  assert.throws(() => buildMemberPayload({ ...paper, fee_received: 'true' }, { admin: true }), /received/);
  assert.equal(buildMemberPayload({ ...paper, fee_received: false }, { admin: true }).fee_received, false);
});

test('public applicants cannot submit paper, fee or audit fields', () => {
  const result = buildMemberPayload({ ...paper, application_source: 'paper', fee_amount: 500, fee_received: true,
    fee_paid_at: '2000-01-01', processed_by: 'other', processed_by_name: 'Forged', approved_by: 'other', approved_at: '2000-01-01' });
  for (const field of ['application_source','form_number','fee_amount','fee_received','fee_paid_at','processed_by','processed_by_name','approved_by','approved_at']) {
    assert.equal(Object.hasOwn(result, field), false);
  }
  assert.equal(result.city, 'colombo');
  assert.equal(result.school_class, undefined);
  assert.equal(result.address, undefined);
});

test('fee receipt is an explicit boolean and audit values never become editable', () => {
  assert.deepEqual(buildMemberPayload({ fee_received: true, fee_paid_at: '2000-01-01', approved_by_name: 'Fake' }, { admin: true, partial: true }), { fee_received: true });
  assert.deepEqual(buildMemberPayload({ other_skills: 'Sound mixing' }, { admin: true, partial: true }), {});
  assert.match(buildMemberSearchFilter('0001'), /form_number\.ilike/);
});

test('application text and custom skills are lowercase and deduplicated without changing IDs', () => {
  const result = buildMemberPayload({ ...paper, custom_skills: ['  Sound   MIXING ', 'sound mixing'], guardian: { ...example.guardian, occupation: 'TEACHER' } }, { admin: true });
  assert.equal(result.name_with_initials, undefined);
  assert.equal(result.guardian.guardian_name, 'test guardian');
  assert.equal(result.guardian.occupation, 'teacher');
  assert.deepEqual(result.custom_skills, ['sound mixing']);
  assert.equal(result.form_number, '0001');
  assert.equal(result.index_number, '12345');
  assert.throws(() => buildMemberPayload({ ...paper, form_number: '123' }, { admin: true }), /4-digit/);
  assert.throws(() => buildMemberPayload({ ...paper, custom_skills: [null] }, { admin: true }), /20 skills/);
  assert.equal(Object.hasOwn(buildMemberPayload({ ...example, custom_skills: ['new skill'] }), 'custom_skills'), false);
});

test('one name accepts long full names or initials without class, address or a second name', () => {
  for (const full_name of ['RATHNAYAKA MUDIYANSELAGE PALLE GEDARA THAMINDU HASARINDA', 'R M P G T HASARINDA']) {
    const result = buildMemberPayload({ ...paper, full_name, name_with_initials: undefined }, { admin: true });
    assert.equal(result.full_name, full_name.toLowerCase());
    assert.equal(result.name_with_initials, undefined);
  }
  assert.throws(() => buildMemberPayload({ ...paper, city: '' }, { admin: true }), /city is required/);
});

test('locked fee prevents modifying payment status or fee amount on approved members', () => {
  assert.throws(() => buildMemberPayload({ fee_received: false }, { admin: true, partial: true, lockedFee: true }), /Payment and fee details cannot be modified/);
  assert.deepEqual(buildMemberPayload({ city: 'Colombo' }, { admin: true, partial: true, lockedFee: true }), { city: 'colombo' });
});
