// Drop requests for this class, with a way to withdraw one that's still waiting.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button, EmptyState, ListGroup, StatusPill, listRow, type Status } from '../ui';
import { cn } from '../../lib/cn';
import { cancelDropRequest } from '../../firebase/dropRequests';
import { formatDateShort } from '../../utils/dateUtils';
import type { DropRequest } from '../../types/firestore';
import { StudentLink } from '../shared/StudentLink';

export function RequestsPanel({ drops, uid }: { drops: DropRequest[]; uid: string }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function withdraw(r: DropRequest) {
    setBusy(r.id);
    try {
      await cancelDropRequest(r.id, uid);
      toast.success('Request withdrawn');
    } catch {
      toast.error('Couldn’t withdraw. The admin may have just decided it.');
    } finally {
      setBusy(null);
    }
  }

  if (drops.length === 0) {
    return <EmptyState title="No drop requests" description="Ask to drop a student from the Students tab." />;
  }

  return (
    <ListGroup>
      {drops.map(r => (
        <li key={r.id} className={cn('grid gap-2', listRow)}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold"><StudentLink id={r.studentId}>{r.studentName}</StudentLink></p>
            <StatusPill status={r.status as Status} size="sm" />
          </div>
          {r.reason && <p className="text-small">“{r.reason}”</p>}
          {r.status === 'rejected' && r.rejectionReason && (
            <p className="text-small"><span className="font-semibold">Admin’s note: </span>{r.rejectionReason}</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-caption text-muted">Asked {formatDateShort(r.requestedAt)}</p>
            {r.status === 'pending' && r.requestedBy === uid && (
              <Button size="sm" variant="ghost" loading={busy === r.id} onClick={() => withdraw(r)}>Withdraw</Button>
            )}
          </div>
        </li>
      ))}
    </ListGroup>
  );
}
