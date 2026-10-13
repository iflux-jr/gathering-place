// src/theme/tokens.js
// Design tokens: the single source for colours, type, radii and shadows.
// Read by tailwind.config.js (utility classes) and by app code that needs raw
// values (charts, QR codes, the theme-color meta tag). Plain JS so both can import it.
//
// Contrast notes (WCAG 2.1): every pastel surface carries ink text at 11:1 or better;
// every `strong` colour passes 4.5:1 on white; flame-600 carries white text at 4.7:1.

export const colors = {
  ink:     { DEFAULT: '#1B1A17', 2: '#2E2C29' },
  canvas:  '#F6F4EE',
  surface: '#FFFFFF',
  line:    { DEFAULT: '#E4E0D6', strong: '#CFCABD' },
  muted:   '#6B675E',   // secondary text, 5.6:1 on white
  subtle:  '#ECEAE4',   // neutral chip / track fill
  flame:   { 50: '#FFF3EF', 500: '#FF5A36', 600: '#D23F17', 700: '#B13512' },
  lime:    { DEFAULT: '#E4F77A', 50: '#F7FCDA' },
  violet:  { DEFAULT: '#6A4FF0', 50: '#F4F0FF', 100: '#EDE8FF', 700: '#5B3FE0' },
  butter:  '#FFE27A',
  sky:     '#BDE3F7',
  lilac:   '#D9C8FF',
  pink:    '#FFC9DE',
  mint:    '#BFEFE6',
  peach:   '#FFC7B3',
  clay:    '#F5D9B8',
  // Status pairs: text colour on tint, all 5.2:1 or better
  ok:      { fg: '#146C43', bg: '#DCF5E7', solid: '#2BB673' },
  warn:    { fg: '#8A5A00', bg: '#FFF1C2' },
  bad:     { fg: '#B42318', bg: '#FFE4E0' },
  info:    { fg: '#5B3FE0', bg: '#EDE8FF' },
  neutral: { fg: '#4F4C45', bg: '#ECEAE4' },
};

/**
 * Class colour palette. Each class stores a `colorKey`; `surface` fills cards and
 * chips (ink text on top), `strong` is for dots, icons and chart marks on white.
 * The last four keys are spares for classes the admin adds later.
 */
export const classPalette = {
  sky:    { surface: '#BDE3F7', strong: '#1D6FA3', label: 'Sky' },
  pink:   { surface: '#FFC9DE', strong: '#B8336A', label: 'Pink' },
  lilac:  { surface: '#D9C8FF', strong: '#6A4FF0', label: 'Lilac' },
  mint:   { surface: '#BFEFE6', strong: '#0E7C6B', label: 'Mint' },
  butter: { surface: '#FFE27A', strong: '#986F00', label: 'Butter' },
  lime:   { surface: '#E4F77A', strong: '#5E7300', label: 'Lime' },
  peach:  { surface: '#FFC7B3', strong: '#C2410C', label: 'Peach' },
  clay:   { surface: '#F5D9B8', strong: '#8C5523', label: 'Clay' },
  // spares
  aqua:   { surface: '#B5ECF5', strong: '#0B7285', label: 'Aqua' },
  rose:   { surface: '#FFD1D1', strong: '#C0392B', label: 'Rose' },
  sage:   { surface: '#D4E8C8', strong: '#3F7A2E', label: 'Sage' },
  stone:  { surface: '#E3DED4', strong: '#5F5A50', label: 'Stone' },
};

export const fonts = {
  display: ['Outfit', 'Avenir Next', 'Segoe UI', 'system-ui', 'sans-serif'],
  body:    ['Plus Jakarta Sans', 'Segoe UI', 'system-ui', 'sans-serif'],
  mono:    ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
};

/** Type scale: [font-size, { lineHeight, fontWeight?, letterSpacing? }] — mobile sizes; md: steps up in components */
export const fontSize = {
  caption:   ['0.75rem',   { lineHeight: '1rem' }],      // 12
  small:     ['0.875rem',  { lineHeight: '1.3rem' }],    // 14
  body:      ['1rem',      { lineHeight: '1.6rem' }],    // 16
  h3:        ['1.125rem',  { lineHeight: '1.5rem',  fontWeight: '600' }],                            // 18
  h2:        ['1.375rem',  { lineHeight: '1.75rem', fontWeight: '700' }],                            // 22
  h1:        ['1.75rem',   { lineHeight: '2rem',    fontWeight: '700', letterSpacing: '-0.015em' }], // 28
  display:   ['2rem',      { lineHeight: '2.15rem', fontWeight: '800', letterSpacing: '-0.02em' }],  // 32
  'h2-lg':   ['1.625rem',  { lineHeight: '2rem',    fontWeight: '700' }],                            // 26
  'h1-lg':   ['2.125rem',  { lineHeight: '2.5rem',  fontWeight: '700', letterSpacing: '-0.015em' }], // 34
  'display-lg': ['2.75rem', { lineHeight: '2.9rem', fontWeight: '800', letterSpacing: '-0.02em' }],  // 44
};

export const radius = {
  xs: '6px', sm: '12px', md: '16px', lg: '20px', xl: '28px',
};

export const shadow = {
  sm:    '0 1px 2px rgba(27,26,23,.06)',
  md:    '0 8px 24px rgba(27,26,23,.10)',
  lg:    '0 24px 48px rgba(27,26,23,.18)',
  focus: '0 0 0 2px #FFFFFF, 0 0 0 5px #6A4FF0',
};
