import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

/** One card holding rows split by hairlines. Every list of people or requests uses it. */
export function ListGroup({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className={cn('glass divide-y divide-line/70 overflow-hidden rounded-card', className)}
      {...props}
    />
  );
}

/** Padding for a row inside a ListGroup, so every list lines up the same */
export const listRow = 'px-4 py-3';
