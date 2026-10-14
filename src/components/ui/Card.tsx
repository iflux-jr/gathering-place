import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Fill colour, e.g. a class surface from getClassColor(); defaults to white */
  tone?: string;
  /** Flat card on the canvas tint, for nested or secondary blocks */
  quiet?: boolean;
  as?: 'div' | 'section' | 'article';
}

export function Card({ tone, quiet = false, as: Tag = 'div', className, style, ...props }: CardProps) {
  const toneStyle: CSSProperties | undefined = tone ? { backgroundColor: tone, ...style } : style;
  return (
    <Tag
      className={cn(
        'min-w-0 rounded-card bg-surface p-4 sm:p-5 lg:p-6',
        quiet ? 'border border-line bg-canvas/60' : 'border border-line shadow-sm',
        tone && 'border-transparent',
        className,
      )}
      style={toneStyle}
      {...props}
    />
  );
}
