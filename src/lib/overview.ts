// Figures for the admin overview, worked out from session summaries and class configs.
// Pure helpers, so they can be tested.
import type { SessionSummary } from './summaries';

interface ConfigLike {
  sessionsPerWeek?: number;
  holidays?: { key: string }[];
}

const off = (cfg: ConfigLike | undefined, week: number, session: number) =>
  !!cfg?.holidays?.some(h => h.key === `W${week}_S${session}`);

export interface WeekTotals { week: number; present: number; marked: number }

/** Present and marked counts per semester week, all classes together, oldest first */
export function weeklyTotals(summaries: SessionSummary[], configs: Record<string, ConfigLike | undefined>): WeekTotals[] {
  const by = new Map<number, WeekTotals>();
  for (const s of summaries) {
    if (off(configs[s.classId], s.semesterWeek, s.sessionNumber)) continue;
    const w = by.get(s.semesterWeek) ?? { week: s.semesterWeek, present: 0, marked: 0 };
    w.present += s.present; w.marked += s.total;
    by.set(s.semesterWeek, w);
  }
  return [...by.values()].sort((a, b) => a.week - b.week);
}

export const rate = (present: number, marked: number) => (marked ? Math.round((present / marked) * 100) : null);

export interface ClassDrop { classId: string; from: number; to: number; fromWeek: number; toWeek: number; drop: number }

/** The class whose attendance fell most between its first and latest marked weeks (at least 5 points) */
export function biggestDrop(summaries: SessionSummary[], configs: Record<string, ConfigLike | undefined>, minDrop = 5): ClassDrop | null {
  const per = new Map<string, Map<number, { p: number; t: number }>>();
  for (const s of summaries) {
    if (off(configs[s.classId], s.semesterWeek, s.sessionNumber) || !s.total) continue;
    const weeks = per.get(s.classId) ?? new Map();
    const w = weeks.get(s.semesterWeek) ?? { p: 0, t: 0 };
    w.p += s.present; w.t += s.total;
    weeks.set(s.semesterWeek, w); per.set(s.classId, weeks);
  }
  let best: ClassDrop | null = null;
  for (const [classId, weeks] of per) {
    const ks = [...weeks.keys()].sort((a, b) => a - b);
    if (ks.length < 2) continue;
    const first = weeks.get(ks[0])!, last = weeks.get(ks[ks.length - 1])!;
    const from = Math.round((first.p / first.t) * 100), to = Math.round((last.p / last.t) * 100);
    const drop = from - to;
    if (drop >= minDrop && (!best || drop > best.drop)) best = { classId, from, to, fromWeek: ks[0], toWeek: ks[ks.length - 1], drop };
  }
  return best;
}

export interface WeekRegisters { expected: number; sent: number; waiting: { classId: string; session: number }[] }

/** Registers due this week (one per session, minus no-class sessions) and which are still missing */
export function registersForWeek(
  classIds: string[], week: number, configs: Record<string, ConfigLike | undefined>, sent: Set<string>,
): WeekRegisters {
  const out: WeekRegisters = { expected: 0, sent: 0, waiting: [] };
  for (const id of classIds) {
    const cfg = configs[id];
    const sessions = cfg?.sessionsPerWeek ?? 1;
    for (let n = 1; n <= sessions; n++) {
      if (off(cfg, week, n)) continue;
      out.expected++;
      if (sent.has(`${id}_W${week}_S${n}`)) out.sent++;
      else out.waiting.push({ classId: id, session: n });
    }
  }
  return out;
}
