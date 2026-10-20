// src/pages/ProfilePage.tsx — the signed-in person's own details, a password reset and log out
import { useState } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/layout/PageHeader';
import { useSignOut, useWho } from '../components/layout/account';
import { Avatar, Button, Card, RoleBadge } from '../components/ui';
import { resetPassword } from '../firebase/users';
import useAuthStore from '../store/authStore';
import { useClassLabel } from '../store/classStore';

export default function ProfilePage() {
  const { name, email, role } = useWho();
  const classId = useAuthStore(s => s.profile?.assignedClass ?? null) as string | null;
  const classLabel = useClassLabel(classId ?? '');
  const signOut = useSignOut();
  const [sending, setSending] = useState(false);

  async function sendReset() {
    if (!email) return;
    setSending(true);
    try {
      await resetPassword(email);
      toast.success(`Password link sent to ${email}`);
    } catch {
      toast.error('Couldn’t send the email. Try again in a moment.');
    } finally {
      setSending(false);
    }
  }

  const rows: [string, React.ReactNode][] = [
    ['Name', name],
    ['Email', email || '—'],
    ['Role', <RoleBadge key="r" role={role} />],
    ['Class', classId ? classLabel : 'None'],
  ];

  return (
    <>
      <PageHeader title="Profile" description="Your account on The Gathering Place." />
      <div className="grid max-w-[720px] gap-4">
        <Card className="grid gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={name} size="lg" className="rounded-[10px] text-white" tone="#5A3825" />
            <div className="min-w-0">
              <p className="truncate text-h2 font-semibold">{name}</p>
              {email && <p className="truncate text-small text-muted">{email}</p>}
            </div>
          </div>
          <dl className="grid divide-y divide-line rounded-control border border-line">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 px-3 py-2.5">
                <dt className="text-small text-muted">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-caption text-muted">Ask the admin if your name, role or class needs changing.</p>
        </Card>
        <Card className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Password</p>
            <p className="text-small text-muted">We’ll email you a link to choose a new one.</p>
          </div>
          <Button variant="outline" loading={sending} disabled={!email} onClick={sendReset}>
            <KeyRound size={16} aria-hidden="true" /> Change password
          </Button>
        </Card>
        <Button variant="outline" className="justify-self-start" onClick={signOut}>
          <LogOut size={16} aria-hidden="true" /> Log out
        </Button>
      </div>
    </>
  );
}
