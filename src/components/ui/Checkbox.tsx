import { useId, type ReactNode } from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { cn } from '../../lib/cn';

interface CheckboxProps {
  checked: boolean | 'indeterminate';
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  /** Visually hide the label (still read by screen readers), e.g. a row-select box */
  hideLabel?: boolean;
}

export function Checkbox({
  checked, onCheckedChange, label, description, disabled, required, className, hideLabel = false,
}: CheckboxProps) {
  const id = useId();
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={v => onCheckedChange(v === true)}
        disabled={disabled}
        required={required}
        aria-describedby={description ? `${id}-desc` : undefined}
        className={cn(
          'mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-[7px] border-1.5 border-line-control bg-surface hover:border-ink',
          'data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=indeterminate]:border-ink data-[state=indeterminate]:bg-ink text-white',
          'focus-visible:outline-none focus-visible:shadow-focus disabled:opacity-50',
          // 44px touch target without changing the visible size
          'relative before:absolute before:-inset-2.5 before:content-[""]',
        )}
      >
        <CheckboxPrimitive.Indicator>
          {checked === 'indeterminate' ? (
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true"><path d="M4 8h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          ) : (
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <div className={cn('grid gap-0.5', hideLabel && 'sr-only')}>
        <label htmlFor={id} className="cursor-pointer font-body text-body font-medium text-ink">{label}</label>
        {description && <p id={`${id}-desc`} className="text-small text-muted">{description}</p>}
      </div>
    </div>
  );
}
