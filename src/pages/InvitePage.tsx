// src/pages/InvitePage.tsx — the sign-up link and QR code that teachers and admins share
import { useEffect, useState } from 'react';
import { Copy, MessageCircle, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, Field, Select, buttonVariants } from '../components/ui';
import { getJoinableClasses, type ClassOption } from '../firebase/registrations';
import useAuthStore from '../store/authStore';
import { colors } from '../theme/tokens';

export default function InvitePage() {
  const assignedClass = useAuthStore(s => s.profile?.assignedClass) as string | null | undefined;
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState(assignedClass ?? '');

  useEffect(() => { getJoinableClasses().then(setClasses).catch(() => setClasses([])); }, []);

  const url = `${window.location.origin}/join${classId ? `?class=${encodeURIComponent(classId)}` : ''}`;
  const label = classes.find(c => c.id === classId)?.label;
  const message = label
    ? `Sign up for the ${label} class at The Gathering Place: ${url}`
    : `Sign up for a class at The Gathering Place: ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Couldn’t copy. Press and hold the link to copy it.');
    }
  }

  return (
    <>
      <PageHeader
        title="Invite students"
        description="Students sign up with this link or QR code, then the admin reviews each one."
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] print:block">
        <Card className="grid justify-items-center gap-4 py-8 text-center print:border-0">
          <div className="rounded-card border border-line bg-white p-4">
            <QRCodeSVG value={url} size={220} fgColor={colors.ink.DEFAULT} bgColor="#FFFFFF" level="M"
              role="img" aria-label={`QR code for ${url}`} />
          </div>
          <div className="grid gap-1">
            <p className="font-heading text-h3">{label ? `Join ${label}` : 'Join a class'}</p>
            <p className="break-all text-small text-muted">{url}</p>
          </div>
        </Card>

        <Card className="grid content-start gap-4 print:hidden">
          <Field label="Choose a class for them" optional hint="Their sign-up form starts with this class picked. They can still change it.">
            <Select value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">No class picked</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={copy}><Copy size={16} aria-hidden="true" /> Copy link</Button>
            <a className={buttonVariants({ variant: 'dark' })} target="_blank" rel="noreferrer"
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}>
              <MessageCircle size={16} aria-hidden="true" /> Share on WhatsApp
            </a>
          </div>
          <Button variant="ghost" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Print the QR code</Button>
        </Card>
      </div>
    </>
  );
}
