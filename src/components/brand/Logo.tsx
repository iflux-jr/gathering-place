// The only place brand files are referenced. To swap in the real logo, replace the
// SVGs in src/assets/brand/ (same file names) — see src/assets/brand/README.md.
import markUrl from '../../assets/brand/mark.svg';
import markOnDarkUrl from '../../assets/brand/mark-on-dark.svg';
import wordmarkUrl from '../../assets/brand/wordmark.svg';
import wordmarkOnDarkUrl from '../../assets/brand/wordmark-on-dark.svg';
import iconUrl from '../../assets/brand/icon.svg';
import { cn } from '../../lib/cn';

interface LogoProps {
  /** mark: symbol only · wordmark: name only · lockup: symbol + name · favicon: the app icon tile */
  variant?: 'mark' | 'wordmark' | 'lockup' | 'favicon';
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
  const mark = on === 'dark' ? markOnDarkUrl : markUrl;
  const wordmark = on === 'dark' ? wordmarkOnDarkUrl : wordmarkUrl;
  const alt = label ?? '';
  const img = (src: string, h: number, a = alt, extra?: string) => (
    <img src={src} alt={a} height={h} style={{ height: h }} className={cn('w-auto', extra)} draggable={false} />
  );

  if (variant === 'mark') return img(mark, height, alt, className);
  if (variant === 'wordmark') return img(wordmark, height, alt, className);
  if (variant === 'favicon') return img(iconUrl, height, alt, cn('rounded-[22%]', className));
  return (
    <span className={cn('inline-flex items-center', className)} style={{ gap: Math.round(height * 0.28) }}>
      {img(mark, height)}
      {img(wordmark, Math.round(height * 1.02), '')}
    </span>
  );
}
