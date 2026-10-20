// A student's name that opens their profile. Used wherever a student is named.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { studentPath } from '../../lib/studentPath';

export function StudentLink({ id, children, className }: { id?: string | null; children: ReactNode; className?: string }) {
  if (!id) return <span className={className}>{children}</span>;
  return (
    <Link to={studentPath(id)}
      className={cn('rounded-[4px] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:shadow-focus', className)}>
      {children}
    </Link>
  );
}
