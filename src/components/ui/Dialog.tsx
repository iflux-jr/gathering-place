import type { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../../lib/cn';

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

/**
 * Modal dialog. On phones it slides up as a bottom sheet; from 640px it is a centred panel.
 * Radix handles focus trapping, Escape to close, scroll locking and returning focus.
 */
export function Dialog({ open, onOpenChange, title, description, children, footer, size = 'md' }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Content sits inside the overlay so it can be centred with grid rather than a
            translate, which the entrance animation's transform would override */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-40 grid items-end bg-ink/50 sm:place-items-center sm:p-6',
            'data-[state=open]:animate-fade-in motion-reduce:animate-none',
          )}
        >
          <DialogPrimitive.Content
            className={cn(
              'flex max-h-[92dvh] w-full flex-col bg-surface shadow-lg focus:outline-none',
              'rounded-t-frame border-t-1.5 border-ink pb-[env(safe-area-inset-bottom)]',
              'sm:rounded-frame sm:border-1.5 sm:pb-0',
              size === 'md' ? 'sm:max-w-lg' : 'sm:max-w-2xl',
              'data-[state=open]:animate-slide-up sm:data-[state=open]:animate-scale-in motion-reduce:animate-none',
            )}
            {...(description ? {} : { 'aria-describedby': undefined })}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden="true" />
            <div className="flex items-start gap-3 px-5 pt-4 sm:px-6 sm:pt-6">
              <div className="grid min-w-0 flex-1 gap-1">
                <DialogPrimitive.Title className="font-heading text-h2 text-ink">{title}</DialogPrimitive.Title>
                {description && (
                  <DialogPrimitive.Description className="text-small text-muted">{description}</DialogPrimitive.Description>
                )}
              </div>
              <DialogPrimitive.Close
                className="-mr-2 -mt-1 grid h-11 w-11 flex-none place-items-center rounded-full text-ink hover:bg-subtle focus-visible:outline-none focus-visible:shadow-focus"
                aria-label="Close"
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </DialogPrimitive.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
            {footer && (
              <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                {footer}
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
