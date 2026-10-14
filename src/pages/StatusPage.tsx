// src/pages/StatusPage.tsx — students check a sign-up with their reference code
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { PublicLayout } from '../components/layout/PublicLayout';
import { Button, Card, ClassChip, ErrorState, Field, Input, Skeleton, buttonVariants } from '../components/ui';
import { getRegistrationStatus } from '../firebase/registrations';
import { formatRefCode, parseRefCode } from '../lib/refCode';
import { formatDateShort } from '../utils/dateUtils';
import type { RegistrationStatusDoc } from '../types/firestore';

type Lookup =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'missing' }
  | { state: 'found'; doc: RegistrationStatusDoc };

export default function StatusPage() {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const code = parseRefCode(codeParam);
  const [input, setInput] = useState(codeParam ? formatRefCode(codeParam.toUpperCase()) : '');
  const [inputError, setInputError] = useState<string>();
  const [lookup, setLookup] = useState<Lookup>({ state: 'idle' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!code) { setLookup(codeParam ? { state: 'missing' } : { state: 'idle' }); return; }
    let cancelled = false;
    setLookup({ state: 'loading' });
    getRegistrationStatus(code)
      .then(doc => { if (!cancelled) setLookup(doc ? { state: 'found', doc } : { state: 'missing' }); })
      .catch(() => { if (!cancelled) setLookup({ state: 'error' }); });
    return () => { cancelled = true; };
  }, [code, codeParam, attempt]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseRefCode(input);
    if (!parsed) { setInputError('Codes are 8 letters and numbers, like ABCD-2345.'); return; }
    setInputError(undefined);
    navigate(`/status/${parsed}`);
  }

  return (
    <PublicLayout>
      <div className="mb-6 grid gap-2">
        <h1 className="font-heading text-h1 md:text-h1-lg">Check your sign-up</h1>
        <p className="text-muted">Enter the reference code you got when you signed up.</p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" noValidate>
        <Field label="Reference code" error={inputError}>
          <Input value={input} onChange={e => { setInput(e.target.value); setInputError(undefined); }}
            autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="ABCD-2345"
            className="font-heading tracking-[0.06em] uppercase" />
        </Field>
        <Button type="submit" variant="dark">Check</Button>
      </form>

      <div aria-live="polite">
        {lookup.state === 'loading' && <Skeleton className="h-40 w-full rounded-card" />}
        {lookup.state === 'error' && (
          <ErrorState description="Check your connection and try again." onRetry={() => setAttempt(a => a + 1)} />
        )}
        {lookup.state === 'missing' && (
          <Card className="grid gap-2">
            <h2 className="font-heading text-h3">We couldn’t find that code</h2>
            <p className="text-small text-muted">
              Check each letter and try again. If you’ve lost your code, ask the YSA admin, or{' '}
              <Link to="/join" className="font-semibold text-ink underline underline-offset-4">sign up again</Link>.
            </p>
          </Card>
        )}
        {lookup.state === 'found' && code && <Result code={code} doc={lookup.doc} />}
      </div>
    </PublicLayout>
  );
}

function Result({ code, doc }: { code: string; doc: RegistrationStatusDoc }) {
  const view = {
    pending:  { icon: Clock,        tone: 'bg-warn-bg text-warn-fg', title: 'Waiting for review',
                body: 'The YSA admin hasn’t looked at this yet. Check back in a few days.' },
    accepted: { icon: CheckCircle2, tone: 'bg-ok-bg text-ok-fg',     title: 'You’re in!',
                body: 'See you in class. Your teacher will take attendance from now on.' },
    declined: { icon: XCircle,      tone: 'bg-bad-bg text-bad-fg',   title: 'Not accepted this time',
                body: 'You can sign up again, or speak to the YSA admin to find out more.' },
  }[doc.status];
  const Icon = view.icon;

  return (
    <Card className="grid gap-4">
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 flex-none place-items-center rounded-full ${view.tone}`} aria-hidden="true">
          <Icon size={22} />
        </span>
        <div className="grid gap-1">
          <p className="text-small text-muted">Code {formatRefCode(code)}</p>
          <h2 className="font-heading text-h2">{view.title}</h2>
        </div>
      </div>
      <p className="text-muted">{view.body}</p>
      {doc.status === 'declined' && doc.note && (
        <blockquote className="rounded-xs border-l-4 border-accent-500 bg-subtle px-4 py-3 text-small">
          <span className="font-semibold">Note from the admin: </span>{doc.note}
        </blockquote>
      )}
      <div className="flex flex-wrap gap-2" aria-label="Classes">
        {doc.classes.map(c => <ClassChip key={c} classId={c} />)}
      </div>
      <p className="text-small text-muted">Signed up {formatDateShort(doc.createdAt)}</p>
      {doc.status === 'declined' && (
        <Link to="/join" className={buttonVariants({ variant: 'outline' })}>Sign up again</Link>
      )}
    </Card>
  );
}
