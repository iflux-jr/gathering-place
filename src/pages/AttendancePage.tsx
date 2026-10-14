// src/pages/AttendancePage.tsx — one class's register for one week, loaded on demand, with
// CSV exports. Nothing here listens to the whole attendance collection.
import { useEffect, useMemo, useState } from 'react';
import { Check, Download, Minus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/layout/PageHeader';
import { WeekPicker } from '../components/teacher/WeekPicker';
import { Button, Card, EmptyState, ErrorState, FilterChip, LoadingList } from '../components/ui';
import { getClassAttendance, semesterLength, subscribeToWeekAttendance } from '../firebase/attendance';
import { isHolidaySession, subscribeToClassConfig } from '../firebase/classConfig';
import { subscribeToStudentsByClass } from '../firebase/students';
import { subscribeToUsers } from '../firebase/users';
import { cn } from '../lib/cn';
import useAuthStore from '../store/authStore';
import { useActiveClasses, useClassLookup } from '../store/classStore';
import { currentSemesterWeek, getSemesterStatus } from '../utils/dateUtils';
import type { AttendanceRecord, ClassConfig, Student, UserProfile } from '../types/firestore';

export default function AttendancePage() {
  const classes = useActiveClasses();
  const lookup = useClassLookup();
  const assigned = useAuthStore(s => s.profile?.assignedClass) as string | null | undefined;
  const [classId, setClassId] = useState('');
  useEffect(() => {
    if (!classId && classes.length) setClassId(classes.find(c => c.id === assigned)?.id ?? classes[0].id);
  }, [classes, classId, assigned]);

  const [config, setConfig] = useState<ClassConfig | null | undefined>(undefined);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null);
  const [error, setError] = useState(false);
  const [week, setWeek] = useState(0);

  useEffect(() => {
    if (!classId) return;
    setConfig(undefined); setStudents(null); setWeek(0);
    const a = subscribeToClassConfig(classId, setConfig, () => setError(true));
    const b = subscribeToStudentsByClass(classId, (s: Student[]) => setStudents(s), () => setError(true));
    return () => { a(); b(); };
  }, [classId]);

  const semester = config?.semester;
  const status = getSemesterStatus(semester);
  const total = semesterLength(semester);
  const current = currentSemesterWeek(semester);
  const lastWeek = status === 'ended' ? total : current ?? 0;
  const sessions = config?.sessionsPerWeek ?? 1;
  useEffect(() => { if (lastWeek && (!week || week > lastWeek)) setWeek(lastWeek); }, [lastWeek, week]);

  useEffect(() => {
    if (!classId || !week) return;
    setRecords(null);
    return subscribeToWeekAttendance(classId, week, (r: AttendanceRecord[]) => setRecords(r), () => setError(true));
  }, [classId, week]);

  // Everyone on the register now, plus anyone marked that week who has since left
  const rows = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students ?? []) map.set(s.id, s.name);
    for (const r of records ?? []) if (!map.has(r.studentId)) map.set(r.studentId, r.studentName);
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, records]);
  const mark = (studentId: string, n: number) => records?.find(r => r.studentId === studentId && r.sessionNumber === n);
  const sessionNums = Array.from({ length: sessions }, (_, i) => i + 1);

  return (
    <>
      <PageHeader title="Attendance" description="One class and week at a time. Exports cover the whole semester." actions={<ExportButtons classId={classId} />} />

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Class">
        {classes.map(c => <FilterChip key={c.id} selected={classId === c.id} onClick={() => setClassId(c.id)}>{c.label}</FilterChip>)}
      </div>

      {error ? (
        <ErrorState description="Check your connection and try again." onRetry={() => window.location.reload()} />
      ) : config === undefined || !students ? (
        <LoadingList rows={5} label="Loading the register" />
      ) : status === 'not_configured' || status === 'not_started' ? (
        <EmptyState title={status === 'not_started' ? 'This semester hasn’t started' : 'This class isn’t set up yet'}
          description="Set its semester dates on the Classes page." />
      ) : (
        <Card className="grid gap-5">
          <WeekPicker week={week || lastWeek} lastWeek={lastWeek} totalWeeks={total} currentWeek={current} semester={semester!} onChange={setWeek} />
          {!records ? (
            <LoadingList rows={5} label="Loading the register" />
          ) : rows.length === 0 ? (
            <EmptyState title="No students in this class" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] border-collapse text-small">
                <caption className="sr-only">{lookup.label(classId)}, week {week}</caption>
                <thead>
                  <tr className="border-b border-line text-left text-caption text-muted">
                    <th scope="col" className="py-2.5 pr-3 font-medium">Student</th>
                    {sessionNums.map(n => (
                      <th key={n} scope="col" className="w-24 px-2 py-2.5 text-center font-medium sm:w-28">
                        {sessions > 1 ? `Session ${n}` : 'Marked'}
                        {isHolidaySession(config, week, n) && <span className="block text-caption font-normal text-info-fg">No class</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="border-b border-line last:border-0">
                      <th scope="row" className="py-2.5 pr-3 text-left font-medium">{row.name}</th>
                      {sessionNums.map(n => <td key={n} className="px-2 py-2.5 text-center"><Mark record={mark(row.id, n)} off={isHolidaySession(config, week, n)} /></td>)}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line-strong">
                    <th scope="row" className="pb-0 pt-3 pr-3 text-left font-semibold">Present</th>
                    {sessionNums.map(n => {
                      const rs = (records ?? []).filter(r => r.sessionNumber === n && r.present !== null);
                      return <td key={n} className="px-2 pb-0 pt-3 text-center font-semibold tabular-nums">{rs.length ? `${rs.filter(r => r.present).length} of ${rs.length}` : '—'}</td>;
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      )}
    </>
  );
}

function Mark({ record, off }: { record?: AttendanceRecord; off: boolean }) {
  if (off) return <span className="text-muted">–</span>;
  const p = record?.present;
  const label = p === true ? 'Present' : p === false ? 'Absent' : 'Not marked';
  const Icon = p === true ? Check : p === false ? X : Minus;
  return (
    <span className={cn('inline-grid h-7 w-7 place-items-center rounded-full',
      p === true ? 'bg-ok-bg text-ok-fg' : p === false ? 'bg-bad-bg text-bad-fg' : 'bg-neutral-bg text-neutral-fg')}
      title={label}>
      <Icon size={14} strokeWidth={2.5} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function ExportButtons({ classId }: { classId: string }) {
  const lookup = useClassLookup();
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  useEffect(() => subscribeToUsers(setUsers), []);

  async function run() {
    setBusy(true);
    try {
      const [{ exportToCSV, formatAttendanceForExport }, records] = await Promise.all([
        import('../utils/exportUtils'),
        getClassAttendance(classId) as Promise<AttendanceRecord[]>,
      ]);
      if (!records.length) { toast('Nothing marked yet for this class'); return; }
      records.sort((a, b) => a.semesterWeek - b.semesterWeek || a.sessionNumber - b.sessionNumber || a.studentName.localeCompare(b.studentName));
      const names = Object.fromEntries(users.map(u => [u.id, u.name]));
      exportToCSV(formatAttendanceForExport(records, names), `attendance-${classId}-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`Exported ${lookup.label(classId)}`);
    } catch {
      toast.error('Couldn’t export. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="outline" loading={busy} disabled={!classId} onClick={run}>
      <Download size={16} aria-hidden="true" /> Export {classId ? lookup.label(classId) : 'class'}
    </Button>
  );
}
