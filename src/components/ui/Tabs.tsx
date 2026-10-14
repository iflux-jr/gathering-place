import type { ReactNode } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/cn';

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

/** Pill tabs with arrow-key navigation (Radix). Scrolls sideways on narrow screens. */
export function Tabs({ value, onValueChange, items, label, children, className }: TabsProps) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange} className={className}>
      <TabsPrimitive.List aria-label={label} className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-subtle p-1 sm:inline-flex">
        {items.map(item => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              'inline-flex min-h-[36px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 sm:flex-none',
              'font-body text-small font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:shadow-focus',
              'data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-sm',
              'data-[state=inactive]:text-muted data-[state=inactive]:hover:text-ink',
            )}
          >
            {item.label}
            {item.count ? (
              <span className="rounded-full bg-accent-600 px-1.5 py-0.5 text-caption font-semibold leading-none text-white tabular-nums">
                {item.count}
              </span>
            ) : null}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  );
}

export function TabPanel({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  return (
    <TabsPrimitive.Content value={value} className={cn('mt-5 focus-visible:outline-none', className)}>
      {children}
    </TabsPrimitive.Content>
  );
}
