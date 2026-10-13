import { cn } from '../../lib/cn';

interface SpinnerProps {
  className?: string;
  /** Text for screen readers; omit when a visible label sits next to the spinner */
  label?: string;
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex">
      <svg
        className={cn('h-4 w-4 animate-spin motion-reduce:animate-none', className)}
        viewBox="0 0 24 24" fill="none" aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
