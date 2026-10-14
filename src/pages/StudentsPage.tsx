// src/pages/StudentsPage.tsx — every active student, with search, class filter, export and
// a detail view that loads one student's attendance on demand.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Phone, Search, UserMinus, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Avatar, Button, ClassChip, Dialog, EmptyState, ErrorState, FilterChip, Input, ListGroup, LoadingList, ProgressBar, StatusPill, buttonVariants,
} from '../components/ui';
import { getStudentAttendance } from '../firebase/attendance';
import { adminDirectDrop } from '../firebase/dropRequests';
import { subscribeToAllStudents } from '../firebase/students';
import { subscribeToAllClassConfigs, isHolidaySession } from '../firebase/classConfig';
import useAuthStore from '../store/authStore';
import { useActiveClasses, useClassLookup } from '../store/classStore';
import { formatDateShort } from '../utils/dateUtils';
import type { AttendanceRecord, ClassConfig, Student } from '../types/firestore';

export default function StudentsPage() {
  const classes = useActiveClasses();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [open, setOpen] = useState<Student | null>(null);

  useEffect(() => subscribeToAllStudents(null, (s: Student[]) => setStudents(s), () => setError(true)), []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return (students ?? []).filter(s =>
      (!classFilter || s.classes?.includes(classFilter))
      && (!q || s.name.toLowerCase().includes(q) || (digits.length >= 3 && (s.phone ?? '').replace(/\D/g, '').includes(digits))));
  }, [students, search, classFilter]);

  // Keep the open detail in step with live changes (a class removed, say)
  const current = open ? students?.find(s => s.id === open.id) ?? null : null;

  async function exportShown() {
    const { exportToCSV, formatStudentsForExport } = await import('../utils/exportUtils');
    exportToCSV(formatStudentsForExport(shown), `students-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported ${shown.length} ${shown.length === 1 ? 'student' : 'students'}`);
  }

  return (
    <>
      <PageHeader
        title="Students"
        description={students ? `${students.length} active ${students.length === 1 ? 'student' : 'students'}` : undefined}
        actions={<>
          <Button variant="outline" onClick={exportShown} disabled={!shown.length}><Download size={16} aria-hidden="true" /> Export CSV</Button>
          <Link to="/register" className={buttonVariants()}><UserPlus size={16} aria-hidden="true" /> Add student</Link>
        </>}
      />

      <div className="mb-5 grid gap-3">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input type="search" aria-label="Search by name or phone" placeholder="Search by name or phone" className="pl-10"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by class">
          <FilterChip selected={!classFilter} onClick={() => setClassFilter('')}>All classes</FilterChip>
          {classes.map(c => (
            <FilterChip key={c.id} selected={classFilter === c.id} onClick={() => setClassFilter(classFilter === c.id ? '' : c.id)}>{c.label}</FilterChip>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorState description="Check your connection and try again." onRetry={() => window.location.reload()} />
      ) : !students ? (
        <LoadingList rows={6} label="Loading students" />
      ) : shown.length === 0 ? (
        <EmptyState title={students.length ? 'No one matches' : 'No students yet'}
          description={students.length ? 'Try another name, number or class.' : 'Accepted sign-ups and students you add appear here.'} />
      ) : (
        <>
          <p className="sr-only" aria-live="polite">{shown.length} shown</p>
          {shown.length !== students.length && (
            <p className="mb-3 text-small text-muted" aria-hidden="true">Showing {shown.length} of {students.length}</p>
          )}
          <ListGroup>
            {shown.map(s => (
              <li key={s.id}>
                <button type="button" onClick={() => setOpen(s)}
                  className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3 text-left sm:px-5 transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_#1F64B0] sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                  <Avatar name={s.name} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{s.name}</span>
                    <span className="block text-small text-muted">{s.phone}</span>
                  </span>
                  <span className="col-start-2 flex flex-wrap gap-1.5 sm:col-start-auto sm:justify-end">
                    {(s.classes ?? []).length
                      ? s.classes.map(c => <ClassChip key={c} classId={c} size="sm" />)
                      : <StatusPill status="unmarked" size="sm">No class</StatusPill>}
                  </span>
                </button>
              </li>
            ))}
          </ListGroup>
        </>
      )}

      <StudentDialog student={current} onClose={() => setOpen(null)} />
    </>
  );
}

