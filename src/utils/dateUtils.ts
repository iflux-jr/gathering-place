// src/utils/dateUtils.ts
// Date, week-number, and semester utilities

import type { DateLike, Semester } from '../types/firestore';
import { SEMESTER_TOTAL_WEEKS } from './constants';

const DAY_MS = 86_400_000;

type SemesterDates = Pick<Semester, 'startDate' | 'endDate'> | null | undefined;

/**
 * Parse a semester date. Date-only strings ("2025-01-06") are read as local
 * midnight; `new Date('2025-01-06')` would read them as UTC, which lands on
 * the previous day in timezones west of UTC.
 */
export function parseLocalDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

/** ISO week number (calendar week) */
export function getWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
}

/**
 * Semester-relative week number (1-based from semester start date).
 * Returns null if date is outside the semester window.
 */
export function getSemesterWeek(date: Date, semester: SemesterDates): number | null {
  if (!semester?.startDate || !semester?.endDate) return null;
  const start = parseLocalDate(semester.startDate);
  const end   = parseLocalDate(semester.endDate);
  const d     = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  if (d < start || d > end) return null;
  // Round rather than floor so a daylight-saving shift can't move a day across a week boundary
  const diffDays = Math.round((d.getTime() - start.getTime()) / DAY_MS);
  return Math.floor(diffDays / 7) + 1;
}

/** Current semester week — null if outside semester */
export function currentSemesterWeek(semester: SemesterDates): number | null {
  return getSemesterWeek(new Date(), semester);
}

export type SemesterStatus = 'not_started' | 'active' | 'ended' | 'not_configured';

/** Semester status relative to now */
export function getSemesterStatus(semester: SemesterDates, now: Date = new Date()): SemesterStatus {
  if (!semester?.startDate || !semester?.endDate) return 'not_configured';
  const start = parseLocalDate(semester.startDate);
  const end   = parseLocalDate(semester.endDate);
  end.setHours(23, 59, 59, 999);
  if (now < start) return 'not_started';
  if (now > end)   return 'ended';
  return 'active';
}

function toDate(value: DateLike | number): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') return parseLocalDate(value);
  if (typeof value === 'number') return new Date(value);
  return value.toDate();
}

/** Format a Firestore Timestamp or ISO string, e.g. "Mon, 6 Jan 2025" */
export function formatDate(timestamp: DateLike | number): string {
  const date = toDate(timestamp);
  if (!date) return '—';
  return date.toLocaleDateString('en-NG', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

/** Short date, e.g. "6 Jan 2025" */
export function formatDateShort(dateStr: DateLike | number): string {
  const date = toDate(dateStr);
  if (!date) return '—';
  return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(timestamp: DateLike | number): string {
  const date = toDate(timestamp);
  if (!date) return '—';
  return date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

/** Semester week label e.g. "Week 3 of 12" */
export function formatSemesterWeekLabel(semWeek: number | null | undefined, totalWeeks = SEMESTER_TOTAL_WEEKS): string {
  if (!semWeek) return '—';
  return `Week ${semWeek} of ${totalWeeks}`;
}

/** Start date of a semester week */
export function semesterWeekStart(semWeek: number, semester: SemesterDates): Date | null {
  if (!semester?.startDate) return null;
  const start = parseLocalDate(semester.startDate);
  start.setDate(start.getDate() + (semWeek - 1) * 7);
  return start;
}

export interface SemesterWeek {
  week: number;
  label: string;
  startDate: Date | null;
  endDate: Date | null;
}

/** All semester weeks as display labels */
export function getSemesterWeeks(semester: SemesterDates, totalWeeks = SEMESTER_TOTAL_WEEKS): SemesterWeek[] {
  if (!semester?.startDate) return [];
  const fmt = (d: Date | null) => d?.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) || '';
  const weeks: SemesterWeek[] = [];
  for (let w = 1; w <= totalWeeks; w++) {
    const start = semesterWeekStart(w, semester);
    const end   = start ? new Date(start) : null;
    if (start && end) end.setDate(start.getDate() + 6);
    weeks.push({ week: w, label: `Week ${w} (${fmt(start)} – ${fmt(end)})`, startDate: start, endDate: end });
  }
  return weeks;
}
