// Country calling codes for the markets we serve (KE, TZ, UG, CM).
const COUNTRY_CODES = ['254', '255', '256', '237'];

// A query made only of digits and phone punctuation, e.g. "0714 737 687" or "+254-714737687".
const PHONE_LIKE = /^[\d\s+\-().]+$/;

/** Digits only: "+254 714-737687" -> "254714737687". */
export function phoneDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

/**
 * The subscriber part of a number with any country code or trunk 0 removed, so
 * 0714737687, 254714737687 and +254 714 737687 all become 714737687.
 */
export function localPhoneDigits(value: string | null | undefined): string {
  const digits = phoneDigits(value);
  for (const code of COUNTRY_CODES) {
    if (digits.startsWith(code) && digits.length > code.length + 6) return digits.slice(code.length);
  }
  return digits.startsWith('0') ? digits.slice(1) : digits;
}

/**
 * Whether a search query matches a stored phone number, ignoring how either was
 * written (07…, 2547…, +254…, spaces, dashes). Non-numeric queries fall back to
 * a plain substring match so name-style searches behave as before.
 */
export function phoneMatches(phone: string | null | undefined, query: string): boolean {
  const stored = phone ?? '';
  const q = query.trim();
  if (!q || !stored) return false;
  if (stored.toLowerCase().includes(q.toLowerCase())) return true;
  if (!PHONE_LIKE.test(q)) return false;

  const queryDigits = phoneDigits(q);
  // Too short to compare without matching half the customer list.
  if (queryDigits.length < 4) return false;
  if (phoneDigits(stored).includes(queryDigits)) return true;

  const queryLocal = localPhoneDigits(q);
  return queryLocal.length >= 4 && localPhoneDigits(stored).includes(queryLocal);
}
