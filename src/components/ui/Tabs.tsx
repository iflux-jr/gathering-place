import { useId, type ReactNode } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/cn';
import { ease, motion, spring } from '../motion/config';

export interface TabItem {
  value: string;
  label: ReactNode;
  /** Optional count shown in a small badge, e.g. pending items */
  count?: number;
}

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  items: TabItem[];
  /** Accessible name for the tab list */
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * Segmented tabs with arrow-key navigation (Radix). A tinted block slides to the active tab.
 * Scrolls sideways on narrow screens.
 */
export function Tabs({ value, onValueChange, items, label, children, className }: TabsProps) {
  const indicatorId = useId();
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange} className={className}>
      <TabsPrimitive.List
        aria-label={label}
        className="flex max-w-full gap-1 overflow-x-auto rounded-[10px] border border-line bg-white p-1 sm:inline-flex"
      >
        {items.map(item => {
          const active = item.value === value;
          return (
            <TabsPrimitive.Trigger
              key={item.value}
              value={item.value}
              className={cn(
                'relative inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] px-3 sm:min-h-[32px] sm:flex-none',
                'font-body text-small font-semibold',
                'focus-visible:outline-none focus-visible:shadow-focus',
                active ? 'text-ink' : 'text-muted hover:text-ink',
              )}
            >
              {active && (
                <motion.span
                  layoutId={indicatorId}
                  className="absolute inset-0 rounded-[7px] bg-subtle"
                  transition={spring}
                  aria-hidden="true"
                />
              )}
              <span className="relative">{item.label}</span>
              {item.count ? (
                <span className="relative rounded-full bg-accent-500 px-1.5 py-0.5 text-[0.6875rem] font-bold leading-none text-ink tabular-nums">
                  {item.count}
                </span>
              ) : null}
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  );
}

export function TabPanel({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  return (
    <TabsPrimitive.Content value={value} className={cn('mt-4 focus-visible:outline-none', className)}>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease }}>
        {children}
      </motion.div>
    </TabsPrimitive.Content>
  );
}
