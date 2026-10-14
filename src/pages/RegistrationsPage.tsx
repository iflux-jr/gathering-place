// src/pages/RegistrationsPage.tsx — admin review queue for public sign-ups
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Button, Card, Checkbox, ClassChip, Dialog, EmptyState, ErrorState, Field, LoadingList, StatusPill,
  Tabs, TabPanel, Textarea, buttonVariants,
} from '../components/ui';
import {
  RegistrationError, acceptRegistration, declineRegistration, getJoinableClasses, loadArchiveLookup,
  subscribeToRegistrations, type AcceptContext,
} from '../firebase/registrations';
import { subscribeToRegistrationStatus } from '../firebase/systemSettings';
import useAuthStore from '../store/authStore';
import { formatPhone } from '../lib/phone';
import { formatRefCode } from '../lib/refCode';
import { formatDateShort } from '../utils/dateUtils';
import type { Registration, RegistrationState } from '../types/firestore';


function useRegistrations(status: RegistrationState) {
  const [rows, setRows] = useState<Registration[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setRows(null);
    setError(false);
    return subscribeToRegistrations(status, setRows, () => setError(true));
  }, [status, attempt]);
  return { rows, error, retry: () => setAttempt(a => a + 1) };
}

export default function RegistrationsPage() {
  const [tab, setTab] = useState<RegistrationState>('pending');
  const [regOpen, setRegOpen] = useState<boolean | null>(null);
  const pending = useRegistrations('pending');

  useEffect(() => subscribeToRegistrationStatus((s: { isOpen: boolean }) => setRegOpen(s.isOpen)), []);

  return (
    <>
      <PageHeader
        eyebrow="Students"
        title="Sign-ups"
        description="People who signed up with the public link. Accepting one adds them to their classes."
        actions={
          <>
            {regOpen !== null && (
              <Link to="/admin/settings" className="self-center" aria-label={`Sign-ups are ${regOpen ? 'open' : 'paused'}. Change in settings.`}>
                <StatusPill status={regOpen ? 'open' : 'paused'}>{regOpen ? 'Sign-ups open' : 'Sign-ups paused'}</StatusPill>
              </Link>
            )}
            <Link to="/invite" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <QrCode size={16} aria-hidden="true" /> Share sign-up link
            </Link>
          </>
        }
      />
      <Tabs
        label="Sign-ups by status"
        value={tab}
        onValueChange={v => setTab(v as RegistrationState)}
        items={[
          { value: 'pending', label: 'Waiting', count: pending.rows?.length },
          { value: 'accepted', label: 'Accepted' },
          { value: 'declined', label: 'Declined' },
        ]}
      >
        <TabPanel value="pending"><PendingQueue {...pending} /></TabPanel>
        <TabPanel value="accepted"><ReviewedList status="accepted" /></TabPanel>
        <TabPanel value="declined"><ReviewedList status="declined" /></TabPanel>
      </Tabs>
    </>
  );
}

// ── Waiting ──────────────────────────────────────────────────────────────

