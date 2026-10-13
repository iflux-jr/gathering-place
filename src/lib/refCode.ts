// Reference codes students use to check their registration. Eight characters from an
// alphabet without look-alikes (no I, L, O, 0 or 1), shown as "ABCD-EFGH".

export const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const REF_LENGTH = 8;
const REF_PATTERN = new RegExp(`^[${REF_ALPHABET}]{${REF_LENGTH}}$`);

export function newRefCode(random: (n: number) => Uint32Array = n => crypto.getRandomValues(new Uint32Array(n))): string {
  return Array.from(random(REF_LENGTH), v => REF_ALPHABET[v % REF_ALPHABET.length]).join('');
}

/** Turns what someone typed ("abcd efgh", "ABCD-EFGH") into the stored code, or null */
export function parseRefCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return REF_PATTERN.test(code) ? code : null;
}

export function formatRefCode(code: string): string {
  return code.length === REF_LENGTH ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
