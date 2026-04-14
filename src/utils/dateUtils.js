// src/utils/dateUtils.js
// Date, week-number, and semester utilities

/** ISO week number (calendar week) */
export function getWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export function currentWeekNumber() { return getWeekNumber(new Date()); }
export function currentYear()       { return new Date().getFullYear(); }

/**
 * Semester-relative week number (1-based from semester start date).
 * Returns null if date is outside the semester window.
 */
export function getSemesterWeek(date, semester) {
  if (!semester?.startDate || !semester?.endDate) return null;
  const start = new Date(semester.startDate);
  const end   = new Date(semester.endDate);
  const d     = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setHours(0,0,0,0); end.setHours(23,59,59,999);
  if (d < start || d > end) return null;
  const diffMs   = d - start;
  const diffDays = Math.floor(diffMs / 86400000);
  return Math.floor(diffDays / 7) + 1;
}

/** Current semester week — null if outside semester */
export function currentSemesterWeek(semester) {
  return getSemesterWeek(new Date(), semester);
}

/** Semester status: 'not_started' | 'active' | 'ended' | 'not_configured' */
export function getSemesterStatus(semester) {
  if (!semester?.startDate || !semester?.endDate) return 'not_configured';
  const now   = new Date();
  const start = new Date(semester.startDate);
  const end   = new Date(semester.endDate);
  end.setHours(23,59,59,999);
  if (now < start) return 'not_started';
  if (now > end)   return 'ended';
  return 'active';
}

/** Format a Firestore Timestamp or ISO string */
export function formatDate(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp?.toDate ? timestamp.toDate()
    : typeof timestamp === 'string' ? new Date(timestamp)
    : new Date(timestamp);
  return date.toLocaleDateString('en-NG', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

export function weekStartDate(weekNumber, year) {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - (dayOfWeek - 1) + (weekNumber - 1) * 7);
  return weekStart;
}

export function formatWeekLabel(weekNumber, year) {
  const start = weekStartDate(weekNumber, year);
  const end   = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
  return `Week ${weekNumber} (${fmt(start)} – ${fmt(end)}, ${year})`;
}

/** Semester week label e.g. "Week 3 of 12" */
export function formatSemesterWeekLabel(semWeek, totalWeeks = 12) {
  if (!semWeek) return '—';
  return `Week ${semWeek} of ${totalWeeks}`;
}

/** Start date of a semester week */
export function semesterWeekStart(semWeek, semester) {
  if (!semester?.startDate) return null;
  const start = new Date(semester.startDate);
  start.setDate(start.getDate() + (semWeek - 1) * 7);
  return start;
}

export function getRecentWeeks(n = 8) {
  const result = [];
  let wn = getWeekNumber(new Date());
  let yr = new Date().getFullYear();
  for (let i = 0; i < n; i++) {
    result.push({ weekNumber: wn, year: yr, label: formatWeekLabel(wn, yr) });
    wn--;
    if (wn === 0) { wn = 52; yr--; }
  }
  return result;
}

/** All 12 semester weeks as display labels */
export function getSemesterWeeks(semester) {
  if (!semester?.startDate) return [];
  const weeks = [];
  for (let w = 1; w <= 12; w++) {
    const start = semesterWeekStart(w, semester);
    const end   = start ? new Date(start) : null;
    if (end) end.setDate(start.getDate() + 6);
    const fmt = d => d?.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) || '';
    weeks.push({ week: w, label: `Week ${w} (${fmt(start)} – ${fmt(end)})`, startDate: start, endDate: end });
  }
  return weeks;
}
