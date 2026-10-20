// src/pages/DropRequestsPage.tsx — teachers' requests to take a student off their register
import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Button, ClassChip, Dialog, EmptyState, ErrorState, Field, ListGroup, LoadingList, StatusPill, listRow, TabPanel, Tabs, Textarea, type Status,
} from '../components/ui';
import { approveDropRequestWithClass, rejectDropRequest, subscribeToAllDropRequests } from '../firebase/dropRequests';
import { getStudentById } from '../firebase/students';
import { subscribeToUsers } from '../firebase/users';
import { cn } from '../lib/cn';
import useAuthStore from '../store/authStore';
import { useClassLookup } from '../store/classStore';
import { formatDateShort } from '../utils/dateUtils';
import type { DropRequest, Student, UserProfile } from '../types/firestore';
import { StudentLink } from '../components/shared/StudentLink';

export default function DropRequestsPage() {
  const uid = useAuthStore(s => s.user?.uid) as string;
  const lookup = useClassLookup();
  const [requests, setRequests] = useState<DropRequest[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('pending');
  const [busy, setBusy] = useState<string | null>(null);
  const [declining, setDeclining] = useState<DropRequest | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => subscribeToAllDropRequests((r: DropRequest[]) => setRequests(r), () => setError(true)), []);
  useEffect(() => subscribeToUsers((u: UserProfile[]) => setNames(Object.fromEntries(u.map(x => [x.id, x.name || x.email])))), []);

  const pending = (requests ?? []).filter(r => r.status === 'pending');
  const decided = (requests ?? []).filter(r => r.status !== 'pending');

  async function approve(r: DropRequest) {
    setBusy(r.id);
    try {
      const student = await getStudentById(r.studentId) as Student | null;
      if (!student) throw new Error('gone');
      await approveDropRequestWithClass(r.id, uid, r.studentId, r.className, student.classes);
      toast.success(`${r.studentName} removed from ${lookup.label(r.className)}`);
    } catch (err) {
      toast.error(err instanceof Error && err.message === 'gone'
        ? 'This student is no longer on the list. Decline the request instead.'
        : 'Couldn’t approve. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  async function decline() {
    if (!declining) return;
    setBusy(declining.id);
    try {
      await rejectDropRequest(declining.id, uid, note.trim());
      toast.success('Request declined');
      setDeclining(null);
    } catch {
      toast.error('Couldn’t decline. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  const list = (rows: DropRequest[], actions: boolean) => rows.length === 0 ? (
    <EmptyState title={actions ? 'Nothing waiting' : 'No decisions yet'}
      description={actions ? 'Teachers ask to drop a student from their class roster.' : undefined} />
  ) : (
    <ListGroup>
      {rows.map(r => (
        <li key={r.id} className={cn('grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center', listRow)}>
          <div className="grid gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold"><StudentLink id={r.studentId}>{r.studentName}</StudentLink></p>
              <ClassChip classId={r.className} size="sm" />
              {!actions && <StatusPill status={r.status as Status} size="sm" />}
            </div>
            {r.reason && <p className="text-small">“{r.reason}”</p>}
            {r.status === 'rejected' && r.rejectionReason && <p className="text-small"><span className="font-semibold">Your note: </span>{r.rejectionReason}</p>}
            <p className="text-caption text-muted">
              Asked by {names[r.requestedBy] ?? 'a teacher'} · {formatDateShort(r.requestedAt)}
              {r.resolvedAt ? ` · decided ${formatDateShort(r.resolvedAt)}` : ''}
            </p>
          </div>
          {actions && (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <Button variant="outline" disabled={busy === r.id} onClick={() => { setNote(''); setDeclining(r); }}>
                <X size={16} aria-hidden="true" /> Decline
              </Button>
              <Button variant="dark" loading={busy === r.id} onClick={() => approve(r)}>
                <Check size={16} aria-hidden="true" /> Approve
              </Button>
            </div>
          )}
        </li>
      ))}
    </ListGroup>
  );

  return (
    <>
      <PageHeader title="Drop requests" description="Approving takes the student off that class’s register. Their past attendance is kept." />
      {error ? (
        <ErrorState description="Check your connection and try again." onRetry={() => window.location.reload()} />
      ) : !requests ? (
        <LoadingList rows={3} label="Loading requests" />
      ) : (
        <Tabs label="Drop requests" value={tab} onValueChange={setTab}
          items={[{ value: 'pending', label: 'Waiting', count: pending.length }, { value: 'decided', label: 'Decided' }]}>
          <TabPanel value="pending">{list(pending, true)}</TabPanel>
          <TabPanel value="decided">{list(decided, false)}</TabPanel>
        </Tabs>
      )}

      <Dialog open={!!declining} onOpenChange={o => { if (!o) setDeclining(null); }}
        title={`Keep ${declining?.studentName ?? ''} in ${declining ? lookup.label(declining.className) : ''}?`}
        description="The teacher sees that you declined, with your note if you add one."
        footer={<>
          <Button variant="ghost" onClick={() => setDeclining(null)}>Cancel</Button>
          <Button variant="dark" loading={busy === declining?.id} onClick={decline}>Decline request</Button>
        </>}
      >
        <Field label="Note to the teacher" optional>
          <Textarea rows={3} maxLength={300} value={note} onChange={e => setNote(e.target.value)} />
        </Field>
      </Dialog>
    </>
  );
}
