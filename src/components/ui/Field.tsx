import {
  cloneElement, forwardRef, isValidElement, useId,
  type InputHTMLAttributes, type ReactElement, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/cn';

// 16px text on phones so they don't zoom, 14px from 640px. 44px tall on phones, 38px on desktop.
// Focus: orange edge and a soft orange ring.
const controlBase = [
  'w-full min-h-touch rounded-control border border-line-strong bg-white px-3 sm:min-h-[38px]',
  'font-body text-input text-ink placeholder:text-faint/80 sm:text-body',
  'hover:border-line-control/60',
  'focus-visible:outline-none focus-visible:border-accent-500 focus-visible:ring-[3px] focus-visible:ring-accent-500/20',
  'disabled:cursor-not-allowed disabled:bg-subtle disabled:opacity-70',
  'aria-[invalid=true]:border-bad-fg aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-bad-fg/10',
].join(' ');

interface FieldProps {
  label: ReactNode;
  /** Extra guidance under the label, read by screen readers with the control */
  hint?: ReactNode;
  /** Error message; marks the control invalid and is announced */
  error?: ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
  /** A single Input, Select or Textarea; it receives id and aria wiring */
  children: ReactElement;
}

/** Label, hint and error wired to one form control */
export function Field({ label, hint, error, required, optional, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control = isValidElement<Record<string, unknown>>(children)
    ? cloneElement(children, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required || undefined,
      })
    : children;

  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={id} className="font-body text-small font-semibold text-ink-2">
        {label}
        {required && <span aria-hidden="true" className="text-bad-fg"> *</span>}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {hint && <p id={hintId} className="-mt-0.5 text-small text-muted">{hint}</p>}
      {control}
      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-small font-semibold text-bad-fg">
          <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="currentColor" />
            <path d="M8 4.5v4M8 11h.01" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlBase, className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select ref={ref} className={cn(controlBase, 'appearance-none pr-9', className)} {...props}>
          {children}
        </select>
        <svg viewBox="0 0 16 16" aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 3, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(controlBase, 'py-2.5 leading-6', className)} {...props} />;
  },
);
