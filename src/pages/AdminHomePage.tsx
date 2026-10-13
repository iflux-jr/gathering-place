// src/pages/AdminHomePage.tsx — what needs the admin today, and how attendance is going.
// Reads session totals (attendanceSummary) rather than every attendance record.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, ClipboardList, GraduationCap, Inbox, LayoutGrid, Lock, UserMinus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, EmptyState, ErrorState, LoadingList, StatTile, buttonVariants } from '../components/ui';
import { subscribeToAllClassConfigs } from '../firebase/classConfig';
import { countStudentsByClass } from '../firebase/classes';
import { subscribeToPendingDropRequests } from '../firebase/dropRequests';
import { subscribeToPendingRegistrationCount } from '../firebase/registrations';
import { rebuildSummaries, subscribeToSummaries } from '../firebase/summaries';
import { subscribeToRegistrationStatus } from '../firebase/systemSettings';
import { subscribeToUsers } from '../firebase/users';
import { semesterLength } from '../firebase/attendance';
import { greeting } from '../lib/greeting';
import { cn } from '../lib/cn';
import { rollup, type SessionSummary } from '../lib/summaries';
import useAuthStore from '../store/authStore';
import { useActiveClasses } from '../store/classStore';
import { getClassColor } from '../theme/classes';
import { currentSemesterWeek, getSemesterStatus } from '../utils/dateUtils';
import type { ClassConfig, UserProfile } from '../types/firestore';

const firstName = (name?: string) => (name || '').trim().split(/\s+/)[0] || 'there';

