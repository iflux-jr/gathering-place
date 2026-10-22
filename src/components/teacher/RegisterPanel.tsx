// Marking one session: a Present/Absent toggle per student, saved on the device as the
// teacher goes, and sent with one button at the end.
import { useEffect, useMemo, useState } from 'react';
import { CalendarOff, Check, CloudOff, Search, Send, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar, Button, Card, Dialog, EmptyState, Input } from '../ui';
import { AnimatedNumber, Stagger, StaggerItem } from '../motion';
import { cn } from '../../lib/cn';
import { StudentLink } from '../shared/StudentLink';
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
        <span className="mb-1 grid h-14 w-14 place-items-center rounded-full bg-info-bg text-info-fg" aria-hidden="true">
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
    <span className="text-warn-fg"><CloudOff size={12} className="mr-1 inline align-[-1px]" aria-hidden="true" />Not sent yet</span>
  ) : waiting ? (
    <span className="text-warn-fg"><CloudOff size={12} className="mr-1 inline align-[-1px]" aria-hidden="true" />Saved on this phone, sends when online</span>
  ) : submittedAt ? (
    `Sent ${formatDateShort(submittedAt)}, ${formatTime(submittedAt)}`
  ) : null;

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="grid grid-cols-3 gap-2" aria-live="polite">
        <Tally value={present} label="Present" dot="bg-ok-solid" />
        <Tally value={absent} label="Absent" dot="bg-bad-solid" />
        <Tally value={unmarked} label="Not marked" dot={unmarked > 0 ? 'bg-accent-500' : 'bg-line-strong'} />
      </div>

      <section className="overflow-hidden rounded-card border border-line bg-white">
        <div className="flex flex-wrap items-center gap-2 px-4 pb-2.5 pt-3">
          <h2 className="font-heading text-h3 font-semibold">Students · {students.length}</h2>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
            {unmarked > 0 && unmarked < students.length && (
              <Button size="sm" variant="ghost" className="px-2.5" onClick={() => markRest(false)}>
                <X size={15} aria-hidden="true" /> Rest absent
              </Button>
            )}
            <Button size="sm" variant="ghost" className="px-2.5" onClick={() => setHolidayOpen(true)}>
              <CalendarOff size={15} aria-hidden="true" /> No class?
            </Button>
          </div>
          {students.length > 10 && (
            <div className="relative w-full">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input type="search" aria-label="Find a student" placeholder="Find a student" className="pl-9"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          )}
        </div>

        <Stagger as="ul" aria-label={`Students, week ${week} session ${session}`}>
          {shown.map(s => {
            const value = marks[s.id];
            const changed = s.id in marks && value !== saved[s.id];
            return (
              <StaggerItem as="li" key={s.id} className="flex min-h-[56px] items-center gap-2.5 border-t border-line py-1.5 pl-4 pr-2">
                <Avatar name={s.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium"><StudentLink id={s.id}>{s.name}</StudentLink></p>
                  {changed && <p className="text-caption font-medium text-warn-fg">Changed, not sent</p>}
                </div>
                <MarkToggle name={s.name} value={value} onChange={v => mark(s.id, v)} />
              </StaggerItem>
            );
          })}
          {shown.length === 0 && <li className="border-t border-line px-4 py-6 text-center text-small text-muted">No one matches “{search}”.</li>}
        </Stagger>
      </section>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+66px)] z-20 lg:bottom-5">
        <div className="flex items-center gap-2.5 rounded-card border border-line bg-white/95 py-2.5 pl-4 pr-2.5 shadow-lg">
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-h2 font-bold tabular-nums">{marked} / {students.length}</p>
            <p className="truncate text-caption text-muted">{sendNote ?? 'marked'}</p>
          </div>
          {unmarked > 0 && (
            <Button variant="outline" className="flex-none px-3.5" onClick={() => markRest(true)}>
              {/* Shorter on phones so the bar fits a 360px screen */}
              <span className="sm:hidden">{unmarked === students.length ? 'All present' : 'Rest present'}</span>
              <span className="hidden sm:inline">{unmarked === students.length ? 'Mark all present' : 'Mark rest present'}</span>
            </Button>
          )}
          <Button className="flex-none px-4" disabled={unmarked > 0 || (!unsent && (!!submittedAt || waiting))} loading={sending} onClick={submit}>
            {waiting && !unsent ? 'Waiting' : submittedAt && !unsent ? <><Check size={16} aria-hidden="true" /> Sent</> : <><Send size={15} aria-hidden="true" /> {submittedAt ? 'Send changes' : 'Send'}</>}
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

function Tally({ value, label, dot }: { value: number; label: string; dot: string }) {
  return (
    <div className="rounded-[9px] border border-line bg-white px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-caption text-muted">
        <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', dot)} />{label}
      </p>
      <p className="mt-0.5 font-heading text-[1.25rem] font-bold leading-tight tabular-nums text-ink">
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}

/** Present / Absent for one student: two square buttons with aria-pressed, tinted green or red when chosen */
function MarkToggle({ name, value, onChange }: { name: string; value: boolean | undefined; onChange: (v: boolean) => void }) {
  const options = [
    { v: true, label: 'Present', Icon: Check, on: 'border-[#A9D6BC] bg-ok-bg text-ok-fg' },
    { v: false, label: 'Absent', Icon: X, on: 'border-[#F1B5AE] bg-bad-bg text-bad-fg' },
  ] as const;
  return (
    <div role="group" aria-label={`${name}: attendance`} className="flex flex-none gap-1.5">
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
              'grid h-11 w-11 place-items-center rounded-[10px] border transition-colors duration-150 active:scale-95',
              'focus-visible:outline-none focus-visible:shadow-focus',
              pressed ? o.on : 'border-line-strong bg-white text-faint hover:text-ink',
            )}
          >
            <o.Icon size={18} strokeWidth={pressed ? 2.75 : 2.2} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
