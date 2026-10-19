// src/pages/AdminHomePage.tsx — what needs the admin today, and how attendance is going.
// Reads session totals (attendanceSummary) rather than every attendance record.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowRight, Calculator, Check, ClipboardList, Download, Inbox, LayoutGrid, Lock,
  Send, ToggleRight, TrendingDown, TrendingUp, UserMinus, UserPlus, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/layout/PageHeader';
import { Avatar, Button, ErrorState, Skeleton, StatTile } from '../components/ui';
import { subscribeToAllClassConfigs } from '../firebase/classConfig';
import { countStudentsByClass } from '../firebase/classes';
import { subscribeToPendingDropRequests } from '../firebase/dropRequests';
import { subscribeToRegistrations } from '../firebase/registrations';
import { rebuildSummaries, subscribeToSummaries } from '../firebase/summaries';
import { subscribeToRegistrationStatus } from '../firebase/systemSettings';
import { subscribeToUsers } from '../firebase/users';
import { greeting } from '../lib/greeting';
import { cn } from '../lib/cn';
import { rollup, type SessionSummary } from '../lib/summaries';
import { biggestDrop, rate, registersForWeek, weeklyTotals, type WeekTotals } from '../lib/overview';
import { pickSemester } from '../lib/useSemester';
import useAuthStore from '../store/authStore';
import { useActiveClasses, useClassLookup } from '../store/classStore';
import { timeAgo } from '../utils/dateUtils';
import type { ClassConfig, DateLike, DropRequest, Registration, UserProfile } from '../types/firestore';

