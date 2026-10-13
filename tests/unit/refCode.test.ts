import { describe, expect, it } from 'vitest';
import { REF_ALPHABET, formatRefCode, newRefCode, parseRefCode } from '../../src/lib/refCode';

describe('reference codes', () => {
  it('makes eight characters from the safe alphabet', () => {
    for (let i = 0; i < 50; i++) {
      const code = newRefCode();
      expect(code).toHaveLength(8);
      expect([...code].every(c => REF_ALPHABET.includes(c))).toBe(true);
    }
  });

  it('round-trips through the display form', () => {
    const code = newRefCode();
    expect(parseRefCode(formatRefCode(code))).toBe(code);
  });

  it('accepts lower case and spaces', () => {
    expect(parseRefCode(' abcd efgh ')).toBe('ABCDEFGH');
  });

  it('rejects look-alike characters and wrong lengths', () => {
    expect(parseRefCode('ABCD-EFG1')).toBeNull();
    expect(parseRefCode('ABCDEFGO')).toBeNull();
    expect(parseRefCode('ABCDEFG')).toBeNull();
  });
});
