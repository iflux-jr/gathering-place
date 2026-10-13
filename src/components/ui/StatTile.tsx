import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface StatTileProps {
  label: string;
  value: ReactNode;
  /** Small line under the value, e.g. "+12 this week" */
  sub?: ReactNode;
  tone?: string;
  icon?: ReactNode;
  className?: string;
}

/** Compact number tile, after the Quixel reference's stat chips */
export function StatTile({ label, value, sub, tone, icon, className }: StatTileProps) {
  return (
    <div
      className={cn('flex min-w-0 items-center gap-3 rounded-md border-1.5 border-ink p-3 sm:p-4', !tone && 'bg-surface', className)}
      style={tone ? { backgroundColor: tone } : undefined}
    >
      {icon && <span aria-hidden="true" className="grid h-10 w-10 flex-none place-items-center rounded-full bg-surface/70">{icon}</span>}
      <div className="min-w-0">
        <p className="font-heading text-h2 leading-none tabular-nums text-ink">{value}</p>
        <p className="mt-1 truncate text-small font-semibold text-ink">{label}</p>
        {sub && <p className="truncate text-caption text-muted">{sub}</p>}
      </div>
    </div>
  );
}
