import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { TopBar } from './TopBar';

interface PageHeaderProps {
  title: ReactNode;
  /** Small line above the title, e.g. "Computer · Week 7 of 12" */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Buttons aligned right on wide screens, below the title on phones */
  actions?: ReactNode;
  className?: string;
}

/**
 * Page title on the left. Inside the signed-in frame on desktop, search, notifications and the
 * person's name sit on the right of the same row, with any page actions under them.
 */
export function PageHeader({ title, eyebrow, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:mb-5', className)}>
      <div className="min-w-0 sm:flex-1 sm:pt-0.5">
        {eyebrow && <p className="mb-0.5 text-small font-medium text-accent-600">{eyebrow}</p>}
        <h1 className="font-heading text-h1 font-bold text-balance text-ink md:text-h1-lg">{title}</h1>
        {description && <p className="mt-0.5 max-w-[72ch] text-small text-muted">{description}</p>}
      </div>
      <div className="flex flex-none flex-col gap-2 sm:items-end">
        <TopBar />
        {actions && <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>}
      </div>
    </header>
  );
}

interface SectionHeaderProps {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Heading for a block inside a page or card: title, optional line under it, actions on the right */
export function SectionHeader({ id, title, description, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-2', className)}>
      <div className="min-w-0">
        <h2 id={id} className="font-heading text-h2 text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-small text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-none flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
