import { Link } from 'react-router-dom';
import { Logo } from '../components/brand/Logo';
import { buttonVariants } from '../components/ui';
import useAuthStore from '../store/authStore';
import { homePathFor } from '../lib/homePath';

export default function NotFoundPage() {
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const home = user ? homePathFor(profile) : '/login';
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10 text-center font-body text-ink">
      <div className="grid max-w-sm justify-items-center gap-4">
        <Logo variant="mark" height={72} />
        <p className="font-heading text-display-lg">404</p>
        <h1 className="font-heading text-h2">This page doesn’t exist</h1>
        <p className="text-muted">The link may be mistyped, or the page has moved.</p>
        <Link to={home} className={buttonVariants({ variant: 'dark' })}>Go to the start</Link>
      </div>
    </main>
  );
}
