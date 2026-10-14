import { cva } from 'class-variance-authority';

/** Button classes, shared by <Button> and links styled as buttons */
export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-full border font-body font-semibold',
    'transition-colors duration-150 select-none whitespace-nowrap',
    'focus-visible:outline-none focus-visible:shadow-focus',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-ink border-ink text-white hover:bg-ink-3 hover:border-ink-3',
        dark:    'bg-ink border-ink text-white hover:bg-ink-3 hover:border-ink-3',
        outline: 'bg-surface border-line-strong text-ink hover:border-ink/40 hover:bg-subtle',
        ghost:   'bg-transparent border-transparent text-ink hover:bg-subtle',
        accent:  'bg-accent-300 border-accent-300 text-ink hover:bg-accent-100 hover:border-accent-100',
        danger:  'bg-surface border-bad-fg/40 text-bad-fg hover:bg-bad-bg',
      },
      size: {
        sm:   'min-h-[36px] px-4 text-small',
        md:   'min-h-touch px-5 text-[0.9375rem]',
        lg:   'min-h-[52px] px-6 text-body',
        icon: 'h-11 w-11 p-0',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);
