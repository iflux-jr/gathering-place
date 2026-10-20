// src/pages/ArchivePage.tsx — close a class's semester into the archive, and browse past ones
import { useCallback, useEffect, useState } from 'react';
import { Archive, ChevronDown, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, SectionHeader } from '../components/layout/PageHeader';
import { Button, Card, ClassChip, Dialog, EmptyState, ErrorState, Field, Input, ListGroup, LoadingList, StatTile } from '../components/ui';
import { archiveClassSemester, getArchiveIndex, getArchivedAttendance, getArchivedStudents } from '../firebase/archive';
import { subscribeToAllClassConfigs } from '../firebase/classConfig';
import { getActiveSemester, recordNewSemester } from '../firebase/systemSettings';
import { cn } from '../lib/cn';
import useAuthStore from '../store/authStore';
import { useActiveClasses, useClassLookup } from '../store/classStore';
import { formatDateShort, getSemesterStatus } from '../utils/dateUtils';
import type { AttendanceRecord, ClassConfig, Student } from '../types/firestore';

const CONFIRM_WORD = 'ARCHIVE';

interface ArchiveEntry {
  id: string; classId: string; semesterLabel: string; studentCount?: number; attendanceCount?: number;
  archivedAt?: string; status?: string;
}

export default function ArchivePage() {
  const classes = useActiveClasses();
  const [configs, setConfigs] = useState<Record<string, ClassConfig> | null>(null);
  const [archives, setArchives] = useState<ArchiveEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [closing, setClosing] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => subscribeToAllClassConfigs(setConfigs), []);
  const load = useCallback(() => {
    setError(false);
    getArchiveIndex().then(a => setArchives(a as ArchiveEntry[])).catch(() => setError(true));
  }, []);
  useEffect(load, [load]);

  const ready = classes.filter(c => configs?.[c.id]?.semester?.startDate);

  return (
    <>
      <PageHeader title="Archive" description="At the end of a semester, archive each class to clear its register for the next one. Archived students and attendance stay readable here." />

      <section aria-labelledby="close-heading" className="mb-10">
        <SectionHeader id="close-heading" title="End a semester" className="mb-4" />
        {!configs ? <LoadingList rows={3} label="Loading classes" /> : ready.length === 0 ? (
          <EmptyState title="No class has a semester yet" description="Set semester dates on the Classes page first." />
        ) : (
          <ListGroup>
            {ready.map(c => {
              const sem = configs[c.id].semester!;
              const ended = getSemesterStatus(sem) === 'ended';
              return (
                <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:px-5">
                  <ClassChip classId={c.id} size="sm" className="justify-self-start" />
                  <div className="col-start-1 row-start-2 min-w-0 sm:col-start-auto sm:row-start-auto">
                    <p className="text-small text-muted">{sem.label ? `${sem.label}, ` : ''}{ended ? 'ended' : 'ends'} {formatDateShort(sem.endDate)}</p>
                  </div>
                  <Button size="sm" variant={ended ? 'dark' : 'outline'} className="col-start-2 row-span-2 row-start-1 sm:col-start-auto sm:row-span-1 sm:row-start-auto" onClick={() => setClosing(c.id)}>
                    <Archive size={14} aria-hidden="true" /> Archive
                  </Button>
                </li>
              );
            })}
          </ListGroup>
        )}
      </section>

      <section aria-labelledby="past-heading">
        <SectionHeader id="past-heading" title="Past semesters" className="mb-4" />
        {error ? <ErrorState description="Check your connection and try again." onRetry={load} />
          : !archives ? <LoadingList rows={3} label="Loading archives" />
          : archives.length === 0 ? <EmptyState title="Nothing archived yet" description="Archived semesters appear here." />
          : (
            <ListGroup>
              {archives.map(a => <ArchiveRow key={a.id} entry={a} open={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} />)}
            </ListGroup>
          )}
      </section>

      <CloseDialog classId={closing} config={closing ? configs?.[closing] : undefined}
        onClose={() => setClosing(null)} onDone={() => { setClosing(null); load(); }} />
    </>
  );
}

