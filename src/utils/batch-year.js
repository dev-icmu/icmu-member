/**
 * Calculate the Sri Lankan school batch year from a date of birth.
 * Academic cycle runs Feb 1 - Jan 31.
 * Students born in January belong to the previous year's batch.
 * @param {string} isoDateString - ISO date string (YYYY-MM-DD)
 * @returns {number} The 4-digit batch year
 */
export function getBatchYear(isoDateString) {
  const dob = new Date(isoDateString);
  const month = dob.getMonth() + 1; // 1-indexed
  const year = dob.getFullYear();
  return month === 1 ? year - 1 : year;
}

/**
 * Get the 2-digit batch year suffix (e.g., 2007 -> '07')
 * @param {string} isoDateString
 * @returns {string}
 */
export function getBatchYearSuffix(isoDateString) {
  const year = getBatchYear(isoDateString);
  return String(year % 100).padStart(2, '0');
}
