import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { getClassColor } from '../../theme/classes';
import { CLASS_LABELS } from '../../utils/constants';
import { colors } from '../../theme/tokens.js';

const chipBase = 'inline-flex items-center gap-1.5 rounded-full border-1.5 border-ink font-body font-semibold whitespace-nowrap';
const chipSizes = { sm: 'px-2.5 py-1 text-caption', md: 'px-3 py-1.5 text-small' };

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  size?: keyof typeof chipSizes;
  tone?: string;
}

/** Static pill label */
export function Chip({ size = 'md', tone, className, style, ...props }: ChipProps) {
  return (
    <span
      className={cn(chipBase, chipSizes[size], !tone && 'bg-surface', className)}
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
        chipBase, 'min-h-[36px] px-3.5 text-small transition-colors',
        'focus-visible:outline-none focus-visible:shadow-focus',
        selected ? 'bg-ink text-white' : 'bg-surface text-ink hover:bg-canvas',
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
  const color = getClassColor(classId, colorKey);
  const name = label ?? (CLASS_LABELS as Record<string, string>)[classId] ?? classId;
  return <Chip size={size} tone={color.surface} className={cn('text-ink', className)}>{name}</Chip>;
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
    <span className={cn('inline-flex items-center gap-1.5 rounded-full font-body font-semibold whitespace-nowrap', chipSizes[size], s.cls, className)}>
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
      <Chip size="sm" className={cn('bg-[linear-gradient(90deg,theme(colors.lilac)_50%,theme(colors.lime.DEFAULT)_50%)]', className)}>
        Admin · Teacher
      </Chip>
    );
  }
  return (
    <Chip size="sm" tone={role === 'admin' ? colors.lilac : colors.lime.DEFAULT} className={className}>
      {role === 'admin' ? 'Admin' : 'Teacher'}
    </Chip>
  );
}