function StudentDialog({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const uid = useAuthStore(s => s.user?.uid) as string;
  const lookup = useClassLookup();
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null);
  const [configs, setConfigs] = useState<Record<string, ClassConfig>>({});
  const [error, setError] = useState(false);
  const [dropping, setDropping] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = student?.id;

  useEffect(() => {
    if (!id) return;
    setRecords(null);
    setError(false);
    getStudentAttendance(id).then(r => setRecords(r as AttendanceRecord[])).catch(() => setError(true));
  }, [id]);
  useEffect(() => (id ? subscribeToAllClassConfigs(setConfigs) : undefined), [id]);

  const counted = (records ?? []).filter(r => !r.isHoliday && r.present !== null && !isHolidaySession(configs[r.className], r.semesterWeek, r.sessionNumber));
  const rateFor = (cls: string) => {
    const rs = counted.filter(r => r.className === cls);
    return { present: rs.filter(r => r.present).length, total: rs.length };
  };

  async function drop() {
    if (!student || !dropping) return;
    setBusy(true);
    try {
      await adminDirectDrop(student.id, dropping, uid, student.classes);
      toast.success(`${student.name} removed from ${lookup.label(dropping)}`);
      setDropping(null);
    } catch {
      toast.error('Couldn’t remove. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog open={!!student && !dropping} onOpenChange={o => { if (!o) onClose(); }} size="lg" title={student?.name ?? ''}
        description={student && (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a href={`tel:${student.phoneKey ? `+${student.phoneKey}` : student.phone}`} className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
              <Phone size={14} aria-hidden="true" /> {student.phone}
            </a>
            {student.gender && <span>{student.gender}</span>}
            {student.ward && <span>{student.ward}</span>}
            {student.createdAt && <span>Joined {formatDateShort(student.createdAt)}</span>}
          </span>
        )}
      >
        {student && (
          <div className="grid gap-5">
            <section className="grid gap-2" aria-label="Classes">
              {(student.classes ?? []).length === 0 && <p className="text-small text-muted">Not in any class right now.</p>}
              {(student.classes ?? []).map(c => {
                const r = rateFor(c);
                const pct = r.total ? Math.round((r.present / r.total) * 100) : null;
                return (
                  <div key={c} className="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                    <ClassChip classId={c} />
                    <div className="grid gap-1">
                      <div className="flex justify-between text-small">
                        <span className="text-muted">{records ? `${r.present} of ${r.total} sessions` : 'Loading…'}</span>
                        <span className="font-semibold tabular-nums">{pct === null ? '—' : `${pct}%`}</span>
                      </div>
                      <ProgressBar value={pct ?? 0} label={`Attendance in ${lookup.label(c)}`} valueText={pct === null ? 'No sessions yet' : `${pct}%`} />
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setDropping(c)}>
                      <UserMinus size={14} aria-hidden="true" /> Remove
                    </Button>
                  </div>
                );
              })}
            </section>

            <section aria-labelledby="history-heading">
              <h3 id="history-heading" className="mb-2 font-heading text-h3">This semester</h3>
              {error ? (
                <p className="text-small text-bad-fg">Couldn’t load attendance. Check your connection and try again.</p>
              ) : !records ? (
                <LoadingList rows={3} label="Loading attendance" />
              ) : records.length === 0 ? (
                <p className="text-small text-muted">No attendance marked yet.</p>
              ) : (
                <ul className="grid max-h-72 gap-1 overflow-y-auto pr-1">
                  {records.map(r => {
                    const off = r.isHoliday || isHolidaySession(configs[r.className], r.semesterWeek, r.sessionNumber);
                    return (
                      <li key={r.id} className="flex items-center justify-between gap-2 border-b border-line py-1.5 text-small last:border-0">
                        <span>{lookup.label(r.className)} · Week {r.semesterWeek}{r.sessionNumber > 1 || (configs[r.className]?.sessionsPerWeek ?? 1) > 1 ? `, session ${r.sessionNumber}` : ''}</span>
                        <StatusPill size="sm" status={off ? 'holiday' : r.present === true ? 'present' : r.present === false ? 'absent' : 'unmarked'}>
                          {off ? 'No class' : undefined}
                        </StatusPill>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </Dialog>

      <Dialog open={!!dropping} onOpenChange={o => { if (!o) setDropping(null); }}
        title={`Remove ${student?.name ?? ''} from ${dropping ? lookup.label(dropping) : ''}?`}
        description="They leave the register straight away. Their past attendance is kept."
        footer={<>
          <Button variant="ghost" onClick={() => setDropping(null)}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={drop}>Remove</Button>
        </>}
      />
    </>
  );
}
