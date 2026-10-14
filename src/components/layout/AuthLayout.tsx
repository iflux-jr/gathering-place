// Frame for signed-out pages (sign in, forgot password): a colour-blocked panel on
// wide screens and a compact header on phones.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../brand/Logo';
import { useActiveClasses } from '../../store/classStore';
import { getClassColor } from '../../theme/classes';

export function AuthLayout({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  const classes = useActiveClasses();
  return (
    <div className="grid min-h-dvh bg-canvas font-body text-ink lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-ink p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo on="dark" height={36} />
        <div className="grid gap-6">
          <p className="max-w-[16ch] font-heading text-display-lg text-balance">
            Every class, every week, in one place.
          </p>
          <ul className="flex max-w-md flex-wrap gap-2" aria-label="Classes">
            {classes.map(c => (
              <li key={c.id} className="rounded-full px-3 py-1.5 text-small font-medium text-ink"
                style={{ backgroundColor: getClassColor(c.id, c.colorKey).surface }}>
                {c.label}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-small text-onDark-muted">The Gathering Place · Young Single Adults</p>
      </aside>
      <main className="flex flex-col px-4 pb-10 pt-[calc(env(safe-area-inset-top)+20px)] sm:px-8">
        <Link to="/" className="self-start rounded-md focus-visible:outline-none focus-visible:shadow-focus lg:hidden" aria-label="The Gathering Place, home">
          <Logo height={30} />
        </Link>
        <div className="mx-auto mt-10 grid w-full max-w-sm gap-6 py-6 sm:my-auto sm:py-10">
          <div className="grid gap-2">
            <h1 className="font-heading text-h1 md:text-h1-lg">{title}</h1>
            {description && <p className="text-muted">{description}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
