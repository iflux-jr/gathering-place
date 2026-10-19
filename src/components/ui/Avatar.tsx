import { cn } from '../../lib/cn';
import { classPalette } from '../../theme/tokens.js';
import { initials } from '../../lib/initials';

const fills = Object.values(classPalette).map(c => c.surface);

function fillFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return fills[h % fills.length];
}

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  /** Override the fill, e.g. with a class surface colour */
  tone?: string;
  className?: string;
}

const sizes = { sm: 'h-8 w-8 text-caption', md: 'h-10 w-10 text-small', lg: 'h-14 w-14 text-h3' };

/** Initials on a pastel circle. Decorative: the name is always shown beside it. */
export function Avatar({ name, size = 'md', tone, className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('grid flex-none place-items-center rounded-full font-heading font-bold text-ink ring-2 ring-white/80', sizes[size], className)}
      style={{ backgroundColor: tone ?? fillFor(name) }}
    >
      {initials(name)}
    </span>
  );
}
