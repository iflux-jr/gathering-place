import type { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../../lib/cn';
import { AnimatePresence, motion, useMediaQuery } from '../motion/config';
import { motion as m } from '../../theme/tokens.js';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons row, pinned to the bottom of the sheet */
  footer?: ReactNode;
  /** Wider panel for detail views */
  size?: 'md' | 'lg';
}

const ease = m.ease as [number, number, number, number];

/**
 * Modal dialog. On phones it slides up as a bottom sheet; from 640px it is a centred panel
 * that scales in. Radix handles focus trapping, Escape to close, scroll locking and
 * returning focus; Motion animates it in and out.
 */
export function Dialog({ open, onOpenChange, title, description, children, footer, size = 'md' }: DialogProps) {
  const wide = useMediaQuery('(min-width: 640px)');
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            {/* Content sits inside the overlay so it can be centred with grid */}
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 grid items-end bg-ink/35 sm:place-items-center sm:p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: m.base, ease }}
              >
                <DialogPrimitive.Content asChild forceMount {...(description ? {} : { 'aria-describedby': undefined })}>
                  <motion.div
                    className={cn(
                      'glass-strong flex max-h-[92dvh] w-full flex-col focus:outline-none',
                      'rounded-t-frame pb-[env(safe-area-inset-bottom)] sm:rounded-frame sm:pb-0',
                      size === 'md' ? 'sm:max-w-lg' : 'sm:max-w-2xl',
                    )}
                    initial={wide ? { opacity: 0, scale: 0.96, y: 8 } : { y: '100%' }}
                    animate={wide ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
                    exit={wide ? { opacity: 0, scale: 0.97, y: 4 } : { y: '100%' }}
                    transition={wide ? { duration: m.base, ease } : { duration: 0.34, ease }}
                  >
                    <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-ink/15 sm:hidden" aria-hidden="true" />
                    <div className="flex items-start gap-3 px-5 pt-4 sm:px-6 sm:pt-6">
                      <div className="grid min-w-0 flex-1 gap-1">
                        <DialogPrimitive.Title className="font-heading text-h2 text-ink">{title}</DialogPrimitive.Title>
                        {description && (
                          <DialogPrimitive.Description className="text-small text-muted">{description}</DialogPrimitive.Description>
                        )}
                      </div>
                      <DialogPrimitive.Close
                        className="-mr-2 -mt-1 grid h-11 w-11 flex-none place-items-center rounded-full text-ink transition-transform hover:bg-ink/[.06] active:scale-95 focus-visible:outline-none focus-visible:shadow-focus"
                        aria-label="Close"
                      >
                        <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                      </DialogPrimitive.Close>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
                    {footer && (
                      <div className="flex flex-col-reverse gap-2 border-t border-line/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                        {footer}
                      </div>
                    )}
                  </motion.div>
                </DialogPrimitive.Content>
              </motion.div>
            </DialogPrimitive.Overlay>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
