// Frame for the public pages students use (sign-up and status): logo, one column, staff link.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../brand/Logo';
import { PageTransition } from '../motion';
import { buttonVariants } from '../ui';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col font-body text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between px-4 pb-2.5 pt-[calc(env(safe-area-inset-top)+10px)] sm:px-6">
        <Link to="/join" className="rounded-md focus-visible:outline-none focus-visible:shadow-focus" aria-label="The Gathering Place, sign up">
          <Logo height={32} />
        </Link>
        <Link to="/status" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Check status
        </Link>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 pb-8 pt-5 sm:px-6">
        <PageTransition>{children}</PageTransition>
      </main>
      <footer className="mx-auto w-full max-w-xl px-4 pb-[calc(env(safe-area-inset-bottom)+24px)] text-small text-muted sm:px-6">
        Teacher or admin? <Link to="/login" className="font-semibold text-ink underline decoration-accent-500 decoration-2 underline-offset-4">Sign in</Link>
      </footer>
    </div>
  );
}
