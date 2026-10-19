import { describe, expect, it } from 'vitest';
import { biggestDrop, registersForWeek, weeklyTotals } from '../../src/lib/overview';
import type { SessionSummary } from '../../src/lib/summaries';

const s = (classId: string, week: number, session: number, present: number, absent: number): SessionSummary =>
  ({ classId, semesterWeek: week, sessionNumber: session, present, absent, total: present + absent, markedBy: 'u' });

describe('overview figures', () => {
  const rows = [s('baking', 1, 1, 9, 1), s('baking', 2, 1, 6, 4), s('computer', 1, 1, 8, 2), s('computer', 2, 1, 8, 2), s('computer', 2, 2, 5, 5)];
  const configs = { computer: { sessionsPerWeek: 2, holidays: [{ key: 'W2_S2' }] }, baking: { sessionsPerWeek: 1 } };

  it('totals each week and skips no-class sessions', () => {
    expect(weeklyTotals(rows, configs)).toEqual([{ week: 1, present: 17, marked: 20 }, { week: 2, present: 14, marked: 20 }]);
  });

  it('finds the class that fell most', () => {
    expect(biggestDrop(rows, configs)).toMatchObject({ classId: 'baking', from: 90, to: 60, drop: 30 });
    expect(biggestDrop([s('a', 1, 1, 5, 5), s('a', 2, 1, 5, 5)], {})).toBeNull();
  });

  it('counts registers due and missing this week', () => {
    const sent = new Set(['computer_W3_S1']);
    expect(registersForWeek(['computer', 'baking'], 3, configs, sent)).toEqual({
      expected: 3, sent: 1, waiting: [{ classId: 'computer', session: 2 }, { classId: 'baking', session: 1 }],
    });
    // Week 2 session 2 of computer is a no-class session
    expect(registersForWeek(['computer'], 2, configs, new Set()).expected).toBe(1);
  });
});
