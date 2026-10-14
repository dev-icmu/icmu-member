import { normalizeApplicationText, phoneValue } from './memberPayload.js';

export const applicationSteps = [
  { title: 'Student', description: 'Copy the student details from the membership form.' },
  { title: 'Guardian', description: 'Add the parent or guardian details from the form.' },
  { title: 'Skills', description: 'Skills are optional. Select any skills marked on the form, or add another skill.' },
  { title: 'Review', description: 'Check the details and confirm whether the fee was received.' },
];
export const stepFields = [
  ['form_number', 'full_name', 'index_number', 'date_of_birth', 'email_address', 'whatsapp_number', 'city'],
  ['guardian_name', 'contact_number', 'occupation'],
  [],
  ['joined_date'],
];
export const colomboToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
export const dateDigits = value => (value || '').replaceAll('-', '');
export const dateFromDigits = value => value.length === 8 ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}` : value;
export function localPhone(value) {
  const phone = String(value || '').replace(/[\s()-]/g, '');
  return phone.replace(/^(?:\+94|0094|94)(\d{9})$/, '0$1');
}
export function fieldValue(form, name) {
  return ['guardian_name', 'contact_number', 'occupation'].includes(name) ? form.guardian[name] : form[name];
}
export function applicationFieldError(name, value, { isPaper = true, form = {}, today = colomboToday() } = {}) {
  const text = normalizeApplicationText(value);
  if (name === 'form_number') return !text && !isPaper ? '' : /^\d{4}$/.test(text) ? '' : 'Enter all 4 digits printed on the form.';
  if (name === 'index_number') return !text && !isPaper ? '' : /^\d{5}$/.test(text) ? '' : 'Enter the 5-digit school admission number.';
  if (['date_of_birth', 'joined_date'].includes(name)) {
    const date = new Date(`${text}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== text) return 'Enter a valid date as YYYY MM DD.';
    if (text > today || (name === 'date_of_birth' && (text >= today || text < '1940-01-01'))) return name === 'date_of_birth' ? 'Enter a birth date before today, from 1940 onwards.' : 'The joined date cannot be in the future.';
    if (name === 'joined_date' && text < form.date_of_birth) return 'The joined date must be after the birth date.';
    return '';
  }
  if (['whatsapp_number', 'contact_number'].includes(name)) {
    try { phoneValue(text); return ''; } catch { return 'Enter a valid number, such as 0701234567.'; }
  }
  const rules = {
    full_name: [2, 200, 'full name'], guardian_name: [2, 150, 'guardian name'],
    city: [1, 100, 'city'],
    email_address: [1, 254, 'email address'], occupation: [0, 100, 'occupation'],
  };
  const [minimum, maximum, label] = rules[name] || [0, 500, name];
  if (text.length < minimum) return `Enter the ${label}${minimum > 1 ? ' (at least 2 characters)' : ''}.`;
  if (text.length > maximum) return `Use ${maximum} characters or fewer.`;
  if (name === 'email_address' && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return 'Enter a valid email address.';
  return '';
}
