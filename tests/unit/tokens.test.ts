// Guards WCAG AA contrast for every token pairing the components rely on,
// so a palette tweak can't quietly make text unreadable.
import { describe, expect, it } from 'vitest';
import { classPalette, colors } from '../../src/theme/tokens.js';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const AA = 4.5;
const WHITE = '#FFFFFF';

describe('design token contrast (WCAG AA)', () => {
  it.each(Object.entries(classPalette))('class colour %s: ink on surface, strong on white', (_key, c) => {
    expect(contrast(colors.ink.DEFAULT, c.surface)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.strong, WHITE)).toBeGreaterThanOrEqual(AA);
  });

  it.each(['ok', 'warn', 'bad', 'info', 'neutral'] as const)('status %s text on its tint', key => {
    expect(contrast(colors[key].fg, colors[key].bg)).toBeGreaterThanOrEqual(AA);
  });

  it('primary button and body text pairs', () => {
    expect(contrast(WHITE, colors.flame[600])).toBeGreaterThanOrEqual(AA);
    expect(contrast(WHITE, colors.flame[700])).toBeGreaterThanOrEqual(AA);
    expect(contrast(colors.ink.DEFAULT, colors.canvas)).toBeGreaterThanOrEqual(AA);
    expect(contrast(colors.muted, colors.canvas)).toBeGreaterThanOrEqual(AA);
    expect(contrast(colors.muted, WHITE)).toBeGreaterThanOrEqual(AA);
    expect(contrast(colors.ink.DEFAULT, colors.lime.DEFAULT)).toBeGreaterThanOrEqual(AA);
    expect(contrast(colors.ink.DEFAULT, colors.flame[500])).toBeGreaterThanOrEqual(AA);
    expect(contrast(WHITE, colors.ink.DEFAULT)).toBeGreaterThanOrEqual(AA);
  });
});
