import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { AnimatedNumber } from '../motion';

interface StatTileProps {
  label: string;
  /** A number counts up on first show; text (e.g. "—") shows as is */
  value: ReactNode;
  /** Appended to a counted number, e.g. "%" */
  suffix?: string;
  /** Small line under the value, e.g. "3 still waiting" */
  sub?: ReactNode;
  tone?: string;
  icon?: ReactNode;
  /** Kept for older call sites; every tile now looks the same */
  featured?: boolean;
  /** Makes the whole tile a link */
  to?: string;
  className?: string;
}

/** KPI card: a small icon box and label on top, the figure, then one line of context */
export function StatTile({ label, value, suffix, sub, tone, icon, to, className }: StatTileProps) {
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-2 text-body font-medium text-ink-2">
        {icon && (
          <span aria-hidden="true" className="grid h-6 w-6 flex-none place-items-center rounded-[6px] border border-line text-muted [&_svg]:h-3.5 [&_svg]:w-3.5">
            {icon}
          </span>
        )}
        <span className="truncate">{label}</span>
      </span>
      <span className="font-heading text-display font-bold tabular-nums text-ink">
        {typeof value === 'number' ? <AnimatedNumber value={value} suffix={suffix} /> : value}
      </span>
      {sub && <span className="flex min-w-0 items-center gap-1 truncate text-caption text-muted [&_svg]:h-3.5 [&_svg]:w-3.5">{sub}</span>}
    </>
  );
  const cls = cn(
    'flex min-w-0 flex-col gap-1.5 rounded-card border border-line px-4 py-3',
    !tone && 'bg-white',
    to && 'lift focus-visible:outline-none focus-visible:shadow-focus',
    className,
  );
  const style = tone ? { backgroundColor: tone } : undefined;
  return to
    ? <Link to={to} className={cls} style={style}>{body}</Link>
    : <div className={cls} style={style}>{body}</div>;
}
