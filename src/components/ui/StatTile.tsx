import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { AnimatedNumber } from '../motion';

interface StatTileProps {
  label: string;
  /** A number counts up on first show; text (e.g. "—") shows as is */
  value: ReactNode;
  /** Appended to a counted number, e.g. "%" */
  suffix?: string;
  /** Small line under the value, e.g. "This semester" */
  sub?: ReactNode;
  tone?: string;
  icon?: ReactNode;
  /** The one key figure on a screen: orange gradient */
  featured?: boolean;
  className?: string;
}

/** Number tile: label and icon on top, the figure below, so a row of tiles lines up */
export function StatTile({ label, value, suffix, sub, tone, icon, featured = false, className }: StatTileProps) {
  return (
    <div
      className={cn(
        'lift flex min-w-0 flex-col justify-between gap-4 rounded-card p-4 sm:p-5',
        featured
          ? 'bg-primary-gradient border border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,.4),0_14px_32px_-12px_rgba(229,122,6,.6)]'
          : tone ? 'border border-white/60 shadow-md' : 'glass',
        className,
      )}
      style={tone && !featured ? { backgroundColor: tone } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cn('truncate text-small font-semibold', featured ? 'text-ink' : 'text-muted')}>{label}</p>
        {icon && (
          <span aria-hidden="true" className={cn(
            'grid h-9 w-9 flex-none place-items-center rounded-full text-ink',
            featured ? 'bg-white/35' : 'bg-white/80 text-accent-600 shadow-raised',
          )}>
            {icon}
          </span>
        )}
      </div>
      <div className="grid min-w-0 gap-1">
        <p className="font-heading text-[2.25rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-ink">
          {typeof value === 'number' ? <AnimatedNumber value={value} suffix={suffix} /> : value}
        </p>
        {sub && <p className={cn('truncate text-caption font-medium', featured ? 'text-ink/80' : 'text-muted')}>{sub}</p>}
      </div>
    </div>
  );
}
