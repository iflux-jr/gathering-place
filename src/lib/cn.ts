import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import { fontSize } from '../theme/tokens.js';

// Our type scale (text-small, text-h1, …) must be registered as font sizes; otherwise
// tailwind-merge reads "text-small" as a colour and drops a colour like "text-ink" next to it.
// Custom shadows and radii are registered so a later one replaces an earlier one.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: Object.keys(fontSize) }],
      shadow: [{ shadow: ['raised', 'inset', 'glow', 'focus'] }],
      rounded: [{ rounded: ['control', 'card', 'frame'] }],
    },
  },
});

/** Join class names and let later Tailwind utilities override earlier ones */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
