// src/pages/AddStudentPage.tsx — admins add a student directly, skipping the review queue
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { History, Lock, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/layout/PageHeader';
import { ClassPicker } from '../components/registration/ClassPicker';
import {
  Button, Card, Dialog, ErrorState, Field, Input, LoadingList, Select, SuccessState, buttonVariants,
} from '../components/ui';
import {
  RegistrationError, addStudentDirect, conflictMessage, findPhoneConflict, getJoinableClasses,
  loadArchiveLookup, type ArchiveMatch, type ClassOption,
} from '../firebase/registrations';
import { subscribeToRegistrationStatus } from '../firebase/systemSettings';
import useAuthStore from '../store/authStore';
import { phoneKey } from '../lib/phone';
import { colors } from '../theme/tokens';
import { GENDERS, MAX_CLASSES_PER_STUDENT } from '../utils/constants';

const EMPTY = { name: '', phone: '', gender: '', classes: [] as string[], ward: '', email: '' };
type Errors = Partial<Record<'name' | 'phone' | 'classes' | 'email', string>>;

export default function AddStudentPage() {
  const uid = useAuthStore(s => s.user?.uid) as string;
  const [classes, setClasses] = useState<ClassOption[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [regOpen, setRegOpen] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [checking, setChecking] = useState(false);
  const [archived, setArchived] = useState<ArchiveMatch | null>(null);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState<{ id: string; name: string; returning: boolean } | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const archiveLookup = useRef<ReturnType<typeof loadArchiveLookup> | null>(null);

  useEffect(() => { getJoinableClasses().then(setClasses).catch(() => setLoadError(true)); }, []);
  useEffect(() => subscribeToRegistrationStatus((s: { isOpen: boolean }) => setRegOpen(s.isOpen)), []);

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  /** On leaving the phone field: stop duplicates early and offer details from an earlier semester */
  async function checkPhone() {
    const key = phoneKey(form.phone);
    setArchived(null);
    if (!key) return;
    setChecking(true);
    try {
      const conflict = await findPhoneConflict(key);
      if (conflict) { setErrors(e => ({ ...e, phone: conflictMessage(conflict) })); return; }
      archiveLookup.current ??= loadArchiveLookup();
      const match = (await archiveLookup.current)(key);
      if (match) {
        setArchived(match);
        setForm(f => ({ ...f, name: f.name || match.student.name, gender: f.gender || match.student.gender || '' }));
      }
    } catch {
      archiveLookup.current = null; // try again next time
    } finally {
      setChecking(false);
    }
  }

  function validate(): Errors {
    const e: Errors = {};
    if (form.name.trim().length < 2) e.name = 'Enter their full name.';
    if (!phoneKey(form.phone)) e.phone = form.phone.trim() ? 'That number doesn’t look right.' : 'Enter their phone number.';
    if (form.classes.length === 0) e.classes = 'Choose at least one class.';
    if (form.classes.length > MAX_CLASSES_PER_STUDENT) e.classes = `Choose at most ${MAX_CLASSES_PER_STUDENT}.`;
    if (form.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) e.email = 'That email doesn’t look right.';
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length || !classes) return;
    setSaving(true);
    try {
      const id = await addStudentDirect(
        { ...form, gender: form.gender || null },
        { adminUid: uid, activeClasses: classes },
        archived,
      );
      setAdded({ id, name: form.name.trim(), returning: !!archived });
      setForm(EMPTY);
      setArchived(null);
      toast.success('Student added');
    } catch (err) {
      if (err instanceof RegistrationError) {
        if (err.code === 'duplicate' || err.code === 'invalid_phone') setErrors({ phone: err.message });
        else setErrors({ classes: err.message });
      } else {
        toast.error('Couldn’t add the student. Check your connection and try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Add a student"
        description="Students you add here skip the review queue. Most students should use the sign-up link instead."
        actions={<Link to="/invite" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Share sign-up link</Link>}
      />

      {!regOpen && (
        <p className="mb-4 flex items-start gap-2 rounded-xs border border-warn-fg/25 bg-warn-bg px-4 py-3 text-small font-semibold text-warn-fg">
          <Lock size={16} className="mt-0.5 flex-none" aria-hidden="true" />
          Public sign-ups are paused. You can still add students here.
        </p>
      )}

      {loadError ? (
        <ErrorState description="Check your connection and try again." onRetry={() => window.location.reload()} />
      ) : !classes ? (
        <LoadingList rows={4} />
      ) : added ? (
        <SuccessState
          title={`${added.name} is added`}
          description={added.returning ? 'Linked to their record from an earlier semester.' : 'Their teachers will see them on the register now.'}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => setQrOpen(true)}><QrCode size={16} aria-hidden="true" /> QR code</Button>
              <Button onClick={() => setAdded(null)}>Add another</Button>
            </div>
          }
        />
      ) : (
        <Card>
          <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
            <Field label="Phone number" required error={errors.phone}
              hint={checking ? 'Checking this number…' : 'We check for duplicates and earlier semesters when you leave this field.'}>
              <Input type="tel" inputMode="tel" autoComplete="off" placeholder="0803 123 4567"
                value={form.phone} onChange={e => { set('phone', e.target.value); setArchived(null); }}
                onBlur={checkPhone} disabled={saving} />
            </Field>

            {archived && (
              <p className="flex items-start gap-2 rounded-xs bg-info-bg px-4 py-3 text-small text-info-fg">
                <History size={16} className="mt-0.5 flex-none" aria-hidden="true" />
                <span>
                  <strong>Returning student.</strong> {archived.student.name} was in {archived.semesterLabel}. Their name is filled in; pick their new classes.
                </span>
              </p>
            )}

            <Field label="Full name" required error={errors.name}>
              <Input autoComplete="off" value={form.name} onChange={e => set('name', e.target.value)} disabled={saving} />
            </Field>
            <Field label="Gender" optional>
              <Select value={form.gender} onChange={e => set('gender', e.target.value)} disabled={saving}>
                <option value="">Choose…</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </Select>
            </Field>
            <ClassPicker options={classes} value={form.classes} onChange={v => set('classes', v)} error={errors.classes} disabled={saving} />
            <Field label="Ward or branch" optional>
              <Input value={form.ward} onChange={e => set('ward', e.target.value)} disabled={saving} maxLength={80} />
            </Field>
            <Field label="Email" optional error={errors.email}>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} disabled={saving} maxLength={120} />
            </Field>
            <Button type="submit" size="lg" block loading={saving} disabled={checking}>
              {archived ? 'Add returning student' : 'Add student'}
            </Button>
          </form>
        </Card>
      )}

      {added && (
        <Dialog open={qrOpen} onOpenChange={setQrOpen} title="Student QR code" description={`Scan to check in ${added.name}.`}>
          <div className="grid justify-items-center gap-3">
            <div className="rounded-card border border-line bg-white p-4">
              <QRCodeSVG value={`gathering-place://student/${added.id}`} size={192} fgColor={colors.ink.DEFAULT} bgColor="#FFFFFF" level="M" />
            </div>
            <p className="font-mono text-caption text-muted">ID {added.id}</p>
          </div>
        </Dialog>
      )}
    </div>
  );
}
