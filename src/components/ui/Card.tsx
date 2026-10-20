import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Fill colour, e.g. a class surface from getClassColor(); defaults to white */
  tone?: string;
  /** Light-filled block for use inside another card */
  quiet?: boolean;
  /** Border darkens with a soft shadow on hover; for cards that are links or buttons */
  interactive?: boolean;
  as?: 'div' | 'section' | 'article';
}

/** The base surface: a white card with a hairline border. Nested blocks use quiet (a light fill). */
export function Card({ tone, quiet = false, interactive = false, as: Tag = 'div', className, style, ...props }: CardProps) {
  const toneStyle: CSSProperties | undefined = tone ? { backgroundColor: tone, ...style } : style;
  return (
    <Tag
      className={cn(
        'min-w-0 rounded-card p-4 lg:p-5',
        quiet ? 'border border-line bg-canvas/60'
          : tone ? 'border border-black/[.04]'
          : 'glass',
        interactive && 'lift',
        className,
      )}
      style={toneStyle}
      {...props}
    />
  );
}
