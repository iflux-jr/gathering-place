// src/theme/classes.ts
// Colour lookup for vocational classes. Each class has a colorKey into classPalette.
// Today the keys come from DEFAULT_CLASS_COLORS; once classes live in Firestore
// (admin can add and remove them), a stored colorKey takes precedence.

import { classPalette } from './tokens.js';

export type ClassColorKey = keyof typeof classPalette;

export const CLASS_COLOR_KEYS = Object.keys(classPalette) as ClassColorKey[];

/** Colours for the original eight classes, by class ID */
export const DEFAULT_CLASS_COLORS: Record<string, ClassColorKey> = {
  'computer':   'sky',
  'make-up':    'pink',
  'wig-making': 'lilac',
  'barbing':    'mint',
  'baking':     'butter',
  'resin-art':  'lime',
  'nail-tech':  'peach',
  'tailoring':  'clay',
};

export interface ClassColor {
  key: ClassColorKey;
  /** Card and chip fill; ink text on top */
  surface: string;
  /** Dots, icons and chart marks on white */
  strong: string;
}

function hashKey(id: string): ClassColorKey {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CLASS_COLOR_KEYS[h % CLASS_COLOR_KEYS.length];
}

/** Resolve a class's colours from an explicit key, the defaults, or a stable hash of its ID */
export function getClassColor(classId: string, colorKey?: string | null): ClassColor {
  const key = (colorKey && colorKey in classPalette ? colorKey : DEFAULT_CLASS_COLORS[classId] ?? hashKey(classId)) as ClassColorKey;
  const { surface, strong } = classPalette[key];
  return { key, surface, strong };
}
