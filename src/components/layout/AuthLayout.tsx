// Frame for signed-out pages (sign in, forgot password): a welcome panel beside the form
// on wide screens, and the form alone under the logo on phones, centred on the screen.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../brand/Logo';
import { PageTransition } from '../motion';
import { useActiveClasses } from '../../store/classStore';
import { getClassColor } from '../../theme/classes';

export function AuthLayout({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  const classes = useActiveClasses();
  return (
    <div className="grid min-h-dvh font-body text-ink lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="hidden p-6 lg:flex">
        <div className="glass flex w-full flex-col justify-between rounded-frame p-10">
          <Logo height={48} />
          <div className="grid gap-6">
            <p className="text-small font-semibold text-accent-600">Connect. Learn. Grow.</p>
            <p className="max-w-[15ch] font-heading text-display-lg font-bold text-balance">
              Every class, every week, in one place.
            </p>
            <ul className="flex max-w-md flex-wrap gap-2" aria-label="Classes">
              {classes.map(c => (
                <li key={c.id} className="rounded-[6px] px-2.5 py-1 text-small font-semibold"
                  style={{ backgroundColor: getClassColor(c.id, c.colorKey).surface, color: getClassColor(c.id, c.colorKey).strong }}>
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-small text-muted">The Gathering Place · Young Single Adults</p>
        </div>
      </aside>
      <main className="flex min-h-dvh flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-[calc(env(safe-area-inset-top)+20px)] sm:px-8">
        {/* Centred in the space left on the screen, on phones and desktop alike */}
        <div className="m-auto grid w-full max-w-[400px] gap-5 py-6">
          <Link to="/" aria-label="The Gathering Place, home"
            className="flex items-center gap-2.5 justify-self-center rounded-md px-1.5 focus-visible:outline-none focus-visible:shadow-focus lg:hidden">
            <Logo variant="favicon" height={40} />
            <span className="font-heading text-[1.1875rem] font-bold text-primary">Gathering Place</span>
          </Link>
          <PageTransition>
            <div className="glass grid gap-6 rounded-[14px] p-5 shadow-[0_18px_40px_-28px_rgba(31,26,23,.35)] sm:p-7">
              <div className="grid gap-1.5 text-center">
                <h1 className="font-heading text-h1 font-bold">{title}</h1>
                {description && <p className="text-small text-muted text-balance">{description}</p>}
              </div>
              {children}
            </div>
          </PageTransition>
          <ul className="flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
            {classes.map(c => (
              <li key={c.id} className="h-1.5 w-5 rounded-full" style={{ backgroundColor: getClassColor(c.id, c.colorKey).surface }} />
            ))}
          </ul>
        </div>
        <p className="text-center text-caption text-faint lg:hidden">The Gathering Place · Young Single Adults</p>
      </main>
    </div>
  );
}
