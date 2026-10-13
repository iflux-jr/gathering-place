import { describe, expect, it } from 'vitest';
import { getClassColor, DEFAULT_CLASS_COLORS } from '../../src/theme/classes';
import { CLASSES } from '../../src/utils/constants';

describe('getClassColor', () => {
  it('gives every original class its own colour', () => {
    const keys = CLASSES.map(c => getClassColor(c.id).key);
    expect(new Set(keys).size).toBe(CLASSES.length);
    expect(keys).toEqual(CLASSES.map(c => DEFAULT_CLASS_COLORS[c.id]));
  });

  it('prefers a stored colour key', () => {
    expect(getClassColor('computer', 'rose').key).toBe('rose');
  });

  it('ignores an unknown stored key and stays stable for new classes', () => {
    expect(getClassColor('computer', 'not-a-colour').key).toBe('sky');
    expect(getClassColor('photography').key).toBe(getClassColor('photography').key);
  });
});