const firstName = (name?: string) => (name || '').trim().split(/\s+/)[0] || 'there';
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const listJoin = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export default function AdminHomePage() {
  const profile = useAuthStore(s => s.profile) as UserProfile | null;
  const classes = useActiveClasses();
  const lookup = useClassLookup();
  const [summaries, setSummaries] = useState<SessionSummary[] | null>(null);
  const [configs, setConfigs] = useState<Record<string, ClassConfig> | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [signups, setSignups] = useState<Registration[]>([]);
  const [drops, setDrops] = useState<DropRequest[]>([]);
  const [regOpen, setRegOpen] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => subscribeToSummaries(setSummaries, () => setError(true)), []);
  useEffect(() => subscribeToAllClassConfigs(setConfigs), []);
  useEffect(() => subscribeToUsers(setUsers), []);
  useEffect(() => subscribeToRegistrations('pending', setSignups), []);
  useEffect(() => subscribeToPendingDropRequests(setDrops), []);
  useEffect(() => subscribeToRegistrationStatus((s: { isOpen?: boolean }) => setRegOpen(s.isOpen !== false)), []);
  const ids = classes.map(c => c.id);
  const idKey = ids.join(',');
  useEffect(() => {
    if (idKey) countStudentsByClass(idKey.split(',')).then(setCounts).catch(() => setCounts({}));
  }, [idKey]);

  const loading = !summaries || !configs;
  const stats = useMemo(() => rollup(summaries ?? [], configs ?? {}), [summaries, configs]);
  const weeks = useMemo(() => weeklyTotals(summaries ?? [], configs ?? {}), [summaries, configs]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const semester = useMemo(() => (configs ? pickSemester(configs, ids) : null), [configs, idKey]);
  const week = semester?.status === 'active' ? semester.week : null;
  const registers = useMemo(
    () => (week && configs ? registersForWeek(ids.filter(id => configs[id]?.semester?.startDate), week, configs, stats.sent) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [week, configs, stats.sent, idKey],
  );
  const drop = useMemo(() => biggestDrop(summaries ?? [], configs ?? {}), [summaries, configs]);

  const students = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null;
  const teacherOf = (id: string) => users.find(u => u.assignedClass === id && (u.role === 'teacher' || u.role === 'admin'));
  const setupGaps = configs ? classes.filter(c => !configs[c.id]?.semester?.startDate || !teacherOf(c.id)) : [];

  const firstWeek = weeks[0], lastWeek = weeks[weeks.length - 1];
  const change = weeks.length > 1 ? (rate(lastWeek.present, lastWeek.marked) ?? 0) - (rate(firstWeek.present, firstWeek.marked) ?? 0) : null;

  return (
    <>
      <PageHeader
        eyebrow={`${greeting()}, ${firstName(profile?.name)}`}
        title="Overview"
        description={[
          new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' }),
          semester?.label,
          week && semester ? `Week ${week} of ${semester.weeks}` : null,
        ].filter(Boolean).join(' · ')}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Students" icon={<Users />} value={students ?? '…'} to="/admin/students"
          sub={`Across ${plural(classes.length, 'class', 'classes')}`} />
        <StatTile label="Attendance" icon={<ClipboardList />} value={stats.overall === null ? '—' : stats.overall} suffix="%" to="/admin/attendance"
          sub={change === null ? 'This semester' : (
            <>
              <span className={cn('inline-flex items-center gap-0.5 font-semibold', change < 0 ? 'text-bad-fg' : 'text-ok-fg')}>
                {change < 0 ? <TrendingDown aria-hidden="true" /> : <TrendingUp aria-hidden="true" />}
                {change > 0 ? '+' : change < 0 ? '−' : ''}{Math.abs(change)} pts
              </span>
              since week {firstWeek.week}
            </>
          )} />
        <StatTile label="Sign-ups" icon={<UserPlus />} value={signups.length} to="/admin/registrations"
          sub={signups.length ? `Oldest ${timeAgo(signups[0].createdAt).toLowerCase()}` : 'All caught up'} />
        <StatTile label="Registers" icon={<Send />} to="/admin/attendance"
          value={registers ? <>{registers.sent}<span className="text-h2 font-semibold text-faint"> / {registers.expected}</span></> : '—'}
          sub={!registers ? 'No semester running' : registers.waiting.length
            ? <><b className="font-semibold text-warn-fg">{registers.waiting.length}</b> waiting this week</>
            : 'All sent this week'} />
        <StatTile label="Drop requests" icon={<UserMinus />} value={drops.length} to="/admin/requests"
          className="col-span-2 md:col-span-1"
          sub={drops.length ? listJoin([...new Set(drops.map(d => lookup.label(d.className)))]) : 'None waiting'} />
      </div>

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-3">
          {/* Quick actions */}
          <section aria-labelledby="qa-heading" className="glass rounded-card p-4">
            <h2 id="qa-heading" className="text-h2">Quick actions</h2>
            <p className="text-small text-muted">The jobs you do most, one click away.</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <ActionTile to="/admin/registrations" tone="sky" icon={<Inbox />} title="Review sign-ups"
                sub={signups.length ? `${signups.length} waiting for you` : 'Nothing waiting'} />
              <ActionTile to="/admin/attendance" tone="lilac" icon={<Download />} title="Export data" sub="Attendance as a CSV" />
              <ActionTile to="/admin/classes" tone="mint" icon={<LayoutGrid />} title="Manage classes" sub="Teachers and semesters" />
              <ActionTile to="/admin/settings" tone="butter" icon={<ToggleRight />}
                title={regOpen ? 'Sign-ups are open' : 'Sign-ups are closed'} sub={regOpen ? 'Close them in Settings' : 'Open them in Settings'} />
            </div>
          </section>

          {/* Attendance chart */}
          <section aria-labelledby="trend-heading" className="glass grid gap-3 rounded-card p-4">
            <div>
              <h2 id="trend-heading" className="text-h2">Attendance this semester</h2>
              <p className="text-small text-muted">Students present and marked each week, all classes together.</p>
            </div>
            {error ? (
              <ErrorState className="py-8" description="Check your connection and try again." onRetry={() => window.location.reload()} />
            ) : loading ? (
              <Skeleton className="h-64 w-full rounded-md" />
            ) : weeks.length === 0 ? (
              <div className="grid justify-items-center gap-2 rounded-md border border-dashed border-line-strong px-6 py-10 text-center">
                <p className="text-h2">No registers yet</p>
                <p className="max-w-[46ch] text-small text-muted">Totals appear here as teachers send registers. If attendance was taken before this update, recalculate once.</p>
                <RecalcButton />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
                <WeekChart weeks={weeks.slice(-12)} />
                <div className="grid content-start gap-3">
                  <ThisWeek weeks={weeks} />
                  <WorthALook drop={drop} label={drop ? lookup.label(drop.classId) : ''} />
                </div>
              </div>
            )}
            {!loading && weeks.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-small text-muted">
                <p>
                  {stats.overall !== null && <>Attendance is <b className="font-semibold text-ink">{stats.overall}%</b> this semester</>}
                  {change !== null && <>, {change < 0 ? 'down' : 'up'} <b className="font-semibold text-ink">{Math.abs(change)} points</b> since week {firstWeek.week}</>}.
                </p>
                <RecalcButton quiet />
              </div>
            )}
          </section>
        </div>

        <div className="grid gap-3">
          <ActivityFeed signups={signups} drops={drops} label={lookup.label} />
          <NeedsAttention
            regOpen={regOpen}
            setup={setupGaps.map(c => ({ id: c.id, label: c.label, noSemester: !configs?.[c.id]?.semester?.startDate, noTeacher: !teacherOf(c.id) }))}
            waiting={registers?.waiting.map(w => ({ ...w, label: lookup.label(w.classId), sessions: configs?.[w.classId]?.sessionsPerWeek ?? 1 })) ?? []}
          />
        </div>
      </div>
    </>
  );
}

