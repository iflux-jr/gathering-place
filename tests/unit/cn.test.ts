import { describe, expect, it } from 'vitest';
import { cn } from '../../src/lib/cn';

describe('cn', () => {
  it('keeps a text colour next to a custom text size', () => {
    expect(cn('text-ink text-small')).toBe('text-ink text-small');
  });

  it('still lets a later size replace an earlier one', () => {
    expect(cn('text-small', 'text-h3')).toBe('text-h3');
  });

  it('still lets a later colour replace an earlier one', () => {
    expect(cn('text-ink', 'text-white')).toBe('text-white');
  });
});
