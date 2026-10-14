import { nameWithInitials, titleCase, displayDate } from './memberDisplay.js';

const E164 = /^\+[1-9]\d{1,14}$/;
const MEMBER_ID = /^\d{2}M\d{3}$/;
const joinedDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Colombo',
});

// Build a draft only. Opening or sending the message remains an explicit user action.
export function buildApprovalWhatsappLink(member) {
  if (!member || member.membership_status !== 'accepted' || member.is_active !== true
    || typeof member.member_id !== 'string' || !MEMBER_ID.test(member.member_id)
    || typeof member.full_name !== 'string' || !member.full_name.trim()
    || typeof member.whatsapp_number !== 'string' || typeof member.joined_date !== 'string') return null;

  const phone = member.whatsapp_number.replace(/[\s()-]/g, '');
  if (!E164.test(phone) || !/^\d{4}-\d{2}-\d{2}$/.test(member.joined_date)
    || member.joined_date.startsWith('0000-')) return null;
  const joinedDate = new Date(`${member.joined_date}T00:00:00Z`);
  if (!Number.isFinite(joinedDate.getTime()) || joinedDate.toISOString().slice(0, 10) !== member.joined_date) return null;

  const name = (member.name_with_initials?.trim() || nameWithInitials(member.full_name)).toUpperCase();
  const text = [
    `Hello *${name}*,`,
    '',
    'Your *Isipathana College Media Unit* membership has been approved.',
    '',
    `• *Member ID:* ${member.member_id}`,
    `• *Joined date:* ${joinedDateFormat.format(joinedDate)}`,
    '',
    'Please collect your membership receipt from the ICMU team.',
  ].join('\n');
  return `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(text)}`;
}

export function buildFeePaymentWhatsappLink({ member, academicYear, amount, paymentMethod = 'cash', paidDate }) {
  if (!member || typeof member.whatsapp_number !== 'string' || !academicYear) return null;

  const phone = member.whatsapp_number.replace(/[\s()-]/g, '');
  if (!E164.test(phone)) return null;

  const rawName = member.name_with_initials?.trim() || nameWithInitials(member.full_name || '');
  const name = rawName ? rawName.toUpperCase() : 'MEMBER';
  const formattedAmount = Number(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
  const methodLabel = titleCase(paymentMethod || 'cash');
  const dateStr = paidDate ? displayDate(paidDate) : displayDate(new Date().toISOString());

  const text = [
    `Hello *${name}*,`,
    '',
    `Payment of *LKR ${formattedAmount}* for your *Isipathana College Media Unit* annual membership fee has been received with thanks.`,
    '',
    `• *Academic Year:* ${academicYear}`,
    member.member_id ? `• *Member ID:* ${member.member_id}` : null,
    member.index_number ? `• *Admission No:* ${member.index_number}` : null,
    `• *Amount Paid:* LKR ${formattedAmount}`,
    `• *Payment Method:* ${methodLabel}`,
    `• *Date Received:* ${dateStr}`,
    '',
    'Thank you for your active participation in the Isipathana College Media Unit.',
  ].filter(Boolean).join('\n');

  return `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(text)}`;
}

