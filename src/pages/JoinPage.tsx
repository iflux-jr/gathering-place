// src/pages/JoinPage.tsx — the public sign-up form students reach from the shared link or QR code
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Copy, Lock, MessageCircle } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import toast from 'react-hot-toast';
import { PublicLayout } from '../components/layout/PublicLayout';
import { ClassPicker } from '../components/registration/ClassPicker';
import {
  Button, Card, Checkbox, ErrorState, Field, Input, LoadingList, Select, buttonVariants,
} from '../components/ui';
import { getJoinableClasses, submitRegistration, type ClassOption } from '../firebase/registrations';
import { subscribeToRegistrationStatus } from '../firebase/systemSettings';
import { phoneKey } from '../lib/phone';
import { formatRefCode, newRefCode } from '../lib/refCode';
import { GENDERS, MAX_CLASSES_PER_STUDENT } from '../utils/constants';
import { Stagger, StaggerItem } from '../components/motion';
import { motion, spring } from '../components/motion/config';
import { cn } from '../lib/cn';

interface FormState {
  name: string; phone: string; gender: string; classes: string[]; ward: string; email: string; consent: boolean;
  /** Honeypot: hidden from people, filled in by form-filling bots */
  website: string;
}
type Errors = Partial<Record<'name' | 'phone' | 'classes' | 'email' | 'consent' | 'form', string>>;

const EMPTY: FormState = { name: '', phone: '', gender: '', classes: [], ward: '', email: '', consent: false, website: '' };

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = 'Enter your full name.';
  if (!f.phone.trim()) e.phone = 'Enter your phone number.';
  else if (!phoneKey(f.phone)) e.phone = 'That number doesn’t look right. Use the format 0803 123 4567.';
  if (f.classes.length === 0) e.classes = 'Choose at least one class.';
  if (f.classes.length > MAX_CLASSES_PER_STUDENT) e.classes = `Choose at most ${MAX_CLASSES_PER_STUDENT} classes.`;
  if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = 'That email doesn’t look right.';
  if (!f.consent) e.consent = 'Tick the box to agree before you send.';
  return e;
}

function submitErrorMessage(err: unknown): string {
  const code = err instanceof FirebaseError ? err.code : '';
  if (code === 'permission-denied') {
    return 'We couldn’t send this. The number may already be registered, or sign-ups may have just closed. '
      + 'If you registered before, check your status with your reference code, or speak to the YSA admin.';
  }
  if (code === 'unavailable') return 'You seem to be offline. Check your connection and try again.';
  return 'Something went wrong sending this. Try again in a moment.';
}

