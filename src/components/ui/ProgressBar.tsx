import { cn } from '../../lib/cn';

interface ProgressBarProps {
  value: number;
  max?: number;
  /** Accessible name, e.g. "Semester progress" */
  label: string;
  /** Human-readable value, e.g. "Week 7 of 12" */
  valueText?: string;
  className?: string;
  /** Track tint; the bar itself is ink, as in the references */
  track?: string;
}

export function ProgressBar({ value, max = 100, label, valueText, className, track }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      className={cn('h-2 overflow-hidden rounded-full', !track && 'bg-ink/15', className)}
      style={track ? { backgroundColor: track } : undefined}
    >
      <div className="h-full rounded-full bg-ink transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
    </div>
  );
}
