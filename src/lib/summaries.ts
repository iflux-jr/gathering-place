// Per-session attendance totals (attendanceSummary/{classId}_W{week}_S{session}). Teachers
// write one alongside each register, so the admin home reads a few hundred small documents
// instead of every attendance record. Pure helpers, so they can be tested.

export interface SessionSummary {
  classId: string;
  semesterWeek: number;
  sessionNumber: number;
  present: number;
  absent: number;
  total: number;
  markedBy: string;
}

interface HolidayConfig { holidays?: { key: string }[] }

export const summaryId = (classId: string, week: number, session: number) => `${classId}_W${week}_S${session}`;

/** Count one session's marks */
export function countMarks(marks: (boolean | null | undefined)[]) {
  const present = marks.filter(m => m === true).length;
  const absent = marks.filter(m => m === false).length;
  return { present, absent, total: present + absent };
}

interface RecordLike {
  className: string; semesterWeek: number; sessionNumber: number;
  present: boolean | null; isHoliday?: boolean; markedBy?: string;
}

/** Rebuild summaries from raw attendance records (the admin's "Recalculate totals") */
export function summarise(records: RecordLike[]): SessionSummary[] {
  const groups = new Map<string, SessionSummary>();
  for (const r of records) {
    if (!r.className || !r.semesterWeek || !r.sessionNumber || r.isHoliday) continue;
    const id = summaryId(r.className, r.semesterWeek, r.sessionNumber);
    const s = groups.get(id) ?? {
      classId: r.className, semesterWeek: r.semesterWeek, sessionNumber: r.sessionNumber,
      present: 0, absent: 0, total: 0, markedBy: r.markedBy ?? '',
    };
    if (r.present === true) s.present++;
    else if (r.present === false) s.absent++;
    else continue;
    s.total++;
    groups.set(id, s);
  }
  return [...groups.values()];
}

const isHoliday = (cfg: HolidayConfig | undefined, s: SessionSummary) =>
  !!cfg?.holidays?.some(h => h.key === `W${s.semesterWeek}_S${s.sessionNumber}`);

const pct = (present: number, total: number) => (total ? Math.round((present / total) * 100) : null);

export interface Rollup {
  /** Present over marked, all classes, not counting sessions marked as no class */
  overall: number | null;
  byClass: Record<string, { rate: number | null; sessions: number }>;
  /** Rate per semester week across classes, oldest first */
  byWeek: { week: number; rate: number | null }[];
  /** Sessions sent per class and week, keyed `${classId}_W${week}` */
  sent: Set<string>;
}

export function rollup(summaries: SessionSummary[], configs: Record<string, HolidayConfig | undefined>): Rollup {
  let present = 0, total = 0;
  const cls: Record<string, { present: number; total: number; sessions: number }> = {};
  const wk: Record<number, { present: number; total: number }> = {};
  const sent = new Set<string>();
  for (const s of summaries) {
    sent.add(`${s.classId}_W${s.semesterWeek}_S${s.sessionNumber}`);
    if (isHoliday(configs[s.classId], s)) continue;
    present += s.present; total += s.total;
    const c = (cls[s.classId] ??= { present: 0, total: 0, sessions: 0 });
    c.present += s.present; c.total += s.total; c.sessions++;
    const w = (wk[s.semesterWeek] ??= { present: 0, total: 0 });
    w.present += s.present; w.total += s.total;
  }
  return {
    overall: pct(present, total),
    byClass: Object.fromEntries(Object.entries(cls).map(([id, c]) => [id, { rate: pct(c.present, c.total), sessions: c.sessions }])),
    byWeek: Object.keys(wk).map(Number).sort((a, b) => a - b).map(week => ({ week, rate: pct(wk[week].present, wk[week].total) })),
    sent,
  };
}
