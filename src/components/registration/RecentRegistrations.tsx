// The ten newest students and sign-ups, live, beside the Add a student form. A student added
// here or a sign-up from the public link appears at the top as soon as it's saved.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock } from 'lucide-react';
import { Avatar, ClassChip, Skeleton } from '../ui';
import { useShell } from '../layout/shell';
import { subscribeToRegistrations } from '../../firebase/registrations';
import { subscribeToUsers } from '../../firebase/users';
import { studentPath } from '../../lib/studentPath';
import { formatDateShort, formatTime, toDate } from '../../utils/dateUtils';
import type { DateLike, Registration, UserProfile } from '../../types/firestore';

const SHOW = 10;

interface Row {
  key: string;
  to: string;
  name: string;
  classes: string[];
  /** Null while the server time is still being written, which means just now; undefined on old records with no date */
  when: Date | null | undefined;
  source: 'self' | 'admin' | 'pending';
  by?: string;
}

const at = (v: DateLike) => {
  if (v === undefined) return undefined;
  try { return toDate(v); } catch { return undefined; }
};

export function RecentRegistrations() {
  const shell = useShell();
  const [pending, setPending] = useState<Registration[] | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  useEffect(() => subscribeToRegistrations('pending', setPending, () => setPending([])), []);
  useEffect(() => subscribeToUsers((u: UserProfile[]) => setUsers(u)), []);

  const rows = useMemo<Row[]>(() => {
    const first = (uid?: string) => users.find(u => u.id === uid)?.name.split(' ')[0];
    const students: Row[] = (shell?.students ?? []).map(s => ({
      key: `s-${s.id}`, to: studentPath(s.id), name: s.name, classes: s.classes ?? [], when: at(s.createdAt),
      source: s.registrationId ? 'self' : 'admin', by: first(s.addedBy),
    }));
    const waiting: Row[] = (pending ?? []).map(r => ({
      key: `r-${r.id}`, to: '/admin/registrations', name: r.name, classes: r.classes, when: at(r.createdAt), source: 'pending',
    }));
    const ms = (r: Row) => (r.when === null ? Number.MAX_SAFE_INTEGER : r.when?.getTime() ?? 0);
    return [...students, ...waiting].sort((a, b) => ms(b) - ms(a)).slice(0, SHOW);
  }, [shell?.students, pending, users]);

  const loading = !shell?.students || pending === null;

  return (
    <section aria-labelledby="recent-heading" className="glass rounded-card p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="recent-heading" className="text-h2 font-semibold">Recent registrations</h2>
          <p className="text-small text-muted">The newest {SHOW}, updated live.</p>
        </div>
        <Link to="/admin/students" className="mt-0.5 whitespace-nowrap text-small font-semibold text-accent-600 underline-offset-4 hover:underline">All students</Link>
      </div>
      {loading ? (
        <div className="mt-3 grid gap-2.5" aria-label="Loading">
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11 w-full rounded-[7px]" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-small text-muted">No one has registered yet.</p>
      ) : (
        <ul className="mt-2 grid" aria-live="polite">
          {rows.map(r => (
            <li key={r.key} className="border-t border-line/70 first:border-0">
              <Link to={r.to} className="-mx-1.5 grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[7px] px-1.5 py-2 hover:bg-canvas focus-visible:outline-none focus-visible:shadow-focus">
                <Avatar name={r.name} size="sm" />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span className="min-w-0 truncate font-semibold">{r.name}</span>
                    {r.classes.map(c => <ClassChip key={c} classId={c} size="sm" />)}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-caption text-muted">
                    <span className="tabular-nums">{r.when ? `${formatDateShort(r.when)}, ${formatTime(r.when)}` : r.when === null ? 'Just now' : 'Date not recorded'}</span>
                    <span aria-hidden="true">·</span>
                    {r.source === 'pending' ? (
                      <span className="inline-flex items-center gap-1 font-medium text-warn-fg"><Clock size={11} aria-hidden="true" /> Waiting for review</span>
                    ) : r.source === 'self' ? (
                      <span>Self-registered</span>
                    ) : (
                      <span>Added by {r.by ?? 'an admin'}</span>
                    )}
                  </span>
                </span>
                <ChevronRight size={15} className="text-faint" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
