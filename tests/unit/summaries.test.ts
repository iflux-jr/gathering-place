import { describe, expect, it } from 'vitest';
import { countMarks, rollup, summarise, summaryId, type SessionSummary } from '../../src/lib/summaries';

const s = (classId: string, w: number, n: number, present: number, absent: number): SessionSummary =>
  ({ classId, semesterWeek: w, sessionNumber: n, present, absent, total: present + absent, markedBy: 't' });

describe('attendance summaries', () => {
  it('counts marks, ignoring unmarked', () => {
    expect(countMarks([true, false, true, null, undefined])).toEqual({ present: 2, absent: 1, total: 3 });
  });

  it('rebuilds per-session totals from records, skipping holidays', () => {
    const rec = (present: boolean | null, extra = {}) => ({ className: 'baking', semesterWeek: 2, sessionNumber: 1, present, markedBy: 't', ...extra });
    const out = summarise([rec(true), rec(true), rec(false), rec(null), rec(null, { isHoliday: true }), { ...rec(true), sessionNumber: 2 }]);
    expect(out).toHaveLength(2);
    expect(out.find(x => x.sessionNumber === 1)).toMatchObject({ present: 2, absent: 1, total: 3 });
    expect(summaryId('baking', 2, 1)).toBe('baking_W2_S1');
  });

  it('rolls up by class and week, leaving out sessions marked as no class', () => {
    const r = rollup(
      [s('baking', 1, 1, 8, 2), s('baking', 1, 2, 0, 10), s('computer', 1, 1, 5, 5), s('computer', 2, 1, 10, 0)],
      { baking: { holidays: [{ key: 'W1_S2' }] } },
    );
    expect(r.byClass.baking).toEqual({ rate: 80, sessions: 1 });
    expect(r.byClass.computer).toEqual({ rate: 75, sessions: 2 });
    expect(r.overall).toBe(77); // 23 of 30
    expect(r.byWeek).toEqual([{ week: 1, rate: 65 }, { week: 2, rate: 100 }]);
    expect(r.sent.has('baking_W1_S2')).toBe(true);
  });

  it('has no rate when nothing is marked', () => {
    expect(rollup([], {}).overall).toBeNull();
  });
});
