import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface StatTileProps {
  label: string;
  value: ReactNode;
  /** Small line under the value, e.g. "This semester" */
  sub?: ReactNode;
  tone?: string;
  icon?: ReactNode;
  className?: string;
}

/** Number tile: label and icon on top, the figure below, so a row of tiles lines up */
export function StatTile({ label, value, sub, tone, icon, className }: StatTileProps) {
  return (
    <div
      className={cn('flex min-w-0 flex-col justify-between gap-3 rounded-card border p-4 sm:p-5', tone ? 'border-transparent' : 'border-line bg-surface shadow-sm', className)}
      style={tone ? { backgroundColor: tone } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-small font-medium text-muted">{label}</p>
        {icon && <span aria-hidden="true" className={cn('grid h-8 w-8 flex-none place-items-center rounded-full text-ink', tone ? 'bg-surface/70' : 'bg-subtle')}>{icon}</span>}
      </div>
      <div className="flex min-w-0 items-baseline gap-2">
        <p className="font-heading text-h1 leading-none tabular-nums text-ink">{value}</p>
        {sub && <p className="truncate text-caption text-muted">{sub}</p>}
      </div>
    </div>
  );
}
