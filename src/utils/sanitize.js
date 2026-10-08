/** Strip all HTML tags */
export function stripHtml(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '');
}

/** Trim and collapse internal whitespace */
export function trimAndClean(str) {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ');
}

/** Convert to Title Case */
export function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Convert Sri Lankan local phone number to E.164 format.
 * Strips spaces/dashes, replaces leading 0 with +94.
 * @param {string} phone
 * @returns {string}
 */
export function coerceE164(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+94' + cleaned.slice(1);
  }
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

/**
 * Format a Sri Lankan phone number as the user types.
 * Accepts: 07X XXX XXXX  or  +94 7X XXXX XXX
 * @param {string} raw - Raw user input
 * @returns {string} Formatted phone display string
 */
export function formatSLPhone(raw) {
  const digits = raw.replace(/\D/g, '');

  // Local format: 0XX XXX XXXX
  if (digits.startsWith('0')) {
    const d = digits.slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }

  // International format: +94 7X XXXX XXX
  if (digits.startsWith('94')) {
    const d = digits.slice(0, 11);
    if (d.length <= 4) return `+${d}`;
    if (d.length <= 6) return `+${d.slice(0, 2)} ${d.slice(2)}`;
    if (d.length <= 9) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}`;
    return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 8)} ${d.slice(8)}`;
  }

  return digits;
}

/**
 * Sanitize all fields of a member registration payload.
 * @param {object} data - Raw form data
 * @returns {object} Sanitized data
 */
export function sanitizeMemberInput(data) {
  return {
    ...data,
    index_number: data.index_number ? trimAndClean(data.index_number).toUpperCase() : undefined,
    full_name: data.full_name ? trimAndClean(stripHtml(data.full_name)) : undefined,
    name_with_initials: data.name_with_initials ? trimAndClean(stripHtml(data.name_with_initials)) : undefined,
    city: data.city ? toTitleCase(trimAndClean(data.city)) : undefined,
    whatsapp_number: data.whatsapp_number ? coerceE164(data.whatsapp_number) : undefined,
    email_address: data.email_address ? data.email_address.trim().toLowerCase() : undefined,
  };
}
