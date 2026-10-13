// The class list with each student's attendance this semester, and a way to ask the
// admin to drop someone.
import { useEffect, useMemo, useState } from 'react';
import { Phone, UserMinus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, ClassChip, Dialog, EmptyState, ErrorState, Field, LoadingList, ProgressBar, StatusPill, Textarea } from '../ui';
import { getClassAttendance } from '../../firebase/attendance';
import { createDropRequest } from '../../firebase/dropRequests';
import { isHolidaySession } from '../../firebase/classConfig';
import { CLASS_LABELS } from '../../utils/constants';
import type { AttendanceRecord, ClassConfig, DropRequest, Student } from '../../types/firestore';

const LABELS = CLASS_LABELS as Record<string, string>;

interface RosterPanelProps {
  classId: string;
  uid: string;
  config: ClassConfig | null;
  students: Student[];
  drops: DropRequest[];
  /** Admins who also teach drop students directly from the admin Students page */
  canRequestDrop: boolean;
}

export function RosterPanel({ classId, uid, config, students, drops, canRequestDrop }: RosterPanelProps) {
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [dropping, setDropping] = useState<Student | null>(null);

  // Read once when the tab opens, rather than listening to every mark all semester
  useEffect(() => {
    setError(false);
    getClassAttendance(classId)
      .then(r => setRecords(r as AttendanceRecord[]))
      .catch(() => setError(true));
  }, [classId, attempt]);

  const rates = useMemo(() => {
    const out = new Map<string, { present: number; counted: number }>();
    for (const r of records ?? []) {
      if (r.isHoliday || r.present === null || isHolidaySession(config, r.semesterWeek, r.sessionNumber)) continue;
      const cur = out.get(r.studentId) ?? { present: 0, counted: 0 };
      cur.counted++;
      if (r.present) cur.present++;
      out.set(r.studentId, cur);
    }
    return out;
  }, [records, config]);

  const pendingFor = (id: string) => drops.find(d => d.studentId === id && d.status === 'pending');

  if (students.length === 0) {
    return <EmptyState title="No students yet" description="Students appear here once the admin accepts their sign-up." />;
  }
  if (error) return <ErrorState description="Check your connection and try again." onRetry={() => setAttempt(a => a + 1)} />;
  if (!records) return <LoadingList rows={4} label="Loading attendance" />;

  return (
    <>
      <p className="mb-3 text-small text-muted">{students.length} {students.length === 1 ? 'student' : 'students'}. Rates count sessions marked so far, not counting days with no class.</p>
      <ul className="grid gap-2">
        {students.map(s => {
          const rate = rates.get(s.id);
          const pct = rate && rate.counted ? Math.round((rate.present / rate.counted) * 100) : null;
          const other = (s.classes ?? []).filter(c => c !== classId);
          const pending = pendingFor(s.id);
          return (
            <li key={s.id} className="grid gap-3 rounded-md border-1.5 border-line bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_200px_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate font-semibold">{s.name}</p>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-muted">
                  {s.phone && (
                    <a href={`tel:${s.phoneKey ? `+${s.phoneKey}` : s.phone}`} className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
                      <Phone size={13} aria-hidden="true" /> {s.phone}
                    </a>
                  )}
                  {other.map(c => <ClassChip key={c} classId={c} label={`Also ${LABELS[c] ?? c}`} size="sm" />)}
                </p>
              </div>
              <div className="grid gap-1">
                <div className="flex justify-between text-small">
                  <span className="text-muted">Attendance</span>
                  <span className="font-semibold tabular-nums">{pct === null ? '—' : `${pct}%`}</span>
                </div>
                <ProgressBar value={pct ?? 0} label={`${s.name}'s attendance`}
                  valueText={pct === null ? 'No sessions marked yet' : `${pct}%, ${rate!.present} of ${rate!.counted} sessions`} />
              </div>
              <div className="sm:justify-self-end">
                {pending ? (
                  <StatusPill status="pending" size="sm">Drop requested</StatusPill>
                ) : !canRequestDrop ? null : (
                  <Button size="sm" variant="ghost" onClick={() => setDropping(s)}>
                    <UserMinus size={16} aria-hidden="true" /> Ask to drop
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <DropDialog student={dropping} classId={classId} uid={uid} onClose={() => setDropping(null)} />
    </>
  );
}

function DropDialog({ student, classId, uid, onClose }: { student: Student | null; classId: string; uid: string; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (student) setReason(''); }, [student]);

  async function send() {
    if (!student) return;
    setBusy(true);
    try {
      await createDropRequest({ studentId: student.id, studentName: student.name, className: classId, requestedBy: uid, reason: reason.trim() });
      toast.success('Request sent to the admin');
      onClose();
    } catch {
      toast.error('Couldn’t send. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={!!student}
      onOpenChange={o => { if (!o) onClose(); }}
      title={`Ask to drop ${student?.name ?? ''}?`}
      description="The admin decides. They stay on your register until then, and you can withdraw the request."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={send}>Send request</Button>
        </>
      }
    >
      <Field label="Reason" optional>
        <Textarea rows={3} maxLength={300} value={reason} onChange={e => setReason(e.target.value)}
          placeholder="For example, they’ve moved away or asked to leave" />
      </Field>
    </Dialog>
  );
}
