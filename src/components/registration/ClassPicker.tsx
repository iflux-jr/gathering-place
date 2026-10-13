// Pick up to two classes. Each class keeps its own colour; chosen ones get an ink border and tick.
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';
import { getClassColor } from '../../theme/classes';
import { MAX_CLASSES_PER_STUDENT } from '../../utils/constants';
import type { ClassOption } from '../../firebase/registrations';

interface ClassPickerProps {
  options: ClassOption[];
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
  disabled?: boolean;
}

export function ClassPicker({ options, value, onChange, error, disabled }: ClassPickerProps) {
  const full = value.length >= MAX_CLASSES_PER_STUDENT;

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter(v => v !== id));
    else if (!full) onChange([...value, id]);
  }

  return (
    <fieldset className="grid gap-2" aria-describedby="class-picker-count class-picker-error">
      <div className="flex items-baseline justify-between gap-3">
        <legend className="font-body text-small font-semibold text-ink">
          Classes<span aria-hidden="true" className="text-flame-600"> *</span>
        </legend>
        <p id="class-picker-count" className="text-small text-muted" aria-live="polite">
          {value.length} of {MAX_CLASSES_PER_STUDENT} chosen
        </p>
      </div>
      <p className="text-small text-muted">Choose one or two.</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map(c => {
          const selected = value.includes(c.id);
          const blocked = !selected && full;
          return (
            <li key={c.id}>
              <button
                type="button"
                aria-pressed={selected}
                disabled={disabled || blocked}
                onClick={() => toggle(c.id)}
                className={cn(
                  'relative flex min-h-[56px] w-full items-center rounded-card border-1.5 px-3.5 py-3 text-left',
                  'font-body text-[0.9375rem] font-semibold text-ink transition-[border-color,box-shadow] duration-150',
                  'focus-visible:outline-none focus-visible:shadow-focus',
                  selected ? 'border-ink shadow-sm' : 'border-transparent',
                  blocked && 'cursor-not-allowed opacity-45',
                )}
                style={{ backgroundColor: getClassColor(c.id, c.colorKey).surface }}
              >
                <span className="pr-7">{c.label}</span>
                {selected && (
                  <span className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-ink text-white">
                    <Check size={14} strokeWidth={3} aria-hidden="true" />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {full && !error && (
        <p className="text-small text-muted">That's the most you can take. Tap a chosen class to swap it.</p>
      )}
      {error && <p id="class-picker-error" role="alert" className="text-small font-semibold text-bad-fg">{error}</p>}
    </fieldset>
  );
}
