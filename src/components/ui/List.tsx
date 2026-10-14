import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

/** One white card holding rows split by hairlines. Every list of people or requests uses it. */
export function ListGroup({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className={cn('divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-sm', className)}
      {...props}
    />
  );
}

/** Padding for a row inside a ListGroup, so every list lines up the same */
export const listRow = 'px-4 py-3.5 sm:px-5';
