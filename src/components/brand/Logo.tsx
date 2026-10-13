// The only place brand files are referenced. To swap in the real logo, replace the
// SVGs in src/assets/brand/ (same file names) — see src/assets/brand/README.md.
import markUrl from '../../assets/brand/mark.svg';
import wordmarkUrl from '../../assets/brand/wordmark.svg';
import wordmarkOnDarkUrl from '../../assets/brand/wordmark-on-dark.svg';
import { cn } from '../../lib/cn';

interface LogoProps {
  /** mark: symbol only · wordmark: name only · lockup: symbol + name side by side */
  variant?: 'mark' | 'wordmark' | 'lockup';
  /** Background the logo sits on */
  on?: 'light' | 'dark';
  /** Height in pixels; widths follow each file's own proportions */
  height?: number;
  className?: string;
  /**
   * Set when the logo is the only content of a link or heading, so it is read out.
   * Otherwise the logo is decorative and hidden from screen readers.
   */
  label?: string;
}

export function Logo({ variant = 'lockup', on = 'light', height = 32, className, label }: LogoProps) {
  const wordmark = on === 'dark' ? wordmarkOnDarkUrl : wordmarkUrl;
  const alt = label ?? '';

  if (variant === 'mark') {
    return <img src={markUrl} alt={alt} height={height} style={{ height }} className={cn('w-auto', className)} />;
  }
  if (variant === 'wordmark') {
    return <img src={wordmark} alt={alt} height={height} style={{ height }} className={cn('w-auto', className)} />;
  }
  return (
    <span className={cn('inline-flex items-center', className)} style={{ gap: Math.round(height * 0.3) }}>
      <img src={markUrl} alt={alt} height={height} style={{ height }} className="w-auto" />
      <img src={wordmark} alt="" height={height * 0.55} style={{ height: height * 0.55 }} className="w-auto" />
    </span>
  );
}
