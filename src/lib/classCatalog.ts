// The list of classes, as stored in systemSettings/classes. Pure helpers, so they can be tested.
import { CLASSES } from '../utils/constants';
import { CLASS_COLOR_KEYS, DEFAULT_CLASS_COLORS, type ClassColorKey } from '../theme/classes';

export type ClassStatus = 'active' | 'retired';

export interface ClassEntry {
  id: string;
  label: string;
  colorKey: ClassColorKey;
  status: ClassStatus;
  order: number;
}

/** The original eight, used until an admin first edits the list */
export const DEFAULT_CATALOG: ClassEntry[] = CLASSES.map((c, i) => ({
  id: c.id,
  label: c.label,
  colorKey: DEFAULT_CLASS_COLORS[c.id] ?? CLASS_COLOR_KEYS[i % CLASS_COLOR_KEYS.length],
  status: 'active',
  order: i,
}));

/** Reads the stored document defensively; anything malformed falls back to the defaults */
export function parseCatalog(data: unknown): ClassEntry[] {
  const list = (data as { classes?: unknown } | null)?.classes;
  if (!Array.isArray(list)) return DEFAULT_CATALOG;
  const out: ClassEntry[] = [];
  for (const [i, raw] of list.entries()) {
    const c = raw as Partial<ClassEntry>;
    if (typeof c?.id !== 'string' || !c.id || typeof c.label !== 'string') continue;
    out.push({
      id: c.id,
      label: c.label,
      colorKey: CLASS_COLOR_KEYS.includes(c.colorKey as ClassColorKey) ? (c.colorKey as ClassColorKey) : CLASS_COLOR_KEYS[i % CLASS_COLOR_KEYS.length],
      status: c.status === 'retired' ? 'retired' : 'active',
      order: typeof c.order === 'number' ? c.order : i,
    });
  }
  return out.sort((a, b) => a.order - b.order);
}

/** What gets written: the list plus the active IDs the security rules check sign-ups against */
export function serializeCatalog(classes: ClassEntry[]) {
  const sorted = [...classes].sort((a, b) => a.order - b.order).map((c, order) => ({ ...c, order }));
  return { classes: sorted, activeIds: sorted.filter(c => c.status === 'active').map(c => c.id) };
}

/** A short, stable ID from a class name that doesn't clash with existing ones (retired included) */
export function classIdFor(label: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = label.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'class';
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** First palette colour no active class uses, so a new class stands out from the rest */
export function nextColor(classes: ClassEntry[]): ClassColorKey {
  const used = new Set(classes.filter(c => c.status === 'active').map(c => c.colorKey));
  return CLASS_COLOR_KEYS.find(k => !used.has(k)) ?? CLASS_COLOR_KEYS[classes.length % CLASS_COLOR_KEYS.length];
}

export interface ClassUsage {
  students: number;
  teachers: { id: string; name: string }[];
  pendingSignups: number;
  /** Attendance this semester or an archived semester: the class has a past worth keeping */
  hasHistory: boolean;
}

export type RemovePlan =
  | { kind: 'blocked'; reasons: string[] }
  | { kind: 'retire' }
  | { kind: 'delete' };

/** What removing a class would do, given its usage */
export function removePlan(u: ClassUsage): RemovePlan {
  const reasons: string[] = [];
  if (u.students) reasons.push(`${u.students} ${u.students === 1 ? 'student is' : 'students are'} still in this class. Archive the semester first.`);
  if (u.teachers.length) reasons.push(`${u.teachers.map(t => t.name).join(', ')} ${u.teachers.length === 1 ? 'teaches' : 'teach'} it. Move them to another class first.`);
  if (u.pendingSignups) reasons.push(`${u.pendingSignups} ${u.pendingSignups === 1 ? 'sign-up is' : 'sign-ups are'} waiting with this class. Accept or decline ${u.pendingSignups === 1 ? 'it' : 'them'} first.`);
  if (reasons.length) return { kind: 'blocked', reasons };
  return u.hasHistory ? { kind: 'retire' } : { kind: 'delete' };
}
