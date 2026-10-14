import { cn } from '../../lib/cn';

/** Placeholder block shown while data loads. Hidden from screen readers; pair with a status message. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block rounded-control bg-[linear-gradient(90deg,#EEF0F3_0%,#F7F8FA_50%,#EEF0F3_100%)] bg-[length:200%_100%]',
        'animate-shimmer motion-reduce:animate-none',
        className,
      )}
    />
  );
}

/** A list-row shaped skeleton: avatar, two text lines, action. Sits inside a ListGroup. */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3.5 sm:px-5', className)} aria-hidden="true">
      <Skeleton className="h-10 w-10 flex-none rounded-full" />
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-9 w-20 rounded-full" />
    </div>
  );
}
