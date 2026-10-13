import { cva } from 'class-variance-authority';

/** Button classes, shared by <Button> and links styled as buttons */
export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-full border-1.5 font-body font-bold',
    'transition-colors duration-150 select-none whitespace-nowrap',
    'focus-visible:outline-none focus-visible:shadow-focus',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-flame-600 border-flame-600 text-white hover:bg-flame-700 hover:border-flame-700',
        dark:    'bg-ink border-ink text-white hover:bg-ink-2',
        outline: 'bg-surface border-ink text-ink hover:bg-canvas',
        ghost:   'bg-transparent border-transparent text-ink hover:bg-subtle',
        lime:    'bg-lime border-ink text-ink hover:bg-lime-50',
        danger:  'bg-surface border-bad-fg text-bad-fg hover:bg-bad-bg',
      },
      size: {
        sm:   'min-h-[36px] px-3.5 text-small',
        md:   'min-h-touch px-5 text-[0.9375rem]',
        lg:   'min-h-[52px] px-6 text-body',
        icon: 'h-11 w-11 p-0',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);