function PendingQueue({ rows, error, retry }: ReturnType<typeof useRegistrations>) {
  const uid = useAuthStore(s => s.user?.uid) as string;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null); // progress label while working
  const [declining, setDeclining] = useState<Registration[] | null>(null);
  const ctxRef = useRef<Promise<AcceptContext> | null>(null);

  // Drop selections for rows that left the queue (reviewed here or elsewhere)
  const ids = useMemo(() => new Set(rows?.map(r => r.id)), [rows]);
  useEffect(() => {
    setSelected(s => (Array.from(s).every(id => ids.has(id)) ? s : new Set(Array.from(s).filter(id => ids.has(id)))));
  }, [ids]);

  /** Classes and the archive lookup are loaded on the first accept and reused */
  function acceptContext() {
    ctxRef.current ??= Promise.all([getJoinableClasses(), loadArchiveLookup()])
      .then(([activeClasses, archiveLookup]) => ({ adminUid: uid, activeClasses, archiveLookup }))
      .catch(err => { ctxRef.current = null; throw err; });
    return ctxRef.current;
  }

  async function run(list: Registration[], verb: 'Accepting' | 'Declining', act: (r: Registration) => Promise<unknown>) {
    let done = 0;
    const failed: Record<string, string> = {};
    for (const [i, r] of list.entries()) {
      setBusy(list.length > 1 ? `${verb} ${i + 1} of ${list.length}…` : `${verb}…`);
      try {
        await act(r);
        done++;
      } catch (err) {
        failed[r.id] = err instanceof RegistrationError ? err.message : 'Couldn’t save. Check your connection and try again.';
      }
    }
    setBusy(null);
    setRowErrors(e => {
      const next = { ...e };
      list.forEach(r => delete next[r.id]);
      return { ...next, ...failed };
    });
    setSelected(new Set());
    const past = verb === 'Accepting' ? 'Accepted' : 'Declined';
    const nFailed = Object.keys(failed).length;
    if (done) toast.success(`${past} ${done} ${done === 1 ? 'sign-up' : 'sign-ups'}`);
    if (nFailed) toast.error(`${nFailed} couldn’t be ${past.toLowerCase()}. See the notes on ${nFailed === 1 ? 'it' : 'them'}.`);
  }

  async function accept(list: Registration[]) {
    let ctx: AcceptContext;
    try {
      setBusy('Getting ready…');
      ctx = await acceptContext();
    } catch {
      setBusy(null);
      toast.error('Couldn’t load the class list. Check your connection and try again.');
      return;
    }
    await run(list, 'Accepting', r => acceptRegistration(r, ctx));
  }

  async function decline(list: Registration[], reason: string, share: boolean) {
    setDeclining(null);
    await run(list, 'Declining', r => declineRegistration(r, uid, reason, share));
  }

  if (error) return <ErrorState description="Check your connection and try again." onRetry={retry} />;
  if (!rows) return <LoadingList rows={3} label="Loading sign-ups" />;
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Inbox size={32} />}
        title="No one is waiting"
        description="New sign-ups appear here. Share the sign-up link so students can register."
        action={<Link to="/invite" className={buttonVariants({ variant: 'outline' })}>Share sign-up link</Link>}
      />
    );
  }

  const chosen = rows.filter(r => selected.has(r.id));
  const allChecked = chosen.length === rows.length ? true : chosen.length ? 'indeterminate' : false;

  return (
    <div className="grid gap-3 pb-24">
      <div className="flex items-center justify-between gap-3 px-1">
        <Checkbox
          checked={allChecked}
          onCheckedChange={v => setSelected(v ? new Set(rows.map(r => r.id)) : new Set())}
          label={<span className="text-small font-semibold">Select all {rows.length}</span>}
          disabled={!!busy}
        />
        {busy && <p className="text-small font-semibold text-muted" aria-live="polite">{busy}</p>}
      </div>

      <ul className="grid gap-3">
        {rows.map(r => (
          <li key={r.id}>
            <Card className="grid gap-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  hideLabel
                  label={`Select ${r.name}`}
                  checked={selected.has(r.id)}
                  onCheckedChange={v => setSelected(s => {
                    const next = new Set(s);
                    if (v) next.add(r.id); else next.delete(r.id);
                    return next;
                  })}
                  disabled={!!busy}
                />
                <div className="min-w-0 flex-1">
                  <RegistrationSummary r={r} />
                </div>
              </div>
              {rowErrors[r.id] && (
                <p role="alert" className="rounded-xs bg-bad-bg px-3 py-2 text-small font-semibold text-bad-fg">
                  {rowErrors[r.id]}
                </p>
              )}
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setDeclining([r])}>Decline</Button>
                <Button size="sm" disabled={!!busy} onClick={() => accept([r])}>Accept</Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {chosen.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 px-4 lg:bottom-6 lg:left-[256px]">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-full border border-line bg-ink py-2 pl-5 pr-2 text-white shadow-lg">
            <p className="text-small font-semibold">{chosen.length} selected</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setDeclining(chosen)}>Decline</Button>
              <Button size="sm" variant="accent" disabled={!!busy} onClick={() => accept(chosen)}>Accept {chosen.length}</Button>
            </div>
          </div>
        </div>
      )}

      <DeclineDialog list={declining} onCancel={() => setDeclining(null)} onConfirm={decline} />
    </div>
  );
}

function RegistrationSummary({ r }: { r: Registration }) {
  const details = [r.gender, r.ward, r.email].filter(Boolean).join(' · ');
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="font-heading text-h3">{r.name}</h3>
        <p className="text-caption text-muted">Code {formatRefCode(r.id)}</p>
      </div>
      <p className="text-small tabular-nums">
        <a href={`tel:+${r.phoneKey}`} className="underline-offset-4 hover:underline">{formatPhone(r.phoneKey)}</a>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {r.classes.map(c => <ClassChip key={c} classId={c} size="sm" />)}
      </div>
      {details && <p className="text-small text-muted">{details}</p>}
      <p className="text-caption text-muted">Signed up {formatDateShort(r.createdAt)}</p>
    </div>
  );
}

function DeclineDialog({ list, onCancel, onConfirm }: {
  list: Registration[] | null;
  onCancel: () => void;
  onConfirm: (list: Registration[], reason: string, share: boolean) => void;
}) {
  const [reason, setReason] = useState('');
  const [share, setShare] = useState(false);
  useEffect(() => { if (list) { setReason(''); setShare(false); } }, [list]);
  const n = list?.length ?? 0;

  return (
    <Dialog
      open={!!list}
      onOpenChange={o => { if (!o) onCancel(); }}
      title={n === 1 ? `Decline ${list?.[0].name}?` : `Decline ${n} sign-ups?`}
      description="The record is kept, and they can sign up again with the same number."
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={() => list && onConfirm(list, reason, share)}>Decline</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Reason" optional hint="For admins. Students only see it if you tick the box below.">
          <Textarea rows={3} maxLength={300} value={reason} onChange={e => setReason(e.target.value)} />
        </Field>
        <Checkbox
          checked={share}
          onCheckedChange={setShare}
          disabled={!reason.trim()}
          label="Show this reason on their status page"
        />
      </div>
    </Dialog>
  );
}

// ── Accepted / declined ──────────────────────────────────────────────────

function ReviewedList({ status }: { status: 'accepted' | 'declined' }) {
  const { rows, error, retry } = useRegistrations(status);
  if (error) return <ErrorState description="Check your connection and try again." onRetry={retry} />;
  if (!rows) return <LoadingList rows={3} label={`Loading ${status} sign-ups`} />;
  if (rows.length === 0) {
    return <EmptyState title={status === 'accepted' ? 'None accepted yet' : 'None declined'} />;
  }
  return (
    <ul className="grid gap-3">
      {rows.map(r => (
        <li key={r.id}>
          <Card quiet className="grid gap-2">
            <RegistrationSummary r={r} />
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={status} size="sm" />
              <span className="text-caption text-muted">{formatDateShort(r.reviewedAt)}</span>
            </div>
            {status === 'declined' && r.declineReason && (
              <p className="text-small">
                <span className="font-semibold">Reason: </span>{r.declineReason}
                <span className="text-muted"> · {r.shareReason ? 'shown to student' : 'admins only'}</span>
              </p>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}
