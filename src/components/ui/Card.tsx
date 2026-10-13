import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Fill colour, e.g. a class surface from getClassColor(); defaults to white */
  tone?: string;
  /** Drop the ink outline for nested or quiet cards */
  quiet?: boolean;
  as?: 'div' | 'section' | 'article';
}

export function Card({ tone, quiet = false, as: Tag = 'div', className, style, ...props }: CardProps) {
  const toneStyle: CSSProperties | undefined = tone ? { backgroundColor: tone, ...style } : style;
  return (
    <Tag
      className={cn(
        'min-w-0 rounded-card bg-surface p-4 sm:p-5 lg:p-6',
        quiet ? 'border border-line' : 'border-1.5 border-ink',
        className,
      )}
      style={toneStyle}
      {...props}
    />
  );
}
