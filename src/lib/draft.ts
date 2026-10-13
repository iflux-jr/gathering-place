// Unsent attendance marks, kept on the device so closing the page or losing signal before
// submitting doesn't lose them. Storage can be unavailable (private mode, blocked site
// data), so every access is guarded and the page works without it.

export type Marks = Record<string, boolean>;

const PREFIX = 'gp:draft:v1';

function key(classId: string, week: number, session: number) {
  return `${PREFIX}:${classId}:W${week}:S${session}`;
}

export function loadDraft(classId: string, week: number, session: number): Marks | null {
  try {
    const raw = localStorage.getItem(key(classId, week, session));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === 'boolean')) as Marks;
  } catch {
    return null;
  }
}

export function saveDraft(classId: string, week: number, session: number, marks: Marks) {
  try {
    if (Object.keys(marks).length) localStorage.setItem(key(classId, week, session), JSON.stringify(marks));
    else localStorage.removeItem(key(classId, week, session));
  } catch {
    // Storage unavailable or full: marks stay in memory until submitted
  }
}

export function clearDraft(classId: string, week: number, session: number) {
  try {
    localStorage.removeItem(key(classId, week, session));
  } catch {
    // ignore
  }
}
