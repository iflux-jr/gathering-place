// Marking one session: a Present/Absent toggle per student, saved on the device as the
// teacher goes, and sent with one button at the end.
import { useEffect, useMemo, useState } from 'react';
import { CalendarOff, Check, CloudOff, Search, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar, Button, Card, Dialog, EmptyState, Input, ProgressBar } from '../ui';
import { AnimatedNumber, Stagger, StaggerItem } from '../motion';
import { motion, spring } from '../motion/config';
import { cn } from '../../lib/cn';
import { clearDraft, loadDraft, saveDraft, type Marks } from '../../lib/draft';
import { submitSessionAttendance } from '../../firebase/attendance';
import { setHoliday } from '../../firebase/classConfig';
import { formatDateShort, formatTime } from '../../utils/dateUtils';
import type { AttendanceRecord, Semester, Student } from '../../types/firestore';

interface RegisterPanelProps {
  classId: string;
  uid: string;
  week: number;
  session: number;
  semester: Semester;
  students: Student[];
  /** This week's records, all sessions */
  records: AttendanceRecord[];
  holiday: boolean;
}

export function RegisterPanel({ classId, uid, week, session, semester, students, records, holiday }: RegisterPanelProps) {
  const sessionRecords = useMemo(
    () => records.filter(r => r.sessionNumber === session),
    [records, session],
  );
  const saved: Marks = useMemo(() => {
    const m: Marks = {};
    for (const r of sessionRecords) if (typeof r.present === 'boolean') m[r.studentId] = r.present;
    return m;
  }, [sessionRecords]);
  const submittedAt = sessionRecords.reduce<Date | null>((latest, r) => {
    const t = r.updatedAt && typeof r.updatedAt === 'object' && 'toDate' in r.updatedAt ? r.updatedAt.toDate() : null;
    return t && (!latest || t > latest) ? t : latest;
  }, null);

  const [marks, setMarks] = useState<Marks>({});
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [holidayBusy, setHolidayBusy] = useState(false);
  // Sent while offline: safe on the device, and Firestore sends it when signal returns
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    const online = () => setWaiting(false);
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, []);
  useEffect(() => { setWaiting(false); }, [week, session]);

  // Saved marks, with any unsent changes from this device on top
  useEffect(() => {
    setMarks({ ...saved, ...(loadDraft(classId, week, session) ?? {}) });
  }, [classId, week, session, saved]);

  const unsent = students.some(s => s.id in marks && marks[s.id] !== saved[s.id]);
  const present = students.filter(s => marks[s.id] === true).length;
  const absent = students.filter(s => marks[s.id] === false).length;
  const unmarked = students.length - present - absent;

  function update(next: Marks) {
    setMarks(next);
    saveDraft(classId, week, session, next);
  }
  const mark = (id: string, value: boolean) => update({ ...marks, [id]: value });
  const markRest = (value: boolean) => {
    const next = { ...marks };
    for (const s of students) if (!(s.id in next)) next[s.id] = value;
    update(next);
  };

  async function submit() {
    if (unmarked > 0) return;
    setSending(true);
    try {
      const { queued } = await submitSessionAttendance(
        students.map(s => ({ studentId: s.id, studentName: s.name, present: marks[s.id] })),
        classId, uid, session, semester, false, week,
      );
      clearDraft(classId, week, session);
      setWaiting(queued);
      if (queued) toast.success('Saved on this phone. It will send when you’re back online.', { duration: 6000 });
      else toast.success(`Week ${week} sent`);
    } catch (err) {
      toast.error(err instanceof Error && err.message.startsWith('Attendance can only')
        ? err.message
        : 'Couldn’t send. Your marks are saved on this phone; try again.');
    } finally {
      setSending(false);
    }
  }

  async function toggleHoliday(on: boolean) {
    setHolidayBusy(true);
    try {
      await setHoliday(classId, week, session, on, uid);
      toast.success(on ? 'Marked as no class' : 'Class is back on for this session');
      setHolidayOpen(false);
    } catch {
      toast.error('Couldn’t save. Check your connection and try again.');
    } finally {
      setHolidayBusy(false);
    }
  }

  if (holiday) {
    return (
      <Card className="grid justify-items-center gap-3 px-6 py-12 text-center">
        <span className="mb-1 grid h-14 w-14 place-items-center rounded-full bg-info-bg text-info-fg shadow-raised" aria-hidden="true">
          <CalendarOff size={24} />
        </span>
        <h3 className="font-heading text-h3">No class this session</h3>
        <p className="max-w-[44ch] text-small text-muted">It won’t count towards anyone’s attendance.</p>
        <Button variant="outline" size="sm" className="mt-2" loading={holidayBusy} onClick={() => toggleHoliday(false)}>Undo, we had class</Button>
      </Card>
    );
  }

  if (students.length === 0) {
    return (
      <EmptyState
        icon={<Users />}
        title="No students yet"
        description="Students appear here once the admin accepts their sign-up. Share your class link from Invite students."
      />
    );
  }

  const q = search.trim().toLowerCase();
  const shown = q ? students.filter(s => s.name.toLowerCase().includes(q) || s.phone?.includes(q)) : students;
  const marked = students.length - unmarked;

  const sendNote = unsent ? (
    <span className="inline-flex items-center gap-1 text-warn-fg"><CloudOff size={12} aria-hidden="true" /> Not sent yet</span>
  ) : waiting ? (
    <span className="inline-flex items-center gap-1 text-warn-fg"><CloudOff size={12} aria-hidden="true" /> Saved on this phone, sends when online</span>
  ) : submittedAt ? (
    `Sent ${formatDateShort(submittedAt)}, ${formatTime(submittedAt)}`
  ) : null;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 gap-2.5" aria-live="polite">
        <Tally value={present} label="present" tone="text-ok-fg" dot="bg-ok-solid" />
        <Tally value={absent} label="absent" tone="text-bad-fg" dot="bg-bad-solid" />
        <Tally value={unmarked} label="not marked" tone={unmarked > 0 ? 'text-warn-fg' : 'text-muted'} dot={unmarked > 0 ? 'bg-accent-500' : 'bg-line-strong'} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {unmarked > 0 && (unmarked === students.length ? (
          <Button size="sm" variant="outline" onClick={() => markRest(true)}>
            <Check size={16} aria-hidden="true" /> Everyone present
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => markRest(true)}>
              <Check size={16} aria-hidden="true" /> <span className="sm:hidden">Rest present</span><span className="hidden sm:inline">Mark the rest present</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => markRest(false)}>
              <X size={16} aria-hidden="true" /> <span className="sm:hidden">Rest absent</span><span className="hidden sm:inline">Mark the rest absent</span>
            </Button>
          </>
        ))}
        <Button size="sm" variant="ghost" className="ml-auto px-3" onClick={() => setHolidayOpen(true)}>
          <CalendarOff size={16} aria-hidden="true" /> No class?
        </Button>
      </div>

      {students.length > 10 && (
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input type="search" aria-label="Find a student" placeholder="Find a student" className="pl-11"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      <Stagger as="ul" aria-label={`Students, week ${week} session ${session}`}
        className="glass divide-y divide-line/70 overflow-hidden rounded-card">
        {shown.map(s => {
          const value = marks[s.id];
          const changed = s.id in marks && value !== saved[s.id];
          return (
            <StaggerItem as="li" key={s.id} className="relative flex items-center gap-3 py-2.5 pl-3 pr-2.5 sm:pl-4">
              {/* Faint row tint once marked, faded in with opacity */}
              <span aria-hidden="true" className={cn(
                'pointer-events-none absolute inset-0 transition-opacity duration-300',
                value === true ? 'bg-ok-bg/50' : 'bg-bad-bg/60',
                value === undefined ? 'opacity-0' : 'opacity-100',
              )} />
              <Avatar name={s.name} size="md" className="relative" />
              <div className="relative min-w-0 flex-1">
                <p className="truncate font-semibold">{s.name}</p>
                {changed && <p className="text-caption font-medium text-warn-fg">Changed, not sent</p>}
              </div>
              <MarkToggle name={s.name} id={s.id} value={value} onChange={v => mark(s.id, v)} />
            </StaggerItem>
          );
        })}
        {shown.length === 0 && <li className="px-4 py-6 text-center text-small text-muted">No one matches “{search}”.</li>}
      </Stagger>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+90px)] z-20 lg:bottom-6">
        <div className="glass-strong flex items-center gap-3 rounded-[24px] py-2.5 pl-5 pr-2.5">
          <div className="grid min-w-0 flex-1 gap-1.5">
            <p className="text-small font-bold leading-tight">
              {unmarked ? `${marked} of ${students.length} marked` : 'Everyone marked'}
            </p>
            {sendNote
              ? <p className="truncate text-caption text-muted">{sendNote}</p>
              : <ProgressBar value={marked} max={students.length} label="Marked so far" className="h-1.5 max-w-[180px]" />}
          </div>
          <Button className="flex-none px-6" disabled={unmarked > 0 || (!unsent && (!!submittedAt || waiting))} loading={sending} onClick={submit}>
            {waiting && !unsent ? 'Waiting' : submittedAt && !unsent ? <><Check size={16} aria-hidden="true" /> Sent</> : submittedAt ? 'Send changes' : 'Send'}
          </Button>
        </div>
      </div>

      <Dialog
        open={holidayOpen}
        onOpenChange={setHolidayOpen}
        title="No class this session?"
        description={`Week ${week}${session > 1 ? `, session ${session}` : ''} won’t count towards anyone’s attendance. You can undo this.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setHolidayOpen(false)}>Cancel</Button>
            <Button variant="dark" loading={holidayBusy} onClick={() => toggleHoliday(true)}>Mark as no class</Button>
          </>
        }
      />
    </div>
  );
}

function Tally({ value, label, tone, dot }: { value: number; label: string; tone: string; dot: string }) {
  return (
    <div className="glass rounded-md px-3 py-2.5 sm:px-4">
      <p className={cn('font-heading text-[1.625rem] font-extrabold leading-none tabular-nums', tone)}>
        <AnimatedNumber value={value} />
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-caption font-semibold text-muted">
        <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', dot)} />{label}
      </p>
    </div>
  );
}

/**
 * Present / Absent for one student: a pressed-in track with a pill that slides to the
 * chosen side and a tick or cross that pops. Two real buttons with aria-pressed.
 */
function MarkToggle({ id, name, value, onChange }: { id: string; name: string; value: boolean | undefined; onChange: (v: boolean) => void }) {
  const options = [
    { v: true, label: 'Present', Icon: Check, pill: 'bg-ok-solid', on: 'text-white' },
    { v: false, label: 'Absent', Icon: X, pill: 'bg-bad-solid', on: 'text-white' },
  ] as const;
  return (
    <div role="group" aria-label={`${name}: attendance`}
      className="relative flex flex-none gap-0.5 rounded-full bg-ink/[.06] p-1 shadow-inset">
      {options.map(o => {
        const pressed = value === o.v;
        return (
          <button
            key={o.label}
            type="button"
            aria-pressed={pressed}
            aria-label={o.label}
            onClick={() => onChange(o.v)}
            className={cn(
              'relative inline-flex h-10 min-w-[52px] items-center justify-center gap-1.5 rounded-full px-3 sm:min-w-[104px]',
              'font-body text-small font-bold transition-transform duration-150 active:scale-95',
              'focus-visible:outline-none focus-visible:shadow-focus',
              pressed ? o.on : 'text-muted hover:text-ink',
            )}
          >
            {pressed && (
              <motion.span layoutId={`mark-${id}`} transition={spring} aria-hidden="true"
                className={cn('absolute inset-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,.3),0_4px_10px_-3px_rgba(43,27,18,.35)]', o.pill)} />
            )}
            <motion.span
              key={pressed ? 'on' : 'off'}
              initial={pressed ? { scale: 0.5 } : false}
              animate={{ scale: 1 }}
              transition={spring}
              className="relative"
              aria-hidden="true"
            >
              <o.Icon size={16} strokeWidth={pressed ? 3 : 2.25} />
            </motion.span>
            <span className="relative hidden sm:inline" aria-hidden="true">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
