import { cva } from 'class-variance-authority';

/**
 * Button classes, shared by <Button> and links styled as buttons.
 * One primary (orange gradient, ink text: white on brand orange fails contrast) per screen.
 * Hover lifts a pixel and a press scales down; both are transforms, so they stay smooth.
 */
export const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-2 rounded-full border font-body font-semibold',
    'select-none whitespace-nowrap',
    'transition-transform duration-150 ease-calm active:scale-[.97] motion-reduce:transform-none',
    'focus-visible:outline-none focus-visible:shadow-focus',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-primary-gradient border-accent-600/25 text-ink',
          'shadow-[inset_0_1px_0_rgba(255,255,255,.45),0_1px_2px_rgba(90,56,37,.12),0_8px_20px_-6px_rgba(229,122,6,.55)]',
          'hover:-translate-y-px',
        ],
        dark:    'bg-ink border-ink text-white shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_8px_20px_-8px_rgba(43,27,18,.5)] hover:-translate-y-px hover:bg-ink-2',
        outline: 'bg-white/80 border-line-strong text-ink shadow-raised hover:-translate-y-px hover:border-ink/30 hover:bg-white',
        ghost:   'bg-transparent border-transparent text-ink hover:bg-ink/[.05]',
        accent:  'bg-accent-50 border-accent-300/70 text-ink shadow-raised hover:-translate-y-px hover:bg-accent-100',
        danger:  'bg-white/80 border-bad-fg/35 text-bad-fg shadow-raised hover:bg-bad-bg',
      },
      size: {
        sm:   'min-h-[38px] px-4 text-small',
        md:   'min-h-touch px-5 text-[0.9375rem]',
        lg:   'min-h-[54px] px-7 text-body',
        icon: 'h-11 w-11 p-0',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);
