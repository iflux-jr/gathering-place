// Phone numbers arrive as "0803 123 4567", "+234 803 123 4567", "2348031234567" and so on.
// The key is the international number as digits only, so one person maps to one key
// however they typed it. Numbers without a country code are read as Nigerian.

const DEFAULT_COUNTRY = '234';

/** Digits-only international form, e.g. "2348031234567"; null when it can't be a phone number */
export function phoneKey(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim();
  const hasPlus = raw.startsWith('+');
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (hasPlus) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = DEFAULT_COUNTRY + digits.slice(1);
  } else if (digits.length === 10 && /^[789]/.test(digits)) {
    digits = DEFAULT_COUNTRY + digits;
  }

  return /^[1-9]\d{9,14}$/.test(digits) ? digits : null;
}

/** "+234 803 123 4567" for Nigerian numbers, "+<digits>" otherwise */
export function formatPhone(key: string): string {
  const m = /^234(\d{3})(\d{3})(\d{4})$/.exec(key);
  return m ? `+234 ${m[1]} ${m[2]} ${m[3]}` : `+${key}`;
}

/** Spellings older student records may hold for the same number, for exact-match queries */
export function legacyPhoneVariants(key: string): string[] {
  const out = new Set<string>([key, `+${key}`]);
  if (key.startsWith(DEFAULT_COUNTRY)) out.add(`0${key.slice(DEFAULT_COUNTRY.length)}`);
  return [...out];
}
