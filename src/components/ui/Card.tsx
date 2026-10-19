import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Fill colour, e.g. a class surface from getClassColor(); defaults to frosted glass */
  tone?: string;
  /** Plain translucent panel with no blur, for blocks inside another card */
  quiet?: boolean;
  /** Lifts with a soft glow on hover; for cards that are links or buttons */
  interactive?: boolean;
  as?: 'div' | 'section' | 'article';
}

/** The base surface. Top-level cards are glass; nested ones should be quiet so blurs never stack. */
export function Card({ tone, quiet = false, interactive = false, as: Tag = 'div', className, style, ...props }: CardProps) {
  const toneStyle: CSSProperties | undefined = tone ? { backgroundColor: tone, ...style } : style;
  return (
    <Tag
      className={cn(
        'min-w-0 rounded-card p-4 sm:p-5 lg:p-6',
        quiet ? 'border border-white/70 bg-white/55 shadow-sm'
          : tone ? 'border border-white/60 shadow-md'
          : 'glass',
        interactive && 'lift',
        className,
      )}
      style={toneStyle}
      {...props}
    />
  );
}
