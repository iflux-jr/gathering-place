import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface PageHeaderProps {
  title: ReactNode;
  /** Small line above the title, e.g. "Computer · Week 7 of 12" */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Buttons aligned right on wide screens, below the title on phones */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, eyebrow, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-small font-medium text-muted">{eyebrow}</p>}
        <h1 className="font-heading text-h1 text-balance text-ink md:text-h1-lg">{title}</h1>
        {description && <p className="mt-1.5 max-w-[72ch] text-small text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-none flex-wrap gap-2">{actions}</div>}
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
    <div className={cn('flex flex-wrap items-end justify-between gap-x-4 gap-y-3', className)}>
      <div className="min-w-0">
        <h2 id={id} className="font-heading text-h3 text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-small text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-none flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
