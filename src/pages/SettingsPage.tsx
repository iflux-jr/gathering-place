// src/pages/SettingsPage.tsx — open or pause sign-ups, and manage staff accounts
import { useEffect, useState } from 'react';
import { Lock, Mail, Pencil, Unlock, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Avatar, Button, Card, ClassChip, Dialog, EmptyState, Field, Input, LoadingList, RoleBadge, Select, StatusPill, Textarea,
} from '../components/ui';
import { assignTeacher } from '../firebase/classes';
import { StaffError, createStaff, removeStaff, resendInvite, updateStaff } from '../firebase/staff';
import { setRegistrationStatus, subscribeToRegistrationStatus } from '../firebase/systemSettings';
import { subscribeToUsers } from '../firebase/users';
import useAuthStore from '../store/authStore';
import { useActiveClasses, useClassLookup } from '../store/classStore';
import type { Role, UserProfile } from '../types/firestore';

const nameOf = (u: UserProfile) => u.name || u.email || 'Unnamed';

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-8">
        <SignupsCard />
        <StaffSection />
      </div>
    </>
  );
}

function SignupsCard() {
  const uid = useAuthStore(s => s.user?.uid) as string;
  const [status, setStatus] = useState<{ isOpen: boolean; message?: string } | null>(null);
  const [pausing, setPausing] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => subscribeToRegistrationStatus((s: { isOpen?: boolean; message?: string }) => setStatus({ isOpen: s.isOpen !== false, message: s.message })), []);

  async function set(open: boolean) {
    setBusy(true);
    try {
      await setRegistrationStatus(open, open ? '' : message.trim(), uid);
      toast.success(open ? 'Sign-ups are open' : 'Sign-ups are paused');
      setPausing(false);
    } catch {
      toast.error('Couldn’t save. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="section" aria-labelledby="signups-heading" className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 id="signups-heading" className="flex items-center gap-2 font-heading text-h3">
            Student sign-ups {status && <StatusPill status={status.isOpen ? 'open' : 'paused'} size="sm" />}
          </h2>
          <p className="max-w-[60ch] text-small text-muted">
            {status?.isOpen === false
              ? 'The public form is closed. People who open the link see your message instead.'
              : 'Anyone with the link can sign up. You review every sign-up before they join a class.'}
          </p>
          {status?.isOpen === false && status.message && <p className="text-small">“{status.message}”</p>}
        </div>
        {status && (status.isOpen
          ? <Button variant="outline" onClick={() => { setMessage(''); setPausing(true); }}><Lock size={16} aria-hidden="true" /> Pause sign-ups</Button>
          : <Button loading={busy} onClick={() => set(true)}><Unlock size={16} aria-hidden="true" /> Open sign-ups</Button>)}
      </div>
      <Dialog open={pausing} onOpenChange={setPausing} title="Pause sign-ups?"
        description="The form closes straight away. Sign-ups already waiting stay in your queue."
        footer={<>
          <Button variant="ghost" onClick={() => setPausing(false)}>Cancel</Button>
          <Button variant="dark" loading={busy} onClick={() => set(false)}>Pause sign-ups</Button>
        </>}
      >
        <Field label="Message for people who open the link" optional hint="For example, when sign-ups open again">
          <Textarea rows={3} maxLength={200} value={message} onChange={e => setMessage(e.target.value)} />
        </Field>
      </Dialog>
    </Card>
  );
}

function StaffSection() {
  const me = useAuthStore(s => s.user?.uid) as string;
  const lookup = useClassLookup();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [editing, setEditing] = useState<UserProfile | 'new' | null>(null);
  useEffect(() => subscribeToUsers((u: UserProfile[]) => setUsers(u)), []);

  const staff = (users ?? [])
    .filter(u => u.role === 'admin' || u.role === 'teacher')
    .sort((a, b) => (a.role === b.role ? nameOf(a).localeCompare(nameOf(b)) : a.role === 'admin' ? -1 : 1));

  return (
    <section aria-labelledby="staff-heading" className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="staff-heading" className="font-heading text-h3">Staff</h2>
          <p className="text-small text-muted">Teachers mark attendance for their class. Admins can do everything.</p>
        </div>
        <Button onClick={() => setEditing('new')}><UserPlus size={16} aria-hidden="true" /> Add staff</Button>
      </div>
      {!users ? <LoadingList rows={3} label="Loading staff" /> : staff.length === 0 ? (
        <EmptyState title="No staff yet" />
      ) : (
        <ul className="grid gap-2">
          {staff.map(u => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface p-3">
              <Avatar name={nameOf(u)} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{nameOf(u)}{u.id === me && <span className="font-normal text-muted"> (you)</span>}</p>
                <p className="truncate text-small text-muted">{u.email}</p>
              </div>
              <div className="order-last flex basis-full flex-wrap items-center gap-1.5 pl-[52px] sm:order-none sm:basis-auto sm:pl-0">
                <RoleBadge role={u.role === 'admin' && u.assignedClass ? 'admin-teacher' : u.role} />
                {u.assignedClass && <ClassChip classId={u.assignedClass} size="sm" label={lookup.label(u.assignedClass)} />}
              </div>
              <Button size="sm" variant="ghost" aria-label={`Edit ${nameOf(u)}`} onClick={() => setEditing(u)}>
                <Pencil size={14} aria-hidden="true" /> Edit
              </Button>
            </li>
          ))}
        </ul>
      )}
      <StaffDialog person={editing} users={users ?? []} onClose={() => setEditing(null)} />
    </section>
  );
}

