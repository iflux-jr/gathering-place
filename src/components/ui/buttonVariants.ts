import { cva } from 'class-variance-authority';

/**
 * Button classes, shared by <Button> and links styled as buttons.
 * Primary is brand brown with white text. Accent is the orange fill (ink text: white on brand
 * orange fails contrast). 44px tall on phones, 38px from 640px up.
 */
export const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-1.5 rounded-control border font-body font-semibold',
    'select-none whitespace-nowrap',
    'transition-colors duration-150 active:scale-[.98] motion-reduce:transform-none',
    'focus-visible:outline-none focus-visible:shadow-focus',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary border-primary text-white hover:bg-primary-hover',
        // Kept for older call sites; same as primary in the workspace look
        dark:    'bg-primary border-primary text-white hover:bg-primary-hover',
        outline: 'bg-white border-line-strong text-ink hover:bg-canvas',
        ghost:   'bg-transparent border-transparent text-ink hover:bg-ink/[.05]',
        accent:  'bg-accent-500 border-accent-500 text-ink hover:bg-accent-400',
        danger:  'bg-white border-bad-fg/35 text-bad-fg hover:bg-bad-bg',
      },
      size: {
        sm:   'min-h-[36px] px-3 text-small sm:min-h-[32px]',
        md:   'min-h-touch px-4 text-body sm:min-h-[38px]',
        lg:   'min-h-[48px] px-5 text-body',
        icon: 'h-11 w-11 p-0 sm:h-9 sm:w-9',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);
