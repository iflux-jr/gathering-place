// src/pages/TeacherPage.tsx — a teacher's class: mark attendance, see the roster, follow drop requests
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, School } from 'lucide-react';
import { RegisterPanel } from '../components/teacher/RegisterPanel';
import { RequestsPanel } from '../components/teacher/RequestsPanel';
import { RosterPanel } from '../components/teacher/RosterPanel';
import { WeekPicker } from '../components/teacher/WeekPicker';
import {
  Card, EmptyState, ErrorState, LoadingList, ProgressBar, Skeleton, TabPanel, Tabs, buttonVariants,
} from '../components/ui';
import { semesterLength, subscribeToWeekAttendance } from '../firebase/attendance';
import { isHolidaySession, subscribeToClassConfig } from '../firebase/classConfig';
import { subscribeToDropRequests } from '../firebase/dropRequests';
import { subscribeToStudentsByClass } from '../firebase/students';
import { motion, spring } from '../components/motion/config';
import { cn } from '../lib/cn';
import useAuthStore from '../store/authStore';
import { useClassColor, useClassLabel } from '../store/classStore';
import { currentSemesterWeek, formatDateShort, getSemesterStatus } from '../utils/dateUtils';
import type { AttendanceRecord, ClassConfig, DropRequest, Student, UserProfile } from '../types/firestore';

type Tab = 'register' | 'students' | 'requests';

export default function TeacherPage() {
  const profile = useAuthStore(s => s.profile) as UserProfile | null;
  const uid = useAuthStore(s => s.user?.uid) as string;
  const classId = profile?.assignedClass ?? null;

  if (!classId) {
    return (
      <EmptyState
        icon={<School size={32} />}
        title="You don’t have a class yet"
        description={profile?.role === 'admin'
          ? 'Give yourself a class from Settings to take attendance here.'
          : 'Ask the admin to assign you a class.'}
      />
    );
  }
  return <ClassView classId={classId} uid={uid} isAdmin={profile?.role === 'admin'} />;
}

