// The programme's current semester, read from the class configs. Classes normally share one
// semester; where they differ, the one most classes use wins.
import { useEffect, useMemo, useState } from 'react';
import { subscribeToAllClassConfigs } from '../firebase/classConfig';
import { useActiveClasses } from '../store/classStore';
import { currentSemesterWeek, getSemesterStatus, parseLocalDate } from '../utils/dateUtils';
import { semesterLength } from '../firebase/attendance';
import type { ClassConfig, Semester } from '../types/firestore';

export interface ProgrammeSemester {
  semester: Semester;
  label: string;
  week: number | null;
  weeks: number;
  status: ReturnType<typeof getSemesterStatus>;
}

const fmt = (d: string) => parseLocalDate(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
export const semesterRange = (s: Semester) => `${fmt(s.startDate)} to ${fmt(s.endDate)}`;

export function pickSemester(configs: Record<string, ClassConfig>, classIds: string[]): ProgrammeSemester | null {
  const seen = new Map<string, { s: Semester; n: number }>();
  for (const id of classIds) {
    const s = configs[id]?.semester;
    if (!s?.startDate || !s?.endDate) continue;
    const k = `${s.startDate}|${s.endDate}`;
    const e = seen.get(k) ?? { s, n: 0 };
    e.n++; seen.set(k, e);
  }
  const best = [...seen.values()].sort((a, b) => b.n - a.n)[0];
  if (!best) return null;
  const s = best.s;
  return {
    semester: s,
    label: s.label || 'This semester',
    week: currentSemesterWeek(s),
    weeks: semesterLength(s),
    status: getSemesterStatus(s),
  };
}

/** Live class configs plus the semester most classes share (admins only: configs are staff-readable) */
export function useProgrammeSemester(enabled = true) {
  const classes = useActiveClasses();
  const [configs, setConfigs] = useState<Record<string, ClassConfig> | null>(null);
  useEffect(() => (enabled ? subscribeToAllClassConfigs(setConfigs) : undefined), [enabled]);
  const ids = classes.map(c => c.id);
  const key = ids.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const semester = useMemo(() => (configs ? pickSemester(configs, ids) : null), [configs, key]);
  return { configs, semester };
}
