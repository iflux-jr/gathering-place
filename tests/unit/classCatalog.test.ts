import { describe, expect, it } from 'vitest';
import { DEFAULT_CATALOG, classIdFor, nextColor, parseCatalog, serializeCatalog, removePlan } from '../../src/lib/classCatalog';

describe('class catalog', () => {
  it('falls back to the original eight classes', () => {
    expect(parseCatalog(null)).toBe(DEFAULT_CATALOG);
    expect(parseCatalog({})).toBe(DEFAULT_CATALOG);
    expect(DEFAULT_CATALOG.map(c => c.id)).toEqual(
      ['computer', 'make-up', 'wig-making', 'barbing', 'baking', 'resin-art', 'nail-tech', 'tailoring']);
  });

  it('keeps retired classes but leaves them out of the active IDs', () => {
    const doc = serializeCatalog([
      { id: 'computer', label: 'Computer', colorKey: 'sky', status: 'active', order: 0 },
      { id: 'pottery', label: 'Pottery', colorKey: 'clay', status: 'retired', order: 1 },
    ]);
    expect(doc.activeIds).toEqual(['computer']);
    expect(parseCatalog(doc).map(c => c.status)).toEqual(['active', 'retired']);
  });

  it('repairs unknown colours and skips malformed entries', () => {
    const parsed = parseCatalog({ classes: [{ id: 'x', label: 'X', colorKey: 'neon' }, { label: 'no id' }, 'junk'] });
    expect(parsed).toHaveLength(1);
    expect(parsed[0].colorKey).not.toBe('neon');
    expect(parsed[0].status).toBe('active');
  });

  it('renumbers order when saving', () => {
    const doc = serializeCatalog([
      { id: 'b', label: 'B', colorKey: 'sky', status: 'active', order: 7 },
      { id: 'a', label: 'A', colorKey: 'pink', status: 'active', order: 2 },
    ]);
    expect(doc.classes.map(c => [c.id, c.order])).toEqual([['a', 0], ['b', 1]]);
  });

  it('makes IDs from names without clashing', () => {
    expect(classIdFor('Shoe Making', [])).toBe('shoe-making');
    expect(classIdFor('Café & Pastry!', [])).toBe('cafe-pastry');
    expect(classIdFor('Baking', ['baking'])).toBe('baking-2');
    expect(classIdFor('Baking', ['baking', 'baking-2'])).toBe('baking-3');
    expect(classIdFor('!!!', [])).toBe('class');
  });

  it('picks a colour no active class uses', () => {
    expect(['aqua', 'rose', 'sage', 'stone']).toContain(nextColor(DEFAULT_CATALOG));
  });
});

describe('removePlan', () => {
  const none = { students: 0, teachers: [], pendingSignups: 0, hasHistory: false };
  it('deletes a class that was never used', () => {
    expect(removePlan(none)).toEqual({ kind: 'delete' });
  });
  it('retires a class with history', () => {
    expect(removePlan({ ...none, hasHistory: true })).toEqual({ kind: 'retire' });
  });
  it('blocks while students, teachers or sign-ups depend on it', () => {
    const plan = removePlan({ ...none, students: 3, teachers: [{ id: 't', name: 'Ada' }], pendingSignups: 1, hasHistory: true });
    expect(plan.kind).toBe('blocked');
    expect(plan.kind === 'blocked' && plan.reasons).toHaveLength(3);
  });
});