function StaffDialog({ person, users, onClose }: { person: UserProfile | 'new' | null; users: UserProfile[]; onClose: () => void }) {
  const me = useAuthStore(s => s.user?.uid) as string;
  const classes = useActiveClasses();
  const lookup = useClassLookup();
  const isNew = person === 'new';
  const existing = person && person !== 'new' ? person : null;
  const [form, setForm] = useState({ name: '', email: '', role: 'teacher' as Role, cls: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!person) return;
    setErrors({}); setRemoving(false);
    setForm(existing
      ? { name: existing.name ?? '', email: existing.email ?? '', role: existing.role, cls: existing.assignedClass ?? '' }
      : { name: '', email: '', role: 'teacher', cls: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person]);

  const admins = users.filter(u => u.role === 'admin');
  const lastAdmin = existing?.role === 'admin' && admins.length <= 1;
  const change = (k: keyof typeof form, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '', form: '' }));
  };
  const others = form.cls ? users.filter(u => u.assignedClass === form.cls && u.id !== existing?.id) : [];

  async function save() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'Enter their name.';
    if (isNew && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter an email address like name@example.com.';
    if (form.role === 'teacher' && !form.cls) e.cls = 'Choose the class they teach.';
    if (existing && lastAdmin && form.role !== 'admin') e.role = 'There must be at least one admin.';
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;

    setBusy(true);
    try {
      let uid = existing?.id;
      if (isNew) {
        uid = await createStaff({ name: form.name, email: form.email, role: form.role, assignedClass: null }, me);
      } else {
        await updateStaff(uid!, { name: form.name.trim(), role: form.role });
      }
      // One teacher per class: taking a class moves it from whoever had it
      if ((form.cls || null) !== (existing?.assignedClass ?? null)) {
        if (form.cls) await assignTeacher(form.cls, uid!, others.map(o => o.id));
        else await updateStaff(uid!, { assignedClass: null });
      }
      toast.success(isNew ? `${form.name.trim()} added. They’ll get an email to set their password.` : 'Saved');
      onClose();
    } catch (err) {
      if (err instanceof StaffError) setErrors({ [err.code === 'failed' ? 'form' : 'email']: err.message });
      else toast.error('Couldn’t save. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing) return;
    setBusy(true);
    try {
      await removeStaff(existing.id);
      toast.success(`${nameOf(existing)} no longer has access`);
      onClose();
    } catch {
      toast.error('Couldn’t remove. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!existing?.email) return;
    try {
      await resendInvite(existing.email);
      toast.success(`Sent a password email to ${existing.email}`);
    } catch {
      toast.error('Couldn’t send. Check your connection and try again.');
    }
  }

  const canRemove = existing && existing.id !== me && !lastAdmin;

  return (
    <>
      <Dialog open={!!person && !removing} onOpenChange={o => { if (!o) onClose(); }}
        title={isNew ? 'Add staff' : `Edit ${existing ? nameOf(existing) : ''}`}
        description={isNew ? 'They’ll get an email with a link to set their password.' : existing?.email}
        footer={<>
          {canRemove && <Button variant="ghost" className="mr-auto text-bad-fg" onClick={() => setRemoving(true)}>Remove access</Button>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={busy} onClick={save}>{isNew ? 'Add and send email' : 'Save'}</Button>
        </>}
      >
        <form className="grid gap-5" onSubmit={e => { e.preventDefault(); save(); }}>
          {errors.form && <p role="alert" className="rounded-md bg-bad-bg px-4 py-3 text-small font-semibold text-bad-fg">{errors.form}</p>}
          <Field label="Name" required error={errors.name}>
            <Input value={form.name} maxLength={60} autoComplete="off" onChange={e => change('name', e.target.value)} />
          </Field>
          {isNew && (
            <Field label="Email" required error={errors.email}>
              <Input type="email" inputMode="email" autoComplete="off" value={form.email} onChange={e => change('email', e.target.value)} />
            </Field>
          )}
          <Field label="Role" error={errors.role}>
            <Select value={form.role} onChange={e => { change('role', e.target.value); setErrors(er => ({ ...er, cls: '' })); }}>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          <Field label="Class they teach" required={form.role === 'teacher'} optional={form.role === 'admin'} error={errors.cls}
            hint={others.length ? `${others.map(nameOf).join(', ')} will stop teaching ${lookup.label(form.cls)}.` : form.role === 'admin' ? 'Admins can also teach one class.' : undefined}>
            <Select value={form.cls} onChange={e => change('cls', e.target.value)}>
              <option value="">{form.role === 'admin' ? 'None' : 'Choose a class'}</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </Field>
          {existing?.email && (
            <Button type="button" size="sm" variant="ghost" className="justify-self-start" onClick={resend}>
              <Mail size={14} aria-hidden="true" /> Send a new password email
            </Button>
          )}
        </form>
      </Dialog>

      <Dialog open={removing} onOpenChange={setRemoving} title={`Remove ${existing ? nameOf(existing) : ''}’s access?`}
        description="They can’t open anything in the app any more. Attendance they marked is kept. To use the email again later, also delete the account under Authentication in the Firebase console."
        footer={<>
          <Button variant="ghost" onClick={() => setRemoving(false)}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={remove}>Remove access</Button>
        </>}
      />
    </>
  );
}
