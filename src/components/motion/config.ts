// Motion settings and hooks shared by the components in ./index.tsx and by screens.
import { useEffect, useState } from 'react';
import type { Transition, Variants } from 'motion/react';
import { motion as m } from '../../theme/tokens.js';

export const ease = m.ease as [number, number, number, number];
/** Snappy spring for indicators that slide between items (tabs, nav, toggles) */
export const spring = m.spring as Transition;

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.04 } },
};
export const riseItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease } },
};

/** True while the media query matches; used where phones and desktops animate differently */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

// `m` components with LazyMotion (main.jsx) keep the first download small: the animation
// features arrive in a separate file right after the app starts.
export * as motion from 'motion/react-m';
export { AnimatePresence } from 'motion/react';
