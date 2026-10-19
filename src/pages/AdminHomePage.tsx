// src/pages/AdminHomePage.tsx — what needs the admin today, and how attendance is going.
// Reads session totals (attendanceSummary) rather than every attendance record.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, ClipboardList, GraduationCap, Inbox, LayoutGrid, Lock, UserMinus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, SectionHeader } from '../components/layout/PageHeader';
import { Button, Card, EmptyState, ErrorState, Skeleton, StatTile, buttonVariants } from '../components/ui';
import { Stagger, StaggerItem } from '../components/motion';
import { ease, motion } from '../components/motion/config';
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
    signups > 0 && { to: '/admin/registrations', icon: <Inbox size={18} />, tone: 'bg-accent-100 text-accent-700', title: `${signups} ${signups === 1 ? 'sign-up' : 'sign-ups'} to review` },
    drops > 0 && { to: '/admin/requests', icon: <UserMinus size={18} />, tone: 'bg-butter text-class-butter-strong', title: `${drops} drop ${drops === 1 ? 'request' : 'requests'}` },
    setupGaps > 0 && { to: '/admin/classes', icon: <LayoutGrid size={18} />, tone: 'bg-sky text-class-sky-strong', title: `${setupGaps} ${setupGaps === 1 ? 'class needs' : 'classes need'} a semester or teacher` },
  ].filter(Boolean) as TodoItem[];

  return (
    <>
      <PageHeader
        eyebrow={`${greeting()}, ${firstName(profile?.name)}`}
        title="Overview"
        description="What needs you today, and how attendance is going."
        actions={signups > 0 && (
          <Link to="/admin/registrations" className={buttonVariants()}>
            <Inbox size={16} aria-hidden="true" /> Review {signups} {signups === 1 ? 'sign-up' : 'sign-ups'}
          </Link>
        )}
      />

      {!regOpen && (
        <div className="glass mb-5 flex flex-wrap items-center justify-between gap-3 rounded-card px-4 py-3 sm:px-5">
          <p className="flex items-center gap-2.5 text-small font-semibold text-bad-fg">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-bad-bg" aria-hidden="true"><Lock size={15} /></span>
            Sign-ups are paused. The public form is closed.
          </p>
          <Link to="/admin/settings" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Open sign-ups</Link>
        </div>
      )}

      <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StaggerItem>
          <StatTile featured label="Attendance" sub="This semester"
            value={stats.overall === null ? '—' : stats.overall} suffix="%" icon={<ClipboardList size={17} />} />
        </StaggerItem>
        <StaggerItem>
          <StatTile label="Students" sub="Active right now" value={students ?? '…'} icon={<Users size={17} />} />
        </StaggerItem>
        <StaggerItem>
          <StatTile label="Classes" sub="Running this semester" value={classes.length} icon={<LayoutGrid size={17} />} />
        </StaggerItem>
        <StaggerItem>
          <StatTile label="Teachers" sub="With an account" value={teachers} icon={<GraduationCap size={17} />} />
        </StaggerItem>
      </Stagger>

      <div className="mt-4 grid items-start gap-4 sm:mt-5 sm:gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card as="section" aria-labelledby="week-heading" className="grid gap-4">
          <SectionHeader id="week-heading" title="This week’s registers" description="Which sessions each teacher has sent." />
          {error ? (
            <ErrorState description="Check your connection and try again." onRetry={() => window.location.reload()} />
          ) : !summaries || !configs ? (
            <div className="grid gap-3" role="status" aria-live="polite">
              <span className="sr-only">Loading attendance…</span>
              {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
            </div>
          ) : classes.length === 0 ? (
            <EmptyState className="py-8 shadow-none" title="No classes yet" description="Add classes from Classes to start taking registers."
              action={<Link to="/admin/classes" className={buttonVariants({ variant: 'outline' })}>Set up classes</Link>} />
          ) : (
            <Stagger as="ul" className="-mx-2 grid gap-1">
              {classes.map(c => (
                <RegisterRow key={c.id} id={c.id} label={c.label} colorKey={c.colorKey} config={configs[c.id]}
                  sent={stats.sent} rate={stats.byClass[c.id]?.rate ?? null} students={counts?.[c.id]} />
              ))}
            </Stagger>
          )}
        </Card>

        <div className="order-first grid gap-4 sm:gap-5 lg:order-none">
          {todos.length > 0 && (
            <Card as="section" aria-labelledby="needs-heading" className="grid gap-3">
              <SectionHeader id="needs-heading" title="Waiting for you" />
              <Stagger as="ul" className="grid gap-2">
                {todos.map(t => <Todo key={t.to} {...t} />)}
              </Stagger>
            </Card>
          )}

          <Card as="section" aria-labelledby="trend-heading" className="grid gap-4">
            <SectionHeader id="trend-heading" title="Attendance by week" description="All classes together, not counting sessions with no class." />
            {!summaries || !configs ? (
              <Skeleton className="h-44 w-full rounded-md" />
            ) : stats.byWeek.length === 0 ? (
              <EmptyState className="py-8 shadow-none" title="No registers yet"
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
    <StaggerItem as="li">
      <Link to={to} className="lift group flex min-h-[56px] items-center gap-3 rounded-md border border-white/80 bg-white/65 px-3 py-2 text-small font-semibold shadow-sm focus-visible:outline-none focus-visible:shadow-focus">
        <span aria-hidden="true" className={cn('grid h-9 w-9 flex-none place-items-center rounded-full', tone)}>{icon}</span>
        <span className="min-w-0 flex-1">{title}</span>
        <ArrowRight size={16} aria-hidden="true" className="flex-none text-muted transition-transform group-hover:translate-x-0.5" />
      </Link>
    </StaggerItem>
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
        <span className="mr-0.5 font-mono text-label uppercase text-muted">{status === 'ended' ? 'Ended' : `Week ${week}`}</span>
        {Array.from({ length: sessions }, (_, i) => i + 1).map(n => {
          const done = sent.has(`${id}_W${week}_S${n}`);
          const off = holiday(n);
          const text = off ? 'no class' : done ? 'sent' : 'not sent';
          return (
            <span key={n} className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-bold',
              off ? 'bg-info-bg text-info-fg' : done ? 'bg-ok-bg text-ok-fg' : 'bg-warn-bg text-warn-fg',
            )}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
              {sessions > 1 ? `S${n} ${text}` : text}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <StaggerItem as="li" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-white/50">
      <span className="grid h-10 w-10 place-items-center rounded-[12px] border border-white/70 font-heading text-small font-extrabold"
        style={{ backgroundColor: color.surface, color: color.strong }} aria-hidden="true">
        {label.slice(0, 2)}
      </span>
      <div className="grid min-w-0 gap-1">
        <p className="truncate font-semibold leading-tight">
          {label}
          {students !== undefined && <span className="font-normal text-muted"> · {students} {students === 1 ? 'student' : 'students'}</span>}
        </p>
        <div className="text-small leading-tight">{detail}</div>
      </div>
      <p className={cn('text-right font-heading text-h3 font-extrabold tabular-nums', rate === null && 'text-muted')}
        aria-label={rate === null ? 'No attendance yet' : `${rate}% attendance`}>
        {rate === null ? '—' : `${rate}%`}
      </p>
    </StaggerItem>
  );
}

/** Bars grow up from the baseline in turn; the latest week is orange, earlier ones brown-tint */
function WeekBars({ weeks }: { weeks: { week: number; rate: number | null }[] }) {
  const last = weeks.length - 1;
  return (
    <figure>
      <div className="relative flex h-44 items-end gap-1.5" role="list" aria-label="Attendance rate by semester week">
        {/* 50% guide */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-line-strong/70" />
        {weeks.map((w, i) => (
          <div key={w.week} role="listitem" className="relative flex h-full flex-1 flex-col items-center justify-end gap-1"
            aria-label={`Week ${w.week}: ${w.rate === null ? 'nothing marked' : `${w.rate}%`}`}>
            <motion.span className={cn('text-caption font-bold tabular-nums', i === last ? 'text-accent-600' : 'text-muted')} aria-hidden="true"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.05, duration: 0.3 }}>
              {w.rate ?? '—'}
            </motion.span>
            <motion.div
              className={cn('w-full origin-bottom rounded-t-[8px] rounded-b-[3px]',
                i === last ? 'bg-primary-gradient shadow-[0_8px_18px_-8px_rgba(229,122,6,.7)]' : 'bg-[#E2D5C7]')}
              style={{ height: `${Math.max(2, w.rate ?? 0)}%` }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.55, ease }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5" aria-hidden="true">
        {weeks.map((w, i) => (
          <span key={w.week} className={cn('flex-1 text-center font-mono text-[0.625rem]', i === last ? 'font-bold text-accent-600' : 'text-muted')}>W{w.week}</span>
        ))}
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