export default function AdminHomePage() {
  const profile = useAuthStore(s => s.profile) as UserProfile | null;
  const classes = useActiveClasses();
  const [summaries, setSummaries] = useState<SessionSummary[] | null>(null);
  const [configs, setConfigs] = useState<Record<string, ClassConfig> | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [signups, setSignups] = useState(0);
  const [drops, setDrops] = useState(0);
  const [regOpen, setRegOpen] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => subscribeToSummaries(setSummaries, () => setError(true)), []);
  useEffect(() => subscribeToAllClassConfigs(setConfigs), []);
  useEffect(() => subscribeToUsers(setUsers), []);
  useEffect(() => subscribeToPendingRegistrationCount(setSignups), []);
  useEffect(() => subscribeToPendingDropRequests((r: unknown[]) => setDrops(r.length)), []);
  useEffect(() => subscribeToRegistrationStatus((s: { isOpen?: boolean }) => setRegOpen(s.isOpen !== false)), []);
  const ids = classes.map(c => c.id).join(',');
  useEffect(() => {
    if (ids) countStudentsByClass(ids.split(',')).then(setCounts).catch(() => setCounts({}));
  }, [ids]);

  const stats = useMemo(() => rollup(summaries ?? [], configs ?? {}), [summaries, configs]);
  const students = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null;
  const teachers = users.filter(u => u.role === 'teacher').length;
  const teacherOf = (id: string) => users.find(u => u.assignedClass === id && (u.role === 'teacher' || u.role === 'admin'));

  const setupGaps = configs
    ? classes.filter(c => !configs[c.id]?.semester?.startDate || !teacherOf(c.id)).length
    : 0;

  return (
    <>
      <PageHeader eyebrow={`${greeting()}, ${firstName(profile?.name)}`} title="Overview" />

      {!regOpen && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card border-1.5 border-ink bg-bad-bg p-4 text-bad-fg">
          <p className="flex items-center gap-2 font-semibold"><Lock size={18} aria-hidden="true" /> Sign-ups are paused. The public form is closed.</p>
          <Link to="/admin/settings" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Open sign-ups</Link>
        </div>
      )}

      {(signups > 0 || drops > 0 || setupGaps > 0) && (
        <section aria-labelledby="needs-heading" className="mb-8">
          <h2 id="needs-heading" className="mb-3 font-heading text-h3">Waiting for you</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {signups > 0 && <Todo to="/admin/registrations" icon={<Inbox size={20} />} tone="bg-lime" title={`${signups} ${signups === 1 ? 'sign-up' : 'sign-ups'} to review`} />}
            {drops > 0 && <Todo to="/admin/requests" icon={<UserMinus size={20} />} tone="bg-warn-bg" title={`${drops} drop ${drops === 1 ? 'request' : 'requests'}`} />}
            {setupGaps > 0 && <Todo to="/admin/classes" icon={<LayoutGrid size={20} />} tone="bg-surface" title={`${setupGaps} ${setupGaps === 1 ? 'class needs' : 'classes need'} a semester or teacher`} />}
          </ul>
        </section>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Students" value={students ?? '…'} icon={<Users size={20} />} />
        <StatTile label="Attendance" sub="This semester" value={stats.overall === null ? '—' : `${stats.overall}%`} icon={<ClipboardList size={20} />} />
        <StatTile label="Classes" value={classes.length} icon={<LayoutGrid size={20} />} />
        <StatTile label="Teachers" value={teachers} icon={<GraduationCap size={20} />} />
      </div>

      {error ? (
        <ErrorState description="Check your connection and try again." onRetry={() => window.location.reload()} />
      ) : !summaries || !configs ? (
        <LoadingList rows={4} label="Loading attendance" />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Card as="section" aria-labelledby="week-heading" className="grid content-start gap-4">
            <div>
              <h2 id="week-heading" className="font-heading text-h3">This week’s registers</h2>
              <p className="text-small text-muted">Which sessions each teacher has sent.</p>
            </div>
            <ul className="grid gap-2">
              {classes.map(c => (
                <RegisterRow key={c.id} id={c.id} label={c.label} colorKey={c.colorKey} config={configs[c.id]}
                  sent={stats.sent} rate={stats.byClass[c.id]?.rate ?? null} students={counts?.[c.id]} />
              ))}
            </ul>
          </Card>

          <Card as="section" aria-labelledby="trend-heading" className="grid content-start gap-4">
            <div>
              <h2 id="trend-heading" className="font-heading text-h3">Attendance by week</h2>
              <p className="text-small text-muted">All classes together, not counting sessions with no class.</p>
            </div>
            {stats.byWeek.length === 0 ? (
              <EmptyState title="No registers yet"
                description="Totals appear here as teachers send registers. If attendance was taken before this update, recalculate once."
                action={<RecalcButton />} />
            ) : (
              <>
                <WeekBars weeks={stats.byWeek.slice(-12)} />
                <div className="flex justify-end"><RecalcButton quiet /></div>
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

function Todo({ to, icon, title, tone }: { to: string; icon: ReactNode; title: string; tone: string }) {
  return (
    <li>
      <Link to={to} className={cn(
        'flex min-h-touch items-center gap-3 rounded-md border-1.5 border-ink p-4 font-semibold transition-shadow',
        'hover:shadow-sm focus-visible:outline-none focus-visible:shadow-focus', tone,
      )}>
        <span aria-hidden="true">{icon}</span>
        <span className="flex-1">{title}</span>
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </li>
  );
}

function RegisterRow({ id, label, colorKey, config, sent, rate, students }: {
  id: string; label: string; colorKey: string; config?: ClassConfig; sent: Set<string>; rate: number | null; students?: number;
}) {
  const color = getClassColor(id, colorKey);
  const semester = config?.semester;
  const status = getSemesterStatus(semester);
  const week = status === 'ended' ? semesterLength(semester) : currentSemesterWeek(semester);
  const sessions = config?.sessionsPerWeek ?? 1;
  const holiday = (n: number) => config?.holidays?.some(h => h.key === `W${week}_S${n}`);

  let detail: ReactNode;
  if (status === 'not_configured') detail = <span className="text-muted">Semester not set up</span>;
  else if (status === 'not_started') detail = <span className="text-muted">Starts soon</span>;
  else {
    detail = (
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-muted">{status === 'ended' ? 'Ended' : `Week ${week}`}</span>
        {Array.from({ length: sessions }, (_, i) => i + 1).map(n => {
          const done = sent.has(`${id}_W${week}_S${n}`);
          const off = holiday(n);
          const text = off ? 'no class' : done ? 'sent' : 'not sent';
          return (
            <span key={n} className={cn(
              'rounded-full px-2 py-0.5 text-caption font-semibold',
              off ? 'bg-info-bg text-info-fg' : done ? 'bg-ok-bg text-ok-fg' : 'bg-warn-bg text-warn-fg',
            )}>
              {sessions > 1 ? `S${n} ${text}` : text}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border-1.5 border-line bg-surface p-3">
      <span className="h-8 w-2 rounded-full border border-ink" style={{ backgroundColor: color.surface }} aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate font-semibold">{label}</p>
        <div className="text-small">{detail}</div>
      </div>
      <div className="text-right">
        <p className="font-heading text-h3 tabular-nums">{rate === null ? '—' : `${rate}%`}</p>
        <p className="text-caption text-muted">{students === undefined ? '' : `${students} ${students === 1 ? 'student' : 'students'}`}</p>
      </div>
    </li>
  );
}

function WeekBars({ weeks }: { weeks: { week: number; rate: number | null }[] }) {
  return (
    <figure>
      <div className="flex h-40 items-end gap-1.5" role="list" aria-label="Attendance rate by semester week">
        {weeks.map(w => (
          <div key={w.week} role="listitem" className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            aria-label={`Week ${w.week}: ${w.rate === null ? 'nothing marked' : `${w.rate}%`}`}>
            <span className="text-caption font-semibold tabular-nums" aria-hidden="true">{w.rate ?? '—'}</span>
            <div className="w-full rounded-t-[6px] border-1.5 border-ink bg-flame-500" style={{ height: `${Math.max(2, w.rate ?? 0)}%` }} aria-hidden="true" />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5" aria-hidden="true">
        {weeks.map(w => <span key={w.week} className="flex-1 text-center text-caption text-muted">W{w.week}</span>)}
      </div>
    </figure>
  );
}

function RecalcButton({ quiet = false }: { quiet?: boolean }) {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const n = await rebuildSummaries();
      toast.success(n ? `Recalculated ${n} ${n === 1 ? 'session' : 'sessions'}` : 'No attendance to count yet');
    } catch {
      toast.error('Couldn’t recalculate. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button size="sm" variant={quiet ? 'ghost' : 'outline'} loading={busy} onClick={run}>
      <Calculator size={16} aria-hidden="true" /> Recalculate totals
    </Button>
  );
}