const TILE_TONES = {
  sky:    'border-[#D3E4F2] bg-[#EEF5FB] [&_.ti]:text-class-sky-strong [&_.ti]:border-[#CBDDEE]',
  lilac:  'border-[#E0D7EF] bg-[#F3EFF9] [&_.ti]:text-class-lilac-strong [&_.ti]:border-[#DDD3EE]',
  mint:   'border-[#CFE7DA] bg-[#ECF6F0] [&_.ti]:text-class-mint-strong [&_.ti]:border-[#CBE5D7]',
  butter: 'border-[#F1E2B9] bg-[#FDF6E6] [&_.ti]:text-class-butter-strong [&_.ti]:border-[#EEDDB0]',
};

function ActionTile({ to, tone, icon, title, sub }: { to: string; tone: keyof typeof TILE_TONES; icon: ReactNode; title: string; sub: string }) {
  return (
    <Link to={to} className={cn('lift flex min-h-[96px] flex-col justify-between gap-3 rounded-md border p-3 focus-visible:outline-none focus-visible:shadow-focus', TILE_TONES[tone])}>
      <span aria-hidden="true" className="ti grid h-[30px] w-[30px] place-items-center rounded-[7px] border bg-white [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <span>
        <span className="block text-body font-semibold leading-snug text-ink">{title}</span>
        <span className="block text-caption text-muted">{sub}</span>
      </span>
    </Link>
  );
}

