// Shared Motion components, so every screen moves the same way: calm, short, transform and
// opacity only. MotionConfig reducedMotion="user" (main.jsx) turns the movement into plain
// fades when the device asks for reduced motion. Settings and hooks live in ./config.
import { useEffect, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { animate, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { motion as m } from '../../theme/tokens.js';
import { ease, motion, riseItem, staggerContainer } from './config';

/** Route content: fades in with a slight rise each time the page changes */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: m.slow, ease }}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = ComponentPropsWithoutRef<typeof motion.div> & { as?: 'div' | 'ul' | 'ol' };

/** Parent that reveals its <StaggerItem> children one after another */
export function Stagger({ as = 'div', ...props }: StaggerProps) {
  const Tag = as === 'ul' ? motion.ul : as === 'ol' ? motion.ol : motion.div;
  return <Tag variants={staggerContainer} initial="hidden" animate="show" {...(props as object)} />;
}

type StaggerItemProps = ComponentPropsWithoutRef<typeof motion.div> & { as?: 'div' | 'li' | 'section' };

export function StaggerItem({ as = 'div', ...props }: StaggerItemProps) {
  const Tag = as === 'li' ? motion.li : as === 'section' ? motion.section : motion.div;
  return <Tag variants={riseItem} {...(props as object)} />;
}

/** A number that counts up to its value, e.g. dashboard stats. Screen readers get the final value. */
export function AnimatedNumber({ value, suffix = '', className }: { value: number; suffix?: string; className?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, v => `${Math.round(v)}${suffix}`);
  useEffect(() => {
    if (reduce) { mv.set(value); return; }
    const controls = animate(mv, value, { duration: 0.9, ease });
    return () => controls.stop();
  }, [value, reduce, mv]);
  return (
    <span className={className}>
      <span className="sr-only">{value}{suffix}</span>
      <motion.span aria-hidden="true">{text}</motion.span>
    </span>
  );
}