export default function JoinPage() {
  const [params] = useSearchParams();
  const [classes, setClasses] = useState<ClassOption[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reg, setReg] = useState<{ isOpen: boolean; message?: string } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(false);
    getJoinableClasses()
      .then(opts => {
        setClasses(opts);
        // A teacher's share link names their class, e.g. /join?class=baking
        const pre = params.get('class');
        if (pre && opts.some(o => o.id === pre)) setForm(f => (f.classes.length ? f : { ...f, classes: [pre] }));
      })
      .catch(() => setLoadError(true));
  }, [params]);

  useEffect(load, [load]);
  useEffect(() => subscribeToRegistrationStatus(
    (s: { isOpen: boolean; message?: string }) => setReg(s),
    () => setLoadError(true),
  ), []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined, form: undefined }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length) {
      document.querySelector<HTMLElement>('[aria-invalid="true"], #class-picker-error')?.focus();
      return;
    }
    if (form.website) {
      // A bot filled the hidden field. Look successful and send nothing.
      setRefCode(newRefCode());
      return;
    }
    setSending(true);
    try {
      const code = await submitRegistration({
        name: form.name, phone: form.phone, gender: form.gender || null,
        classes: form.classes, ward: form.ward, email: form.email,
      });
      setRefCode(code);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setErrors({ form: submitErrorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  if (refCode) return <PublicLayout><Confirmation code={refCode} name={form.name.trim().split(/\s+/)[0]} /></PublicLayout>;

  return (
    <PublicLayout>
      <div className="mb-6 grid gap-3 pt-2">
        <p className="font-mono text-label uppercase text-accent-600">Connect. Learn. Grow.</p>
        <h1 className="font-heading text-display text-balance md:text-display-lg">
          Learn a skill <span className="text-accent-600">this semester</span>
        </h1>
        <p className="max-w-[46ch] text-muted">
          Free classes for Young Single Adults. Fill this in and the YSA admin will review it. You’ll get a code to check your status.
        </p>
      </div>

      {loadError ? (
        <ErrorState description="Check your connection and try again." onRetry={() => window.location.reload()} />
      ) : !classes || !reg ? (
        <LoadingList rows={4} label="Loading the sign-up form" />
      ) : !reg.isOpen ? (
        <Card className="grid justify-items-center gap-3 py-12 text-center">
          <span className="mb-1 grid h-16 w-16 place-items-center rounded-full bg-white text-accent-600 shadow-raised" aria-hidden="true">
            <Lock size={26} />
          </span>
          <h2 className="font-heading text-h2">Sign-ups are closed for now</h2>
          <p className="max-w-[44ch] text-muted">
            {reg.message || 'The admin has paused new sign-ups. Check back later or ask at church.'}
          </p>
          <Link to="/status" className={cn(buttonVariants({ variant: 'outline' }), 'mt-2')}>Check an earlier sign-up</Link>
        </Card>
      ) : (
        <Card className="p-5 sm:p-7">
          <form onSubmit={handleSubmit} noValidate>
            <Stagger className="grid gap-7">
              <FormSection step={1} title="About you">
                <Field label="Full name" required error={errors.name}>
                  <Input autoComplete="name" value={form.name} onChange={e => set('name', e.target.value)} disabled={sending} />
                </Field>
                <Field label="Phone number" required error={errors.phone} hint="So we can tell you apart from others with the same name.">
                  <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567"
                    value={form.phone} onChange={e => set('phone', e.target.value)} disabled={sending} />
                </Field>
                <Field label="Gender" optional>
                  <Select value={form.gender} onChange={e => set('gender', e.target.value)} disabled={sending}>
                    <option value="">Choose…</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </Select>
                </Field>
              </FormSection>

              <FormSection step={2} title="Your classes" description="Choose one or two.">
                <ClassPicker options={classes} value={form.classes} onChange={v => set('classes', v)}
                  error={errors.classes} disabled={sending} />
              </FormSection>

              <FormSection step={3} title="A little more">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Ward or branch" optional>
                    <Input autoComplete="off" value={form.ward} onChange={e => set('ward', e.target.value)} disabled={sending} maxLength={80} />
                  </Field>
                  <Field label="Email" optional error={errors.email}>
                    <Input type="email" autoComplete="email" value={form.email} onChange={e => set('email', e.target.value)} disabled={sending} maxLength={120} />
                  </Field>
                </div>

                {/* Honeypot. Off-screen and skipped by keyboard and screen readers. */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                  <label>
                    Website
                    <input type="text" name="website" tabIndex={-1} autoComplete="off"
                      value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
                  </label>
                </div>

                <div className="grid gap-1.5 rounded-md border border-white/70 bg-white/55 p-4">
                  <Checkbox
                    checked={form.consent}
                    onCheckedChange={v => set('consent', v)}
                    disabled={sending}
                    required
                    label="I agree that the YSA team can keep these details to run the classes and contact me about them."
                  />
                  {errors.consent && <p role="alert" className="pl-9 text-small font-semibold text-bad-fg">{errors.consent}</p>}
                </div>
              </FormSection>

              <StaggerItem className="grid gap-3">
                {errors.form && (
                  <p role="alert" className="rounded-control border border-bad-fg/25 bg-bad-bg px-4 py-3 text-small font-semibold text-bad-fg">
                    {errors.form}
                  </p>
                )}
                <Button type="submit" size="lg" block loading={sending}>
                  {sending ? 'Sending…' : 'Send for review'}
                </Button>
                <p className="text-center text-caption text-muted">It takes about two minutes.</p>
              </StaggerItem>
            </Stagger>
          </form>
        </Card>
      )}
    </PublicLayout>
  );
}

/** A numbered block of the form, revealed in turn */
function FormSection({ step, title, description, children }: { step: number; title: string; description?: string; children: ReactNode }) {
  const id = `join-step-${step}`;
  return (
    <StaggerItem as="section" aria-labelledby={id} className="grid gap-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid h-8 w-8 flex-none place-items-center rounded-full bg-brand-brown font-mono text-small font-bold text-white">
          {step}
        </span>
        <div className="grid gap-0.5 pt-0.5">
          <h2 id={id} className="font-heading text-h3">{title}</h2>
          {description && <p className="text-small text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </StaggerItem>
  );
}

function Confirmation({ code, name }: { code: string; name: string }) {
  const display = formatRefCode(code);
  const statusUrl = `${window.location.origin}/status/${code}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(
    `My Gathering Place sign-up code is ${display}. Check my status: ${statusUrl}`,
  )}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(display);
      toast.success('Code copied');
    } catch {
      toast.error('Couldn’t copy. Write the code down instead.');
    }
  }

  return (
    <Card className="grid gap-6 p-6 text-center sm:p-8" role="status">
      <div className="grid justify-items-center gap-3">
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...spring, delay: 0.1 }}
          className="grid h-16 w-16 place-items-center rounded-full bg-ok-bg text-ok-fg shadow-raised"
          aria-hidden="true"
        >
          <Check size={30} strokeWidth={3} />
        </motion.span>
        <p className="font-mono text-label uppercase text-ok-fg">Sent for review</p>
        <h1 className="font-heading text-h1 text-balance md:text-h1-lg">Thanks{name ? `, ${name}` : ''}!</h1>
        <p className="max-w-[42ch] text-muted">
          The YSA admin will look at your sign-up soon. Keep this code to check whether you’ve been accepted.
        </p>
      </div>
      <div className="grid justify-items-center gap-2 rounded-md border border-white/80 bg-cream/80 px-4 py-6 shadow-inset">
        <p className="font-mono text-label uppercase text-muted">Your reference code</p>
        <p className="font-mono text-[2rem] font-bold tracking-[0.12em] text-ink" aria-label={`Reference code ${display.split('').join(' ')}`}>
          {display}
        </p>
        <p className="text-small text-muted">Take a screenshot or send it to yourself.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <a href={whatsapp} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'primary' })}>
          <MessageCircle size={16} aria-hidden="true" /> Send to my WhatsApp
        </a>
        <Button variant="outline" onClick={copy}><Copy size={16} aria-hidden="true" /> Copy code</Button>
      </div>
      <Link to={`/status/${code}`} className={buttonVariants({ variant: 'ghost' })}>Check my status</Link>
    </Card>
  );
}
