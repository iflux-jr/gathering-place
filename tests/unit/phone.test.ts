import { describe, expect, it } from 'vitest';
import { formatPhone, legacyPhoneVariants, phoneKey } from '../../src/lib/phone';

describe('phoneKey', () => {
  it.each([
    ['08031234567', '2348031234567'],
    ['0803 123 4567', '2348031234567'],
    ['+234 803 123 4567', '2348031234567'],
    ['2348031234567', '2348031234567'],
    ['+2348031234567', '2348031234567'],
    ['002348031234567', '2348031234567'],
    ['8031234567', '2348031234567'],
    ['(0803) 123-4567', '2348031234567'],
    ['+44 7700 900123', '447700900123'],
  ])('reads %s as %s', (input, key) => {
    expect(phoneKey(input)).toBe(key);
  });

  it.each(['', '   ', 'abc', '12345', '+0123456789', '0803123'])('rejects %j', input => {
    expect(phoneKey(input)).toBeNull();
  });
});

describe('formatPhone', () => {
  it('spaces Nigerian numbers', () => expect(formatPhone('2348031234567')).toBe('+234 803 123 4567'));
  it('prefixes others with +', () => expect(formatPhone('447700900123')).toBe('+447700900123'));
});

describe('legacyPhoneVariants', () => {
  it('covers the local, international and digits-only spellings', () => {
    expect(legacyPhoneVariants('2348031234567').sort()).toEqual(['+2348031234567', '08031234567', '2348031234567']);
  });
});
