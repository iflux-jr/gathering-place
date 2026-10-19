import { Logo } from '../brand/Logo';

/** Shown while Firebase restores the session and while a page's code downloads */
export default function SplashScreen({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center" role="status" aria-live="polite">
      <div className="glass grid h-24 w-24 place-items-center rounded-[30px]">
        <Logo variant="mark" height={52} className="animate-pulse-warm motion-reduce:animate-none" />
      </div>
      <span className="sr-only">{label}…</span>
    </div>
  );
}
