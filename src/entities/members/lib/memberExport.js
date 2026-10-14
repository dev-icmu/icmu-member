import { titleCase } from './memberDisplay.js';

const csvCell = value => {
  const text = String(value ?? '');
  // Spreadsheet apps must treat user-entered text as data, never formulas.
  return `"${(/^[=+\-@\t\r]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`;
};
export function memberCsv(rows) {
  return '\uFEFF' + [
    ['Name', 'Member ID', 'Form number', 'Admission number', 'Batch', 'Status', 'Active', 'City'],
    ...rows.map(m => [titleCase(m.full_name), m.member_id, m.form_number, m.index_number, m.batch_year, m.membership_status, m.is_active ? 'Yes' : 'No', titleCase(m.city)]),
  ].map(row => row.map(csvCell).join(',')).join('\r\n');
}
