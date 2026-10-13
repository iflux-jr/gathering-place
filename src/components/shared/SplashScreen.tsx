import { Logo } from '../brand/Logo';

/** Shown while Firebase restores the session and while a page's code downloads */
export default function SplashScreen({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-canvas" role="status" aria-live="polite">
      <div className="grid justify-items-center gap-5">
        <Logo variant="mark" height={64} className="animate-pulse-warm motion-reduce:animate-none" />
        <span className="sr-only">{label}…</span>
      </div>
    </div>
  );
}
