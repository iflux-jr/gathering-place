import { cn } from '../../lib/cn';

interface ProgressBarProps {
  value: number;
  max?: number;
  /** Accessible name, e.g. "Semester progress" */
  label: string;
  /** Human-readable value, e.g. "Week 7 of 12" */
  valueText?: string;
  className?: string;
  /** Track tint; the bar itself is the orange gradient */
  track?: string;
}

export function ProgressBar({ value, max = 100, label, valueText, className, track }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      className={cn('h-1.5 overflow-hidden rounded-full', !track && 'bg-ink/[.08]', className)}
      style={track ? { backgroundColor: track } : undefined}
    >
      {/* Scaled rather than resized, so it animates on the compositor */}
      <div
        className="bg-primary-gradient h-full w-full origin-left rounded-full transition-transform duration-500 ease-calm motion-reduce:transition-none"
        style={{ transform: `scaleX(${pct})` }}
      />
    </div>
  );
}
