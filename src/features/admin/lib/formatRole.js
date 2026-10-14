export function formatRole(role) {
  if (!role || typeof role !== 'string') return 'Admin';
  if (role === 'authenticated') return 'Admin';
  const clean = role.replace(/[\[\]{}"';]/g, '').trim();
  if (!clean) return 'Admin';
  if (/^super[-_]?admin$/i.test(clean)) return 'Super Admin';
  if (/^admin$/i.test(clean)) return 'Admin';
  return clean
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