/** Area chart of students present (solid) against students marked (dashed) per week */
function WeekChart({ weeks }: { weeks: WeekTotals[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [show, setShow] = useState({ present: true, marked: true });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w: W, h: H } = size;
  const L = 32, R = 10, T = 8, B = 22;
  const top = Math.max(10, Math.ceil(Math.max(...weeks.map(x => x.marked)) / 10) * 10);
  const x = (i: number) => (weeks.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (weeks.length - 1));
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const curve = (pts: [number, number][]) => pts.map((p, i) => {
    if (!i) return `M${p[0]},${p[1]}`;
    const [x0, y0] = pts[i - 1], cx = (x0 + p[0]) / 2;
    return `C${cx},${y0} ${cx},${p[1]} ${p[0]},${p[1]}`;
  }).join('');
  const series = [
    { key: 'marked' as const, label: 'Marked', color: '#C9A27F', dashed: true, value: (w: WeekTotals) => w.marked },
    { key: 'present' as const, label: 'Present', color: '#236B42', dashed: false, value: (w: WeekTotals) => w.present },
  ];
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(top * f));
  const summary = weeks.map(w => `Week ${w.week}: ${w.present} of ${w.marked} present`).join('. ');

  return (
    <div className="grid min-h-[240px] grid-rows-[auto_minmax(0,1fr)] gap-2 rounded-md border border-line px-3 pb-2 pt-3">
      <div className="flex items-center gap-4 text-caption text-muted">
        {[...series].reverse().map(s => (
          <button key={s.key} type="button" aria-pressed={show[s.key]} onClick={() => setShow(v => ({ ...v, [s.key]: !v[s.key] }))}
            className={cn('inline-flex min-h-[32px] items-center gap-1.5 rounded focus-visible:outline-none focus-visible:shadow-focus', !show[s.key] && 'opacity-45')}>
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: s.color }} />{s.label}
          </button>
        ))}
        <span className="ml-auto">Weeks {weeks[0].week}–{weeks[weeks.length - 1].week}</span>
      </div>
      <div ref={box} className="relative min-h-[190px]">
        {W > 0 && (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 overflow-visible" role="img" aria-label={summary}>
            <defs>
              {series.map(s => (
                <linearGradient key={s.key} id={`wk-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor={s.color} stopOpacity=".2" />
                  <stop offset="1" stopColor={s.color} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>
            {ticks.map(t => (
              <g key={t}>
                <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#EEEBE7" strokeDasharray={t ? '3 4' : undefined} />
                <text x={L - 8} y={y(t) + 3.5} textAnchor="end" className="fill-faint text-[10.5px]">{t}</text>
              </g>
            ))}
            {weeks.map((w, i) => (
              <text key={w.week} x={x(i)} y={H - 4} className="fill-faint text-[10.5px]"
                textAnchor={weeks.length === 1 ? 'middle' : i === 0 ? 'start' : i === weeks.length - 1 ? 'end' : 'middle'}>
                Wk {w.week}
              </text>
            ))}
            {series.filter(s => show[s.key]).map(s => {
              const pts = weeks.map((w, i) => [x(i), y(s.value(w))] as [number, number]);
              const line = curve(pts);
              const last = pts[pts.length - 1];
              return (
                <g key={s.key}>
                  {weeks.length > 1 && <path d={`${line}L${last[0]},${y(0)}L${pts[0][0]},${y(0)}Z`} fill={`url(#wk-${s.key})`} />}
                  <path d={line} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? '5 4' : undefined} />
                  <circle cx={last[0]} cy={last[1]} r="4" fill={s.color} stroke="#fff" strokeWidth="2" />
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}

function ThisWeek({ weeks }: { weeks: WeekTotals[] }) {
  const cur = weeks[weeks.length - 1], prev = weeks[weeks.length - 2];
  const absent = (w?: WeekTotals) => (w ? w.marked - w.present : 0);
  const delta = (a: number, b?: number) => {
    if (b === undefined) return null;
    const d = a - b;
    return d === 0 ? 'Same as last week' : `${d > 0 ? '+' : '−'}${Math.abs(d)} on last week`;
  };
  return (
    <div className="rounded-md border border-line bg-canvas/60 p-3">
      <h3 className="mb-2 text-body font-semibold">Week {cur.week}</h3>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Present', value: cur.present, d: delta(cur.present, prev?.present) },
          { label: 'Absent', value: absent(cur), d: delta(absent(cur), prev ? absent(prev) : undefined) },
        ].map(t => (
          <div key={t.label} className="rounded-[7px] border border-line bg-white p-2">
            <span className="block text-caption text-muted">{t.label}</span>
            <b className="block text-h1 tabular-nums">{t.value}</b>
            {t.d && <span className="block text-[0.6875rem] leading-tight text-faint">{t.d}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function WorthALook({ drop, label }: { drop: ReturnType<typeof biggestDrop>; label: string }) {
  return (
    <div className="grid gap-1.5 rounded-md border border-line bg-canvas/60 p-3">
      <h3 className="flex items-center gap-1.5 text-body font-semibold"><Activity className="h-4 w-4 text-accent-600" aria-hidden="true" />Worth a look</h3>
      {drop ? (
        <>
          <p className="text-small text-ink-2"><b className="font-semibold">{label}</b> fell from {drop.from}% in week {drop.fromWeek} to {drop.to}% in week {drop.toWeek}, the biggest drop of any class.</p>
          <Link to="/admin/attendance" className="inline-flex items-center gap-1 text-small font-semibold hover:underline focus-visible:outline-none focus-visible:shadow-focus">
            Open attendance <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </>
      ) : (
        <p className="text-small text-ink-2">No class has dropped more than 5 points since its first week.</p>
      )}
    </div>
  );
}

interface FeedItem { key: string; when: DateLike; name: string; text: ReactNode; meta: ReactNode; icon: ReactNode; to: string }

function ActivityFeed({ signups, drops, label }: { signups: Registration[]; drops: DropRequest[]; label: (id: string) => string }) {
  const ms = (d: DateLike) => (d && typeof d === 'object' && 'toMillis' in d ? d.toMillis() : d ? new Date(d as string).getTime() : 0);
  const items: FeedItem[] = [
    ...signups.map(r => ({
      key: `r-${r.id}`, when: r.createdAt, name: r.name, to: '/admin/registrations',
      text: <><b className="font-semibold">{r.name}</b> signed up for {listJoin(r.classes.map(label))}</>,
      meta: <>{r.ward ? `${r.ward} · ` : ''}{r.id}</>, icon: <UserPlus aria-hidden="true" />,
    })),
    ...drops.map(d => ({
      key: `d-${d.id}`, when: d.requestedAt, name: d.studentName, to: '/admin/requests',
      text: <>Drop requested for <b className="font-semibold">{d.studentName}</b> from {label(d.className)}</>,
      meta: d.reason ? `“${d.reason}”` : 'No reason given', icon: <UserMinus aria-hidden="true" />,
    })),
  ].sort((a, b) => ms(b.when) - ms(a.when)).slice(0, 4);

  return (
    <section aria-labelledby="feed-heading" className="glass rounded-card p-4">
      <h2 id="feed-heading" className="text-h2">Latest activity</h2>
      <p className="text-small text-muted">New sign-ups and drop requests.</p>
      {items.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-small text-muted"><Check className="h-4 w-4 text-ok-fg" aria-hidden="true" />Nothing new is waiting.</p>
      ) : (
        <ul className="mt-3 grid gap-2.5">
          {items.map(i => (
            <li key={i.key}>
              <Link to={i.to} className="-mx-1.5 grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-2.5 rounded-[7px] px-1.5 py-1 hover:bg-canvas focus-visible:outline-none focus-visible:shadow-focus">
                <Avatar name={i.name} size="sm" />
                <span className="min-w-0">
                  <span className="block text-body leading-snug">{i.text}</span>
                  <span className="mt-0.5 flex items-center gap-1 truncate text-caption text-faint [&_svg]:h-3 [&_svg]:w-3">{i.icon}<span className="truncate">{i.meta}</span></span>
                </span>
                <span className="whitespace-nowrap pt-0.5 text-[0.6875rem] text-faint">{timeAgo(i.when)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NeedsAttention({ regOpen, setup, waiting }: {
  regOpen: boolean;
  setup: { id: string; label: string; noSemester: boolean; noTeacher: boolean }[];
  waiting: { classId: string; session: number; label: string; sessions: number }[];
}) {
  const notes: ReactNode[] = [];
  if (setup.length) {
    const one = setup[0];
    const what = (c: typeof one) => (c.noSemester && c.noTeacher ? 'a teacher and a semester' : c.noSemester ? 'a semester' : 'a teacher');
    notes.push(
      <Note key="setup" tone="warn" tag="Priority" icon={<AlertTriangle />}
        title={setup.length === 1 ? `${one.label} can’t take a register yet` : `${setup.length} classes aren’t set up`}
        body={setup.length === 1 ? `Add ${what(one)} to open it.` : `${listJoin(setup.map(c => c.label))} need a teacher or a semester.`}
        action={<Link to="/admin/classes" className={noteBtn.warn}><LayoutGrid aria-hidden="true" />Set up {setup.length === 1 ? 'class' : 'classes'}</Link>} />,
    );
  }
  if (waiting.length) {
    const names = [...new Set(waiting.map(w => (w.sessions > 1 ? `${w.label} (session ${w.session})` : w.label)))];
    notes.push(
      <Note key="unsent" tone="pink" tag="This week" icon={<Send />}
        title={`${plural(waiting.length, 'register')} not sent yet`}
        body={`${listJoin(names)} ${waiting.length === 1 ? 'is' : 'are'} still waiting.`}
        action={<Link to="/admin/attendance" className={noteBtn.pink}><ClipboardList aria-hidden="true" />View registers</Link>} />,
    );
  }
  if (!regOpen) {
    notes.push(
      <Note key="closed" tone="neutral" icon={<Lock />} title="Sign-ups are closed" body="The public form shows a closed message."
        action={<Link to="/admin/settings" className={noteBtn.neutral}>Open sign-ups</Link>} />,
    );
  }
  return (
    <section aria-labelledby="needs-heading" className="glass grid gap-2 rounded-card p-4">
      <h2 id="needs-heading" className="text-h2">Needs attention</h2>
      {notes.length ? notes : (
        <p className="flex items-center gap-2 text-small text-muted"><Check className="h-4 w-4 text-ok-fg" aria-hidden="true" />Every class is set up and every register is in.</p>
      )}
    </section>
  );
}

const noteBtn = {
  warn:    'inline-flex min-h-[32px] items-center gap-1.5 rounded-full bg-[#F5B94A] px-3 text-small font-semibold text-ink hover:bg-[#F0AE36] focus-visible:outline-none focus-visible:shadow-focus [&_svg]:h-3.5 [&_svg]:w-3.5',
  pink:    'inline-flex min-h-[32px] items-center gap-1.5 rounded-full bg-[#B8324F] px-3 text-small font-semibold text-white hover:bg-[#A32A45] focus-visible:outline-none focus-visible:shadow-focus [&_svg]:h-3.5 [&_svg]:w-3.5',
  neutral: 'inline-flex min-h-[32px] items-center gap-1.5 rounded-full bg-primary px-3 text-small font-semibold text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:shadow-focus',
};
const noteTone = {
  warn:    'border-[#F3DDB0] bg-[#FFF7E8] [&_.ni]:text-warn-fg',
  pink:    'border-[#F5CCD6] bg-[#FFF1F3] [&_.ni]:text-[#A3324E]',
  neutral: 'border-line bg-canvas [&_.ni]:text-muted',
};

function Note({ tone, tag, icon, title, body, action }: { tone: keyof typeof noteTone; tag?: string; icon: ReactNode; title: string; body: string; action: ReactNode }) {
  return (
    <div className={cn('grid gap-1 rounded-md border px-3 py-2.5', noteTone[tone])}>
      <p className="flex items-start gap-2 text-body font-semibold">
        <span className="ni mt-0.5 [&_svg]:h-[15px] [&_svg]:w-[15px]" aria-hidden="true">{icon}</span>
        <span className="flex-1">{title}</span>
        {tag && <span className="ni text-[0.6875rem] font-semibold">{tag}</span>}
      </p>
      <p className="ml-[23px] text-small text-ink-2">{body}</p>
      <div className="ml-[23px] mt-1">{action}</div>
    </div>
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
      <Calculator size={14} aria-hidden="true" /> Recalculate totals
    </Button>
  );
}
