// Pick up to two classes. Each class is a tile in its own pastel; a chosen one gets a ring in its colour and a tick.
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
      <div className="flex items-center justify-between gap-3">
        <legend className="font-heading text-h3 font-semibold text-ink">
          Choose up to {MAX_CLASSES_PER_STUDENT} classes<span aria-hidden="true" className="text-bad-fg"> *</span>
        </legend>
        <p id="class-picker-count" className="rounded-[6px] bg-subtle px-2 py-0.5 text-caption font-semibold tabular-nums text-ink-2" aria-live="polite">
          {value.length} of {MAX_CLASSES_PER_STUDENT}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                  'relative flex min-h-[64px] w-full flex-col items-start justify-between gap-2 rounded-[10px] border px-3 py-2.5 text-left',
                  'font-body text-body font-semibold',
                  'transition-[box-shadow,transform] duration-150 active:scale-[.98]',
                  'focus-visible:outline-none focus-visible:shadow-focus',
                  blocked && 'cursor-not-allowed opacity-45',
                )}
                style={{
                  backgroundColor: selected ? color.surface : `${color.surface}80`,
                  borderColor: selected ? color.strong : color.surface,
                  boxShadow: selected ? `inset 0 0 0 1px ${color.strong}` : undefined,
                  color: color.strong,
                }}
              >
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color.strong }} />
                <span className="pr-7 leading-tight">{c.label}</span>
                <AnimatePresence>
                  {selected && (
                    <motion.span
                      key="tick"
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={spring}
                      className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full text-white"
                      style={{ backgroundColor: color.strong }}
                    >
                      <Check size={12} strokeWidth={3} aria-hidden="true" />
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