function ArchiveRow({ entry, open, onToggle }: { entry: ArchiveEntry; open: boolean; onToggle: () => void }) {
  const lookup = useClassLookup();
  const [data, setData] = useState<{ students: Student[]; records: AttendanceRecord[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || data) return;
    Promise.all([getArchivedStudents(entry.id), getArchivedAttendance(entry.id)])
      .then(([students, records]) => setData({ students: students as Student[], records: records as AttendanceRecord[] }))
      .catch(() => setError(true));
  }, [open, data, entry.id]);

  async function exportIt() {
    if (!data) return;
    const { exportToCSV, formatAttendanceForExport, formatStudentsForExport } = await import('../utils/exportUtils');
    exportToCSV(formatStudentsForExport(data.students), `archive-${entry.id}-students.csv`);
    exportToCSV(formatAttendanceForExport(data.records), `archive-${entry.id}-attendance.csv`);
  }

  const counted = data?.records.filter(r => !r.isHoliday && r.present !== null) ?? [];
  const present = counted.filter(r => r.present).length;

  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-canvas focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_#A35300] sm:px-5">
        <ClassChip classId={entry.classId} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{entry.semesterLabel}</span>
          <span className="block text-small text-muted">
            {entry.studentCount ?? 0} students · archived {formatDateShort(entry.archivedAt)}
            {entry.status === 'in_progress' && <span className="font-semibold text-warn-fg"> · didn’t finish, archive again to complete</span>}
          </span>
        </span>
        <ChevronDown size={18} aria-hidden="true" className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="grid gap-4 border-t border-line bg-canvas/50 px-4 py-4 sm:px-5">
          {error ? <p className="text-small text-bad-fg">Couldn’t load this archive.</p> : !data ? <LoadingList rows={2} label="Loading archive" /> : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile label="Students" value={data.students.length} />
                <StatTile label="Sessions marked" value={counted.length} />
                <StatTile label="Present" value={present} />
                <StatTile label="Attendance" value={counted.length ? `${Math.round((present / counted.length) * 100)}%` : '—'} />
              </div>
              <ul className="scrollbar-quiet grid max-h-64 gap-1 overflow-y-auto pr-1 text-small">
                {data.students.map(s => (
                  <li key={s.id} className="flex justify-between gap-2 border-b border-line py-1.5 last:border-0">
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-muted">{s.phone}</span>
                  </li>
                ))}
              </ul>
              <Button size="sm" variant="outline" className="justify-self-start" onClick={exportIt}>
                <Download size={14} aria-hidden="true" /> Export {lookup.label(entry.classId)} archive
              </Button>
            </>
          )}
        </div>
      )}
    </li>
  );
}

function CloseDialog({ classId, config, onClose, onDone }: { classId: string | null; config?: ClassConfig; onClose: () => void; onDone: () => void }) {
  const uid = useAuthStore(s => s.user?.uid) as string;
  const lookup = useClassLookup();
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  useEffect(() => { if (classId) { setWord(''); setProgress(''); } }, [classId]);

  const label = classId ? lookup.label(classId) : '';
  const sem = config?.semester;

  async function run() {
    if (!classId || !sem) return;
    setBusy(true);
    try {
      const active = await getActiveSemester() as { semesterNumber?: number } | null;
      const n = (active?.semesterNumber ?? 0) + 1;
      const semLabel = sem.label || `Semester ${sem.startDate.slice(0, 4)}`;
      const result = await archiveClassSemester(classId, semLabel, n, uid, setProgress);
      await recordNewSemester(n, semLabel, uid);
      toast.success(`Archived ${result.studentCount} students from ${label}`);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error && err.message.includes('already') ? err.message : 'Archiving stopped. Check your connection and archive again; it picks up safely.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!classId} onOpenChange={o => { if (!o && !busy) onClose(); }} title={`Archive ${label}?`}
      description={sem ? `${sem.label ? `${sem.label}, ` : ''}${formatDateShort(sem.startDate)} to ${formatDateShort(sem.endDate)}` : undefined}
      footer={<>
        <Button variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button variant="dark" loading={busy} disabled={word !== CONFIRM_WORD} onClick={run}>Archive {label}</Button>
      </>}
    >
      <div className="grid gap-4">
        <Card quiet className="bg-warn-bg">
          <ul className="grid list-disc gap-1.5 pl-5 text-small">
            <li>Copies this class’s students and attendance into the archive.</li>
            <li>Takes everyone off the {label} register. Students in no other class leave the student list and can sign up again.</li>
            <li>Clears this semester’s attendance and totals for {label}, and cancels its waiting drop requests.</li>
          </ul>
          <p className="mt-2 text-small font-semibold">This can’t be undone, but the archive keeps a full copy.</p>
        </Card>
        {busy ? (
          <p className="text-small" role="status">{progress || 'Starting…'}</p>
        ) : (
          <Field label={`Type ${CONFIRM_WORD} to confirm`}>
            <Input value={word} autoComplete="off" onChange={e => setWord(e.target.value.toUpperCase())} className="font-mono tracking-widest" />
          </Field>
        )}
      </div>
    </Dialog>
  );
}
