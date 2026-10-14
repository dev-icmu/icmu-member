// Presentation only: database values keep their normalized lowercase form.
export const titleCase = value => typeof value === 'string'
  ? value.toLowerCase().replace(/(^|[\s.-])\p{L}/gu, letter => letter.toUpperCase())
  : value;

// Compact table label only. Keep the last name readable and never persist this
// derived value over the full name supplied on the application.
export function nameWithInitials(value) {
  if (typeof value !== 'string') return '';
  const words = value.trim().split(/\s+/u).filter(Boolean);
  if (words.length < 2) return titleCase(words[0] || '');
  const lastName = words.pop();
  const initials = words.flatMap(word => {
    // Accept both R M P G and R.M.P.G. as already shortened names.
    const dotted = word.split('.').filter(Boolean);
    const parts = dotted.length > 1 && dotted.every(part => /^\p{L}$/u.test(part)) ? dotted : [word];
    return parts.map(part => {
      const first = part.match(/\p{L}\p{M}*/u)?.[0];
      return first ? `${first.toUpperCase()}.` : part;
    });
  });
  return [...initials, titleCase(lastName)].join(' ');
}

export const displayDate = value => value
  ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Colombo' }).format(new Date(value))
  : 'Not recorded';

