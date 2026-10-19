import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { getClassColor } from '../../theme/classes';
import useClassStore from '../../store/classStore';
import { colors } from '../../theme/tokens.js';

const chipBase = 'inline-flex items-center gap-1.5 rounded-full border border-line-strong/80 font-body font-semibold whitespace-nowrap';
const chipSizes = { sm: 'px-2.5 py-1 text-caption', md: 'px-3 py-1.5 text-small' };

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  size?: keyof typeof chipSizes;
  tone?: string;
}

/** Static pill label */
export function Chip({ size = 'md', tone, className, style, ...props }: ChipProps) {
  return (
    <span
      className={cn(chipBase, chipSizes[size], !tone && 'bg-white/75', className)}
      style={tone ? { backgroundColor: tone, ...style } : style}
      {...props}
    />
  );
}

interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
}

/** Toggleable pill, e.g. a filter. Announces its state with aria-pressed. */
export function FilterChip({ selected, className, type = 'button', ...props }: FilterChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        chipBase, 'min-h-[40px] px-4 text-small transition-transform duration-150 active:scale-[.97]',
        'focus-visible:outline-none focus-visible:shadow-focus',
        selected
          ? 'border-brand-brown bg-brand-brown text-white shadow-[0_6px_14px_-6px_rgba(90,56,37,.6)]'
          : 'bg-white/75 text-ink shadow-raised hover:border-ink/30',
        className,
      )}
      {...props}
    />
  );
}

interface ClassChipProps {
  classId: string;
  label?: string;
  colorKey?: string | null;
  size?: keyof typeof chipSizes;
  className?: string;
}

/** Class name on its class colour */
export function ClassChip({ classId, label, colorKey, size = 'md', className }: ClassChipProps) {
  const entry = useClassStore(s => s.classes.find(c => c.id === classId));
  const color = getClassColor(classId, colorKey ?? entry?.colorKey);
  const name = label ?? entry?.label ?? classId;
  return <Chip size={size} tone={color.surface} className={cn('border-transparent text-ink', className)}>{name}</Chip>;
}

export type Status =
  | 'present' | 'absent' | 'holiday' | 'unmarked'
  | 'pending' | 'accepted' | 'declined' | 'approved' | 'rejected' | 'cancelled' | 'archived'
  | 'open' | 'paused';

const STATUS: Record<Status, { label: string; cls: string }> = {
  present:   { label: 'Present',    cls: 'bg-ok-bg text-ok-fg' },
  absent:    { label: 'Absent',     cls: 'bg-bad-bg text-bad-fg' },
  holiday:   { label: 'Holiday',    cls: 'bg-info-bg text-info-fg' },
  unmarked:  { label: 'Not marked', cls: 'bg-neutral-bg text-neutral-fg' },
  pending:   { label: 'Pending',    cls: 'bg-warn-bg text-warn-fg' },
  accepted:  { label: 'Accepted',   cls: 'bg-ok-bg text-ok-fg' },
  approved:  { label: 'Approved',   cls: 'bg-ok-bg text-ok-fg' },
  declined:  { label: 'Declined',   cls: 'bg-bad-bg text-bad-fg' },
  rejected:  { label: 'Rejected',   cls: 'bg-bad-bg text-bad-fg' },
  cancelled: { label: 'Cancelled',  cls: 'bg-neutral-bg text-neutral-fg' },
  archived:  { label: 'Archived',   cls: 'bg-neutral-bg text-neutral-fg' },
  open:      { label: 'Open',       cls: 'bg-ok-bg text-ok-fg' },
  paused:    { label: 'Paused',     cls: 'bg-bad-bg text-bad-fg' },
};

interface StatusPillProps {
  status: Status;
  /** Override the default word, e.g. "Drop pending" */
  children?: ReactNode;
  size?: keyof typeof chipSizes;
  className?: string;
}

/** Status as a dot plus a word, never colour alone */
export function StatusPill({ status, children, size = 'md', className }: StatusPillProps) {
  const s = STATUS[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full font-body font-medium whitespace-nowrap', chipSizes[size], s.cls, className)}>
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
      {children ?? s.label}
    </span>
  );
}

interface RoleBadgeProps {
  role: 'admin' | 'teacher' | 'admin-teacher';
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  if (role === 'admin-teacher') {
    return (
      <Chip size="sm" className={cn('border-transparent bg-[linear-gradient(90deg,theme(colors.accent.100)_50%,theme(colors.mint)_50%)]', className)}>
        Admin · Teacher
      </Chip>
    );
  }
  return (
    <Chip size="sm" tone={role === 'admin' ? colors.accent[100] : colors.mint} className={cn('border-transparent', className)}>
      {role === 'admin' ? 'Admin' : 'Teacher'}
    </Chip>
  );
}
