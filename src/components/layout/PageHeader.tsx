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
    <header className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-small font-semibold text-muted">{eyebrow}</p>}
        <h1 className="font-heading text-h1 text-balance text-ink md:text-h1-lg">{title}</h1>
        {description && <p className="mt-1.5 max-w-[60ch] text-small text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
