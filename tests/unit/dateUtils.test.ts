import { describe, expect, it } from 'vitest';
import {
  getSemesterStatus, getSemesterWeek, getSemesterWeeks, parseLocalDate,
} from '../../src/utils/dateUtils';

const semester = { startDate: '2025-01-06', endDate: '2025-03-30' };

describe('parseLocalDate', () => {
  it('reads date-only strings as local midnight', () => {
    const d = parseLocalDate('2025-01-06');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2025, 0, 6, 0]);
  });
});

describe('getSemesterWeek', () => {
  it('numbers weeks from the semester start', () => {
    expect(getSemesterWeek(new Date(2025, 0, 6), semester)).toBe(1);
    expect(getSemesterWeek(new Date(2025, 0, 12), semester)).toBe(1);
    expect(getSemesterWeek(new Date(2025, 0, 13), semester)).toBe(2);
    expect(getSemesterWeek(new Date(2025, 2, 30, 22), semester)).toBe(12);
  });

  it('returns null outside the semester window', () => {
    expect(getSemesterWeek(new Date(2025, 0, 5), semester)).toBeNull();
    expect(getSemesterWeek(new Date(2025, 2, 31), semester)).toBeNull();
  });

  it('returns null when the semester is not configured', () => {
    expect(getSemesterWeek(new Date(), null)).toBeNull();
    expect(getSemesterWeek(new Date(), { startDate: '', endDate: '' })).toBeNull();
  });
});

describe('getSemesterStatus', () => {
  it('reports each phase of the semester', () => {
    expect(getSemesterStatus(semester, new Date(2025, 0, 1))).toBe('not_started');
    expect(getSemesterStatus(semester, new Date(2025, 1, 1))).toBe('active');
    expect(getSemesterStatus(semester, new Date(2025, 2, 30, 23))).toBe('active');
    expect(getSemesterStatus(semester, new Date(2025, 2, 31))).toBe('ended');
    expect(getSemesterStatus(undefined)).toBe('not_configured');
  });
});

describe('getSemesterWeeks', () => {
  it('lists twelve consecutive weeks', () => {
    const weeks = getSemesterWeeks(semester);
    expect(weeks).toHaveLength(12);
    expect(weeks[1].startDate?.getDate()).toBe(13);
    expect(weeks[11].endDate?.getDate()).toBe(30);
  });
});
