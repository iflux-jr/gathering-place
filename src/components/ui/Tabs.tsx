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
      <TabsPrimitive.List aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {items.map(item => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              'inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-full border-1.5 border-ink px-4',
              'font-body text-small font-bold transition-colors',
              'focus-visible:outline-none focus-visible:shadow-focus',
              'data-[state=active]:bg-ink data-[state=active]:text-white',
              'data-[state=inactive]:bg-surface data-[state=inactive]:text-ink data-[state=inactive]:hover:bg-canvas',
            )}
          >
            {item.label}
            {item.count ? (
              <span className="rounded-full bg-flame-500 px-1.5 py-0.5 text-caption font-bold leading-none text-ink">
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