function useLive<T>(subscribe: (cb: (v: T) => void, onError: () => void) => () => void, deps: unknown[]) {
  const [value, setValue] = useState<T | undefined>(undefined);
  const [error, setError] = useState(false);
  useEffect(() => {
    setValue(undefined);
    setError(false);
    return subscribe(setValue, () => setError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { value, error };
}

function ClassView({ classId, uid, isAdmin }: { classId: string; uid: string; isAdmin: boolean }) {
  const label = useClassLabel(classId);
  const color = useClassColor(classId);
  const config = useLive<ClassConfig | null>((cb, err) => subscribeToClassConfig(classId, cb, err), [classId]);
  const students = useLive<Student[]>((cb, err) => subscribeToStudentsByClass(classId, cb, err), [classId]);
  const drops = useLive<DropRequest[]>((cb, err) => subscribeToDropRequests(classId, cb, err), [classId]);

  const semester = config.value?.semester;
  const status = getSemesterStatus(semester);
  const currentWeek = currentSemesterWeek(semester);
  const totalWeeks = semesterLength(semester);
  const lastWeek = status === 'ended' ? totalWeeks : currentWeek ?? 0;
  const sessionsPerWeek = config.value?.sessionsPerWeek ?? 1;

  const [week, setWeek] = useState(0);
  const [session, setSession] = useState(1);
  const [tab, setTab] = useState<Tab>('register');
  useEffect(() => { if (lastWeek && (!week || week > lastWeek)) setWeek(lastWeek); }, [lastWeek, week]);
  useEffect(() => { if (session > sessionsPerWeek) setSession(1); }, [session, sessionsPerWeek]);

  const records = useLive<AttendanceRecord[]>(
    (cb, err) => (week ? subscribeToWeekAttendance(classId, week, cb, err) : () => {}),
    [classId, week],
  );
  const pendingDrops = (drops.value ?? []).filter(d => d.status === 'pending').length;

  const sessionDone = useMemo(() => {
    const done = new Set<number>();
    for (const r of records.value ?? []) done.add(r.sessionNumber);
    return done;
  }, [records.value]);

  const loadError = config.error || students.error;
  const hasSide = (config.value === undefined && !loadError) || (!!semester && (status === 'active' || status === 'ended') && !!week);

  return (
    <div className="grid gap-4 lg:gap-5">
      <header className="flex items-center gap-3">
        <span aria-hidden="true" className="grid h-10 w-10 flex-none place-items-center rounded-[9px] border"
          style={{ backgroundColor: color.surface, color: color.strong, borderColor: color.surface }}>
          <School size={20} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-heading text-h1 font-bold md:text-h1-lg">{label}</h1>
          <p className="truncate text-small text-muted">
            {isAdmin ? 'Your class' : 'Attendance'}
            {semester?.label && <> · {semester.label}</>}
            {semester && status === 'active' && currentWeek ? <> · Week {currentWeek} of {totalWeeks}</> : status === 'ended' ? <> · Ended</> : null}
          </p>
        </div>
      </header>

    <div className={cn('grid items-start gap-4 lg:gap-5', hasSide && 'lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]')}>
      {config.value === undefined && !loadError ? (
        <Skeleton className="h-28 w-full rounded-card" />
      ) : semester && (status === 'active' || status === 'ended') && week ? (
        <Card className="grid gap-4 lg:sticky lg:top-5">
          <WeekPicker week={week} lastWeek={lastWeek} totalWeeks={totalWeeks} currentWeek={currentWeek} semester={semester} onChange={setWeek} />
          <ProgressBar value={currentWeek ?? totalWeeks} max={totalWeeks} label="Semester progress"
            valueText={status === 'ended' ? 'Semester ended' : `Week ${currentWeek} of ${totalWeeks}`} />
          {sessionsPerWeek > 1 && (
            <SessionSwitch
              sessions={Array.from({ length: sessionsPerWeek }, (_, i) => i + 1).map(n => ({
                n,
                note: isHolidaySession(config.value, week, n) ? 'No class' : sessionDone.has(n) ? 'Sent' : 'To do',
              }))}
              value={session}
              onChange={setSession}
            />
          )}
          {semester && (
            <p className="text-caption text-muted">{formatDateShort(semester.startDate)} to {formatDateShort(semester.endDate)}</p>
          )}
        </Card>
      ) : null}

      <div className="min-w-0">
        {loadError ? (
          <ErrorState description="Check your connection and try again." onRetry={() => window.location.reload()} />
        ) : config.value === undefined || students.value === undefined ? (
          <LoadingList rows={5} label="Loading your class" />
        ) : (
          <Tabs
            label="Class sections"
            value={tab}
            onValueChange={v => setTab(v as Tab)}
            items={[
              { value: 'register', label: 'Register' },
              { value: 'students', label: 'Students' },
              { value: 'requests', label: 'Drop requests', count: pendingDrops },
            ]}
          >
            <TabPanel value="register">
              {status === 'not_configured' ? (
                <EmptyState icon={<CalendarClock size={32} />} title="Your class isn’t set up yet"
                  description="Ask the admin to set the semester dates and sessions per week." />
              ) : status === 'not_started' ? (
                <EmptyState icon={<CalendarClock size={32} />} title={`The semester starts ${formatDateShort(semester?.startDate)}`}
                  description="You can mark attendance from the first week. Meanwhile, invite students to sign up."
                  action={<Link to="/invite" className={buttonVariants({ variant: 'outline' })}>Invite students</Link>} />
              ) : records.error ? (
                <ErrorState description="Check your connection and try again." onRetry={() => window.location.reload()} />
              ) : records.value === undefined || !week ? (
                <LoadingList rows={5} label="Loading the register" />
              ) : (
                <RegisterPanel classId={classId} uid={uid} week={week} session={session} semester={semester!}
                  students={students.value} records={records.value} holiday={isHolidaySession(config.value, week, session)} />
              )}
            </TabPanel>
            <TabPanel value="students">
              <RosterPanel classId={classId} uid={uid} config={config.value} students={students.value} drops={drops.value ?? []} canRequestDrop={!isAdmin} />
            </TabPanel>
            <TabPanel value="requests">
              <RequestsPanel drops={drops.value ?? []} uid={uid} />
            </TabPanel>
          </Tabs>
        )}
      </div>
    </div>
    </div>
  );
}

/** Session 1 / Session 2 segmented control */
function SessionSwitch({ sessions, value, onChange }: { sessions: { n: number; note: string }[]; value: number; onChange: (n: number) => void }) {
  return (
    <div role="group" aria-label="Session" className="grid auto-cols-fr grid-flow-col gap-1 rounded-[10px] border border-line bg-white p-1">
      {sessions.map(({ n, note }) => {
        const active = n === value;
        return (
          <button key={n} type="button" aria-pressed={active} onClick={() => onChange(n)}
            className={cn(
              'relative grid min-h-[44px] place-items-center rounded-[7px] px-2 py-1 text-center leading-tight',
              'focus-visible:outline-none focus-visible:shadow-focus',
              active ? 'text-ink' : 'text-muted hover:text-ink',
            )}>
            {active && (
              <motion.span layoutId="session-pill" transition={spring} aria-hidden="true"
                className="absolute inset-0 rounded-[7px] bg-subtle" />
            )}
            <span className="relative text-small font-semibold">Session {n}</span>
            <span className={cn('relative text-caption font-medium',
              note === 'Sent' ? 'text-ok-fg' : note === 'No class' ? 'text-info-fg' : 'text-muted')}>{note}</span>
          </button>
        );
      })}
    </div>
  );
}
