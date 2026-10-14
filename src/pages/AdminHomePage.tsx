// src/pages/AdminHomePage.tsx — what needs the admin today, and how attendance is going.
// Reads session totals (attendanceSummary) rather than every attendance record.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, ClipboardList, GraduationCap, Inbox, LayoutGrid, Lock, UserMinus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, SectionHeader } from '../components/layout/PageHeader';
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

  const todos = [
    signups > 0 && { to: '/admin/registrations', icon: <Inbox size={18} />, tone: 'bg-mint', title: `${signups} ${signups === 1 ? 'sign-up' : 'sign-ups'} to review` },
    drops > 0 && { to: '/admin/requests', icon: <UserMinus size={18} />, tone: 'bg-butter', title: `${drops} drop ${drops === 1 ? 'request' : 'requests'}` },
    setupGaps > 0 && { to: '/admin/classes', icon: <LayoutGrid size={18} />, tone: 'bg-sky', title: `${setupGaps} ${setupGaps === 1 ? 'class needs' : 'classes need'} a semester or teacher` },
  ].filter(Boolean) as TodoItem[];

  return (
    <>
      <PageHeader eyebrow={`${greeting()}, ${firstName(profile?.name)}`} title="Overview" />

      {!regOpen && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-bad-fg/20 bg-bad-bg px-4 py-3 text-bad-fg sm:px-5">
          <p className="flex items-center gap-2 text-small font-semibold"><Lock size={16} aria-hidden="true" /> Sign-ups are paused. The public form is closed.</p>
          <Link to="/admin/settings" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Open sign-ups</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Students" value={students ?? '…'} icon={<Users size={16} />} />
        <StatTile label="Attendance" sub="this semester" value={stats.overall === null ? '—' : `${stats.overall}%`} icon={<ClipboardList size={16} />} />
        <StatTile label="Classes" value={classes.length} icon={<LayoutGrid size={16} />} />
        <StatTile label="Teachers" value={teachers} icon={<GraduationCap size={16} />} />
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <Card as="section" aria-labelledby="week-heading" className="grid gap-4">
          <SectionHeader id="week-heading" title="This week’s registers" description="Which sessions each teacher has sent." />
          {error ? (
            <ErrorState description="Check your connection and try again." onRetry={() => window.location.reload()} />
          ) : !summaries || !configs ? (
            <LoadingList rows={4} label="Loading attendance" />
          ) : (
            <ul className="-my-1 divide-y divide-line">
              {classes.map(c => (
                <RegisterRow key={c.id} id={c.id} label={c.label} colorKey={c.colorKey} config={configs[c.id]}
                  sent={stats.sent} rate={stats.byClass[c.id]?.rate ?? null} students={counts?.[c.id]} />
              ))}
            </ul>
          )}
        </Card>

        <div className="order-first grid gap-4 lg:order-none">
          {todos.length > 0 && (
            <Card as="section" aria-labelledby="needs-heading" className="grid gap-3">
              <SectionHeader id="needs-heading" title="Waiting for you" />
              <ul className="-mx-2 grid gap-1">
                {todos.map(t => <Todo key={t.to} {...t} />)}
              </ul>
            </Card>
          )}

          <Card as="section" aria-labelledby="trend-heading" className="grid gap-4">
            <SectionHeader id="trend-heading" title="Attendance by week" description="All classes together, not counting sessions with no class." />
            {!summaries || !configs ? null : stats.byWeek.length === 0 ? (
              <EmptyState className="border-0 bg-canvas py-8 shadow-none" title="No registers yet"
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
      </div>
    </>
  );
}

interface TodoItem { to: string; icon: ReactNode; title: string; tone: string }

function Todo({ to, icon, title, tone }: TodoItem) {
  return (
    <li>
      <Link to={to} className="group flex min-h-touch items-center gap-3 rounded-md px-2 py-2 text-small font-semibold hover:bg-canvas focus-visible:outline-none focus-visible:shadow-focus">
        <span aria-hidden="true" className={cn('grid h-9 w-9 flex-none place-items-center rounded-full', tone)}>{icon}</span>
        <span className="min-w-0 flex-1">{title}</span>
        <ArrowRight size={16} aria-hidden="true" className="flex-none text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
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
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
      <span className="h-9 w-1.5 rounded-full" style={{ backgroundColor: color.strong }} aria-hidden="true" />
      <div className="grid min-w-0 gap-1">
        <p className="truncate font-semibold leading-tight">
          {label}
          {students !== undefined && <span className="font-normal text-muted"> · {students} {students === 1 ? 'student' : 'students'}</span>}
        </p>
        <div className="text-small leading-tight">{detail}</div>
      </div>
      <p className={cn('text-right text-body font-semibold tabular-nums', rate === null && 'text-muted')}
        aria-label={rate === null ? 'No attendance yet' : `${rate}% attendance`}>
        {rate === null ? '—' : `${rate}%`}
      </p>
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
            <div className="w-full rounded-t-[6px] bg-accent-500" style={{ height: `${Math.max(2, w.rate ?? 0)}%` }} aria-hidden="true" />
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
