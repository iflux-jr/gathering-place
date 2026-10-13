import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDraft, loadDraft, saveDraft } from '../../src/lib/draft';

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

describe('attendance drafts', () => {
  beforeEach(() => { vi.stubGlobal('localStorage', memoryStorage()); });

  it('keeps marks per class, week and session', () => {
    saveDraft('computer', 3, 1, { a: true, b: false });
    expect(loadDraft('computer', 3, 1)).toEqual({ a: true, b: false });
    expect(loadDraft('computer', 3, 2)).toBeNull();
    expect(loadDraft('baking', 3, 1)).toBeNull();
  });

  it('clears a draft after submitting', () => {
    saveDraft('computer', 3, 1, { a: true });
    clearDraft('computer', 3, 1);
    expect(loadDraft('computer', 3, 1)).toBeNull();
  });

  it('drops an empty draft', () => {
    saveDraft('computer', 3, 1, { a: true });
    saveDraft('computer', 3, 1, {});
    expect(loadDraft('computer', 3, 1)).toBeNull();
  });

  it('ignores corrupt or unexpected values', () => {
    localStorage.setItem('gp:draft:v1:computer:W3:S1', '{"a":true,"b":"yes"}');
    expect(loadDraft('computer', 3, 1)).toEqual({ a: true });
    localStorage.setItem('gp:draft:v1:computer:W3:S1', 'not json');
    expect(loadDraft('computer', 3, 1)).toBeNull();
  });

  it('works without storage', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } });
    expect(() => saveDraft('computer', 3, 1, { a: true })).not.toThrow();
    expect(loadDraft('computer', 3, 1)).toBeNull();
  });
});
