// Frame for signed-out pages (sign in, forgot password): a welcome panel beside the form
// on wide screens, and the form alone under the logo on phones.
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
            <p className="font-mono text-label uppercase text-accent-600">Connect. Learn. Grow.</p>
            <p className="max-w-[15ch] font-heading text-display-lg text-balance">
              Every class, every week, in one place.
            </p>
            <ul className="flex max-w-md flex-wrap gap-2" aria-label="Classes">
              {classes.map(c => (
                <li key={c.id} className="rounded-full border border-white/70 px-3 py-1.5 text-small font-semibold text-ink"
                  style={{ backgroundColor: getClassColor(c.id, c.colorKey).surface }}>
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-small text-muted">The Gathering Place · Young Single Adults</p>
        </div>
      </aside>
      <main className="flex flex-col px-4 pb-10 pt-[calc(env(safe-area-inset-top)+20px)] sm:px-8">
        <Link to="/" className="self-start rounded-md focus-visible:outline-none focus-visible:shadow-focus lg:hidden" aria-label="The Gathering Place, home">
          <Logo height={38} />
        </Link>
        <PageTransition>
          <div className="glass mx-auto mt-8 grid w-full max-w-md gap-6 rounded-frame p-6 sm:my-auto sm:p-8 lg:mt-[14vh]">
            <div className="grid gap-2">
              <h1 className="font-heading text-h1 md:text-h1-lg">{title}</h1>
              {description && <p className="text-muted">{description}</p>}
            </div>
            {children}
          </div>
        </PageTransition>
      </main>
    </div>
  );
}
