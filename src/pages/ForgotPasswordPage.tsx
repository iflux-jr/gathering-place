// src/pages/ForgotPasswordPage.tsx — sends a Firebase password-reset email
import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button, Field, Input, SuccessState } from '../components/ui';
import { resetPassword } from '../firebase/users';

export default function ForgotPasswordPage() {
  const location = useLocation();
  const [email, setEmail] = useState<string>((location.state as { email?: string } | null)?.email ?? '');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError('Enter the email you sign in with.'); return; }
    setError('');
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : '';
      if (code === 'auth/invalid-email') setError('That email address doesn’t look right.');
      else if (code === 'auth/user-not-found') setSent(true); // same message either way, so accounts can't be probed
      else if (code === 'auth/network-request-failed') setError('You seem to be offline. Check your connection and try again.');
      else setError('Couldn’t send the email. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Reset your password" description="We’ll email you a link to choose a new one.">
      {sent ? (
        <div className="grid gap-5">
          <SuccessState
            title="Check your email"
            description={<>If <b>{email.trim()}</b> has an account, a reset link is on its way. It can take a few minutes, and may land in spam.</>}
          />
          <Link to="/login" className="justify-self-center rounded-md px-2 py-1 font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:shadow-focus">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
          <Field label="Email" error={error}>
            <Input type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
          </Field>
          <Button type="submit" size="lg" block loading={loading}>Send reset link</Button>
          <Link to="/login" className="justify-self-center rounded-md px-2 py-1 text-small font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:shadow-focus">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
