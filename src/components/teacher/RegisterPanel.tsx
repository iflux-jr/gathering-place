// Marking one session: a Present/Absent toggle per student, saved on the device as the
// teacher goes, and sent with one button at the end.
import { useEffect, useMemo, useState } from 'react';
import { CalendarOff, Check, CloudOff, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Dialog, EmptyState, Input } from '../ui';
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
      <div className="grid justify-items-center gap-3 rounded-card bg-accent-50 px-6 py-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-100 text-accent-700" aria-hidden="true">
          <CalendarOff size={22} />
        </span>
        <h3 className="font-heading text-h3">No class this session</h3>
        <p className="max-w-[44ch] text-small text-muted">It won’t count towards anyone’s attendance.</p>
        <Button variant="outline" size="sm" loading={holidayBusy} onClick={() => toggleHoliday(false)}>Undo, we had class</Button>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <EmptyState
        title="No students yet"
        description="Students appear here once the admin accepts their sign-up. Share your class link from Invite students."
      />
    );
  }

  const q = search.trim().toLowerCase();
  const shown = q ? students.filter(s => s.name.toLowerCase().includes(q) || s.phone?.includes(q)) : students;

  return (
    <div className="grid gap-4 pb-28 lg:pb-24">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small" aria-live="polite">
        <span><strong className="tabular-nums">{present}</strong> present</span>
        <span><strong className="tabular-nums">{absent}</strong> absent</span>
        <span className={cn(unmarked && 'font-semibold text-warn-fg')}><strong className="tabular-nums">{unmarked}</strong> not marked</span>
        <span className="basis-full text-muted sm:basis-auto sm:ml-auto">
          {unsent ? (
            <span className="inline-flex items-center gap-1 font-semibold text-warn-fg"><CloudOff size={14} aria-hidden="true" /> Not sent yet</span>
          ) : waiting ? (
            <span className="inline-flex items-center gap-1 font-semibold text-warn-fg"><CloudOff size={14} aria-hidden="true" /> Saved on this phone, waiting for signal to send</span>
          ) : submittedAt ? (
            `Sent ${formatDateShort(submittedAt)}, ${formatTime(submittedAt)}`
          ) : null}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {unmarked === students.length ? (
          <Button size="sm" variant="outline" onClick={() => markRest(true)}>Everyone present</Button>
        ) : unmarked > 0 ? (
          <>
            <Button size="sm" variant="outline" onClick={() => markRest(true)}>Mark the rest present</Button>
            <Button size="sm" variant="outline" onClick={() => markRest(false)}>Mark the rest absent</Button>
          </>
        ) : null}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setHolidayOpen(true)}>
          <CalendarOff size={16} aria-hidden="true" /> No class?
        </Button>
      </div>

      {students.length > 10 && (
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input type="search" aria-label="Find a student" placeholder="Find a student" className="pl-10"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      <ul className="grid gap-2" aria-label={`Students, week ${week} session ${session}`}>
        {shown.map(s => (
          <li key={s.id} className="flex items-center gap-3 rounded-md border border-line bg-surface py-2 pl-4 pr-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{s.name}</p>
              {s.id in marks && marks[s.id] !== saved[s.id] && <p className="text-caption text-warn-fg">Changed, not sent</p>}
            </div>
            <div role="group" aria-label={`${s.name}: attendance`} className="flex flex-none gap-1.5">
              <MarkButton kind="present" pressed={marks[s.id] === true} onClick={() => mark(s.id, true)} />
              <MarkButton kind="absent" pressed={marks[s.id] === false} onClick={() => mark(s.id, false)} />
            </div>
          </li>
        ))}
        {shown.length === 0 && <li className="py-6 text-center text-small text-muted">No one matches “{search}”.</li>}
      </ul>

      <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 px-4 lg:bottom-6 lg:left-64">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-full border border-line bg-surface py-2 pl-5 pr-2 shadow-lg">
          <p className="text-small font-semibold">
            {unmarked ? `${students.length - unmarked} of ${students.length} marked` : 'Everyone marked'}
          </p>
          <Button size="sm" disabled={unmarked > 0 || (!unsent && (!!submittedAt || waiting))} loading={sending} onClick={submit}>
            {waiting && !unsent ? 'Waiting' : submittedAt && !unsent ? 'Sent' : submittedAt ? 'Send changes' : 'Send'}
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

function MarkButton({ kind, pressed, onClick }: { kind: 'present' | 'absent'; pressed: boolean; onClick: () => void }) {
  const Icon = kind === 'present' ? Check : X;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-touch min-w-[88px] items-center justify-center gap-1.5 rounded-full border-1.5 px-3',
        'font-body text-small font-semibold transition-colors duration-100',
        'focus-visible:outline-none focus-visible:shadow-focus',
        pressed
          ? kind === 'present' ? 'border-ok-fg bg-ok-bg text-ok-fg' : 'border-bad-fg bg-bad-bg text-bad-fg'
          : 'border-line-strong bg-surface text-muted hover:border-ink hover:text-ink',
      )}
    >
      <Icon size={16} strokeWidth={pressed ? 3 : 2} aria-hidden="true" />
      {kind === 'present' ? 'Present' : 'Absent'}
    </button>
  );
}
