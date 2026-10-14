const STATUSES = new Set(['all', 'pending', 'accepted', 'rejected']);
const ACTIVITIES = new Set(['all', 'active', 'inactive']);
const SORTS = new Set([
  'newest', 'oldest',
  'name', 'name_asc', 'name_desc',
  'id_asc', 'id_desc',
  'admission_asc', 'admission_desc',
  'batch_asc', 'batch_desc',
  'status_asc', 'status_desc',
  'form_asc', 'form_desc',
  'joined_asc', 'joined_desc',
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQUIRED_FIELDS = ['full_name', 'date_of_birth', 'joined_date', 'whatsapp_number'];
const TEXT_FIELDS = ['index_number', 'full_name', 'city', 'email_address'];
export const MEMBERSHIP_FEE_LKR = 500;
export const normalizeApplicationText = value => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

const cleanText = value => String(value ?? '').trim().replace(/\s+/g, ' ');

function positiveInteger(value, fallback, maximum) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 1 ? Math.min(Math.floor(number), maximum) : fallback;
}

export function normalizeMemberListOptions(options = {}) {
  const result = {
    page: positiveInteger(options.page, 1, 1_000_000),
    limit: positiveInteger(options.limit, 20, 100),
    search: cleanText(options.search).replace(/\*/g, '').slice(0, 150),
    status: STATUSES.has(options.status) ? options.status : 'all',
    activity: ACTIVITIES.has(options.activity) ? options.activity : 'all',
    sort: SORTS.has(options.sort) ? options.sort : 'newest',
    batch: /^\d{4}$/.test(String(options.batch)) && Number(options.batch) >= 1939 && Number(options.batch) <= 2200 ? Number(options.batch) : null,
  };
  if (typeof options.skill === 'string' && UUID.test(options.skill)) {
    result.skill = options.skill;
  }
  if (Array.isArray(options.statuses)) {
    result.statuses = options.statuses.filter(s => STATUSES.has(s));
  }
  return result;
}

// Escape LIKE wildcards first, then quote the entire value for PostgREST's logic grammar.
// An asterisk is PostgREST's percent alias, so it is deliberately excluded from search input.
export function buildMemberSearchFilter(search) {
  const value = normalizeMemberListOptions({ search }).search;
  if (!value) return '';
  const pattern = `%${value.replace(/[\\%_]/g, '\\$&')}%`;
  const quoted = `"${pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  return ['full_name', 'member_id', 'form_number', 'index_number', 'email_address']
    .map(field => `${field}.ilike.${quoted}`).join(',');
}

function dateValue(value, label) {
  const date = cleanText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Enter a valid ${label}.`);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`Enter a valid ${label}.`);
  }
  return date;
}

export function phoneValue(value, label = 'phone number') {
  let phone = cleanText(value).replace(/[\s()-]/g, '');
  if (/^00/.test(phone)) phone = `+${phone.slice(2)}`;
  if (phone.startsWith('0') && !/^0\d{9}$/.test(phone)) throw new Error(`Enter a 10-digit ${label}, starting with 0.`);
  if (phone.startsWith('0')) phone = `+94${phone.slice(1)}`;
  if (!phone.startsWith('+')) phone = `+${phone}`;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error(`Enter a valid ${label}.`);
  return phone;
}

/** Only editable fields enter an RPC payload. The database enforces the same boundary. */
export function buildMemberPayload(input, { partial = false, requireGuardian = false, admin = false, lockedFee = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Member details are required.');
  const payload = {};
  for (const field of TEXT_FIELDS) {
    if (input[field] === undefined) continue;
    const value = normalizeApplicationText(input[field]);
    payload[field] = value || null;
  }
  if (payload.email_address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email_address)) {
    throw new Error('Enter a valid email address.');
  }
  if (admin) {
    if (lockedFee && input.fee_received !== undefined) {
      throw new Error('Payment and fee details cannot be modified after member approval.');
    }
    if (input.form_number !== undefined) {
      if (input.form_number !== null && typeof input.form_number !== 'string') throw new Error('Enter the printed form number as text.');
      payload.form_number = cleanText(input.form_number) || null;
      if (payload.form_number && !/^\d{4}$/.test(payload.form_number)) throw new Error('Enter the 4-digit form number.');
    }
    if (input.academic_year !== undefined) {
      payload.academic_year = cleanText(input.academic_year) || null;
    }
    if (input.fee_amount !== undefined && input.fee_amount !== MEMBERSHIP_FEE_LKR) {
      throw new Error('The membership fee amount is fixed at LKR 500.');
    }
    if (input.custom_skills !== undefined) {
      if (!Array.isArray(input.custom_skills) || input.custom_skills.length > 20
        || input.custom_skills.some(name => typeof name !== 'string' || !normalizeApplicationText(name) || normalizeApplicationText(name).length > 50)) {
        throw new Error('Add up to 20 skills, with 1 to 50 characters per skill.');
      }
      payload.custom_skills = [...new Set(input.custom_skills.map(normalizeApplicationText))];
    }
    if (input.fee_received !== undefined) {
      if (typeof input.fee_received !== 'boolean') throw new Error('Choose whether the fee has been received.');
      payload.fee_received = input.fee_received;
    }
    for (const field of ['form_number', 'city']) {
      if ((!partial || Object.hasOwn(payload, field)) && !payload[field]) throw new Error(`${field.replaceAll('_', ' ')} is required for a paper application.`);
    }
  }
  for (const [field, maximum] of Object.entries({ full_name: 200, name_with_initials: 100, index_number: 20, city: 100, email_address: 254, form_number: 4 })) {
    if (payload[field]?.length > maximum) throw new Error(`${field.replaceAll('_', ' ')} must be ${maximum} characters or fewer.`);
  }
  if (input.date_of_birth !== undefined) {
    payload.date_of_birth = dateValue(input.date_of_birth, 'date of birth');
    const [year, month] = payload.date_of_birth.split('-').map(Number);
    payload.batch_year = month === 1 ? year - 1 : year;
  }
  if (input.joined_date !== undefined) payload.joined_date = dateValue(input.joined_date, 'joined date');
  if (input.whatsapp_number !== undefined) payload.whatsapp_number = phoneValue(input.whatsapp_number, 'WhatsApp number');

  const interests = input.interests ?? input.skills;
  if (interests !== undefined) {
    if (!Array.isArray(interests) || interests.some(id => typeof id !== 'string' || !UUID.test(id))) {
      throw new Error('Choose skills from the available list. Refresh if a skill is missing.');
    }
    payload.interests = [...new Set(interests)];
  }

  if (input.guardian !== undefined && input.guardian !== null) {
    const guardian = input.guardian;
    if (typeof guardian !== 'object' || Array.isArray(guardian)) throw new Error('Enter valid guardian details.');
    payload.guardian = {
      guardian_name: normalizeApplicationText(guardian.guardian_name),
      contact_number: phoneValue(guardian.contact_number, 'guardian contact number'),
      occupation: normalizeApplicationText(guardian.occupation) || null,
    };
    if (!payload.guardian.guardian_name) throw new Error('Guardian name is required.');
  }

  if (requireGuardian && !payload.guardian) throw new Error('Guardian details are required.');
  for (const field of REQUIRED_FIELDS) {
    if ((!partial || Object.hasOwn(payload, field)) && !payload[field]) {
      throw new Error(`${field.replaceAll('_', ' ')} is required.`);
    }
  }
  return payload;
}
