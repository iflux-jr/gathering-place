// Pick up to two classes. Each class keeps its own colour; chosen ones get a brown ring and a tick that pops in.
import { Check } from 'lucide-react';
import { AnimatePresence, motion, spring } from '../motion/config';
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
    <fieldset className="grid gap-3" aria-describedby="class-picker-count class-picker-error">
      <div className="flex items-baseline justify-between gap-3">
        <legend className="font-body text-small font-semibold text-ink">
          Classes<span aria-hidden="true" className="text-bad-fg"> *</span>
        </legend>
        <p id="class-picker-count" className="font-mono text-label uppercase text-muted" aria-live="polite">
          {value.length} of {MAX_CLASSES_PER_STUDENT} chosen
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {options.map(c => {
          const selected = value.includes(c.id);
          const blocked = !selected && full;
          const color = getClassColor(c.id, c.colorKey);
          return (
            <li key={c.id}>
              <button
                type="button"
                aria-pressed={selected}
                disabled={disabled || blocked}
                onClick={() => toggle(c.id)}
                className={cn(
                  'relative flex min-h-[72px] w-full flex-col items-start justify-between gap-2 rounded-md border px-3.5 py-3 text-left',
                  'font-body text-[0.9375rem] font-semibold text-ink',
                  'transition-transform duration-150 ease-calm active:scale-[.97]',
                  'focus-visible:outline-none focus-visible:shadow-focus',
                  selected
                    ? 'border-brand-brown shadow-[0_0_0_1.5px_theme(colors.brand.brown),0_10px_22px_-10px_rgba(90,56,37,.45)]'
                    : 'border-white/70 shadow-raised hover:-translate-y-px',
                  blocked && 'cursor-not-allowed opacity-45',
                )}
                style={{ backgroundColor: color.surface }}
              >
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full ring-4 ring-white/60" style={{ backgroundColor: color.strong }} />
                <span className="pr-7 leading-tight">{c.label}</span>
                <AnimatePresence>
                  {selected && (
                    <motion.span
                      key="tick"
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={spring}
                      className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full bg-brand-brown text-white"
                    >
                      <Check size={14} strokeWidth={3} aria-hidden="true" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </li>
          );
        })}
      </ul>
      {full && !error && (
        <p className="text-small text-muted">That’s the most you can take. Tap a chosen class to swap it.</p>
      )}
      {error && <p id="class-picker-error" tabIndex={-1} role="alert" className="text-small font-semibold text-bad-fg">{error}</p>}
    </fieldset>
  );
}
