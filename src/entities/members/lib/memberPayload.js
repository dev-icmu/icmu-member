const STATUSES = new Set(['all', 'pending', 'accepted', 'rejected']);
const ACTIVITIES = new Set(['all', 'active', 'inactive']);
const SORTS = new Set(['newest', 'oldest', 'name']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQUIRED_FIELDS = ['full_name', 'name_with_initials', 'date_of_birth', 'joined_date', 'whatsapp_number'];
const TEXT_FIELDS = ['index_number', 'full_name', 'name_with_initials', 'city', 'email_address', 'school_class', 'address', 'other_skills'];

const cleanText = value => String(value ?? '').trim().replace(/\s+/g, ' ');

function positiveInteger(value, fallback, maximum) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 1 ? Math.min(Math.floor(number), maximum) : fallback;
}

export function normalizeMemberListOptions(options = {}) {
  return {
    page: positiveInteger(options.page, 1, 1_000_000),
    limit: positiveInteger(options.limit, 20, 100),
    search: cleanText(options.search).replace(/\*/g, '').slice(0, 150),
    status: STATUSES.has(options.status) ? options.status : 'all',
    activity: ACTIVITIES.has(options.activity) ? options.activity : 'all',
    sort: SORTS.has(options.sort) ? options.sort : 'newest',
  };
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

function phoneValue(value, label) {
  let phone = cleanText(value).replace(/[\s()-]/g, '');
  if (phone.startsWith('0')) phone = `+94${phone.slice(1)}`;
  if (!phone.startsWith('+')) phone = `+${phone}`;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error(`Enter a valid ${label}.`);
  return phone;
}

/** Only editable fields enter an RPC payload. The database enforces the same boundary. */
export function buildMemberPayload(input, { partial = false, requireGuardian = false, admin = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Member details are required.');
  const payload = {};
  for (const field of TEXT_FIELDS) {
    if (input[field] === undefined) continue;
    const value = cleanText(input[field]);
    payload[field] = field === 'email_address' ? value.toLowerCase() || null : value || null;
  }
  if (payload.email_address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email_address)) {
    throw new Error('Enter a valid email address.');
  }
  if (admin) {
    if (!partial) payload.application_source = 'paper';
    if (input.application_source !== undefined && input.application_source !== null) {
      if (!['paper', 'online'].includes(input.application_source) || (!partial && input.application_source !== 'paper')) {
        throw new Error('New admin entries must use a paper application.');
      }
      payload.application_source = input.application_source;
    }
    if (input.form_number !== undefined) {
      if (input.form_number !== null && typeof input.form_number !== 'string') throw new Error('Enter the printed form number as text.');
      payload.form_number = cleanText(input.form_number) || null;
    }
    if (input.fee_amount !== undefined) {
      if (input.fee_amount === null && payload.application_source !== 'paper') payload.fee_amount = null;
      else if (typeof input.fee_amount !== 'number' || !Number.isFinite(input.fee_amount)
        || input.fee_amount < 0 || input.fee_amount > 999999.99
        || Math.abs(input.fee_amount * 100 - Math.round(input.fee_amount * 100)) > 0.000001) {
        throw new Error('Enter a valid fee amount with up to two decimal places.');
      } else payload.fee_amount = input.fee_amount;
    } else if (!partial) payload.fee_amount = 500;
    if (input.fee_received !== undefined) {
      if (typeof input.fee_received !== 'boolean') throw new Error('Choose whether the fee has been received.');
      payload.fee_received = input.fee_received;
    }
    if (payload.application_source === 'paper') {
      for (const field of ['form_number', 'school_class', 'address']) {
        if ((!partial || Object.hasOwn(payload, field)) && !payload[field]) throw new Error(`${field.replaceAll('_', ' ')} is required for a paper application.`);
      }
    }
  }
  for (const [field, maximum] of Object.entries({ form_number: 50, school_class: 30, address: 500, other_skills: 500 })) {
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
      guardian_name: cleanText(guardian.guardian_name),
      contact_number: phoneValue(guardian.contact_number, 'guardian contact number'),
      occupation: cleanText(guardian.occupation) || null,
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
