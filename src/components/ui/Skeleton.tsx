import { cn } from '../../lib/cn';

/** Placeholder block shown while data loads. Hidden from screen readers; pair with a status message. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block rounded-[10px] bg-[linear-gradient(90deg,#ECEAE4_0%,#F6F4EE_50%,#ECEAE4_100%)] bg-[length:200%_100%]',
        'animate-shimmer motion-reduce:animate-none',
        className,
      )}
    />
  );
}

/** A list-row shaped skeleton: avatar, two text lines, action */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-md border border-line bg-surface p-3', className)} aria-hidden="true">
      <Skeleton className="h-10 w-10 flex-none rounded-full" />
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-11 w-24 rounded-full" />
    </div>
  );
}
