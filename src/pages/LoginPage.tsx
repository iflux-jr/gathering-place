// src/pages/LoginPage.tsx — staff sign-in (admins and teachers)
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { FirebaseError } from 'firebase/app';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button, Field, Input } from '../components/ui';
import { getUserProfile, loginUser } from '../firebase/users';
import useAuthStore from '../store/authStore';
import { homePathFor } from '../lib/homePath';
import type { UserProfile } from '../types/firestore';

const MESSAGES: Record<string, string> = {
  'auth/invalid-email':      'That email address doesn’t look right. Check it and try again.',
  'auth/invalid-credential': 'The email or password is wrong. Try again, or reset your password.',
  'auth/user-not-found':     'The email or password is wrong. Try again, or reset your password.',
  'auth/wrong-password':     'The email or password is wrong. Try again, or reset your password.',
  'auth/user-disabled':      'This account has been turned off. Ask the admin to turn it back on.',
  'auth/too-many-requests':  'Too many attempts. Wait a few minutes, or reset your password.',
  'auth/network-request-failed': 'You seem to be offline. Check your connection and try again.',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  if (user) return <Navigate to={homePathFor(profile)} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Enter your email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    if (next.email || next.password) return;

    setLoading(true);
    try {
      const firebaseUser = await loginUser(email.trim(), password);
      const p = (await getUserProfile(firebaseUser.uid)) as UserProfile | null;
      toast.success(`Welcome back${p?.name ? `, ${p.name.split(' ')[0]}` : ''}`);
      navigate(homePathFor(p), { replace: true });
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : '';
      setErrors({ form: MESSAGES[code] ?? 'Couldn’t sign in. Try again in a moment.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Sign in" description="For admins and teachers. Students register with the link from the admin.">
      <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
        {errors.form && (
          <p role="alert" className="rounded-md bg-bad-bg px-4 py-3 text-small font-semibold text-bad-fg">{errors.form}</p>
        )}
        <Field label="Email" error={errors.email}>
          <Input
            type="email" autoComplete="email" inputMode="email" value={email}
            onChange={e => setEmail(e.target.value)} disabled={loading}
          />
        </Field>
        <Field label="Password" error={errors.password}>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password}
              onChange={e => setPassword(e.target.value)} disabled={loading} className="pr-12"
            />
            <button
              type="button" onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
              className="absolute right-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-ink focus-visible:outline-none focus-visible:shadow-focus"
            >
              {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </Field>
        <Button type="submit" size="lg" block loading={loading}>{loading ? 'Signing in' : 'Sign in'}</Button>
        <Link to="/forgot-password" state={{ email }} className="justify-self-center rounded-md px-2 py-1 text-small font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:shadow-focus">
          Forgot your password?
        </Link>
      </form>
    </AuthLayout>
  );
}
