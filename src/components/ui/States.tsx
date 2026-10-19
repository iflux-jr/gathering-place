import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Button } from './Button';
import { SkeletonRow } from './Skeleton';

interface StateProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Decorative illustration or icon */
  icon?: ReactNode;
  className?: string;
}

function StateFrame({ title, description, action, icon, className, tone, iconTone }: StateProps & { tone: string; iconTone: string }) {
  return (
    <div className={cn('grid justify-items-center gap-1.5 rounded-card px-6 py-10 text-center', tone, className)}>
      {icon && (
        <div aria-hidden="true" className={cn('mb-2 grid h-10 w-10 place-items-center rounded-full [&_svg]:h-5 [&_svg]:w-5', iconTone)}>
          {icon}
        </div>
      )}
      <h3 className="font-heading text-h2 text-ink">{title}</h3>
      {description && <p className="max-w-[46ch] text-small text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Nothing to show yet, with a next step where there is one */
export function EmptyState(props: StateProps) {
  return <StateFrame {...props} tone="glass" iconTone="bg-accent-50 text-accent-600" />;
}

interface ErrorStateProps extends Omit<StateProps, 'title'> {
  title?: ReactNode;
  onRetry?: () => void;
}

/** Something failed: say what, and offer a retry */
export function ErrorState({ title = 'This didn’t load', description, onRetry, action, ...rest }: ErrorStateProps) {
  return (
    <div role="alert">
      <StateFrame
        {...rest}
        title={title}
        description={description ?? 'Check your connection, then try again.'}
        action={action ?? (onRetry && <Button variant="outline" onClick={onRetry}>Try again</Button>)}
        tone="border border-bad-fg/15 bg-bad-bg/70"
        iconTone="bg-white text-bad-fg"
      />
    </div>
  );
}

/** Confirmation after an action completed */
export function SuccessState(props: StateProps) {
  return (
    <div role="status">
      <StateFrame {...props} tone="border border-ok-fg/15 bg-ok-bg/70" iconTone="bg-white text-ok-fg" />
    </div>
  );
}

/** Skeleton rows plus a screen-reader status message */
export function LoadingList({ rows = 4, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div className="glass divide-y divide-line/70 overflow-hidden rounded-card" role="status" aria-live="polite">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}
