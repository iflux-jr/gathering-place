// src/theme/tokens.js
// Design tokens: the single source for colours, type, radii and shadows.
// Read by tailwind.config.js (utility classes) and by app code that needs raw
// values (charts, QR codes, the theme-color meta tag). Plain JS so both can import it.
//
// Contrast notes (WCAG 2.1): ink text on every surface and pastel is 13:1 or better;
// `muted` is 6:1 on white and 5.4:1 on canvas; every `strong` class colour and
// accent-600 pass 4.5:1 on white; white on ink is 18:1.

export const colors = {
  ink:     { DEFAULT: '#121214', 2: '#1F1F23', 3: '#2C2C31' },
  canvas:  '#F2F3F5',
  surface: '#FFFFFF',
  line:    { DEFAULT: '#E4E6EA', strong: '#CDD1D8', control: '#878B94' }, // control: input and checkbox edges, 3.4:1 on white
  muted:   '#5F636B',   // secondary text
  subtle:  '#EEF0F3',   // neutral chip / track fill
  // On-dark text for the top bar and dark panels
  onDark:  { DEFAULT: '#FFFFFF', muted: '#A6A8AE' },
  // Single accent: a calm blue. 300 fills light buttons (ink text), 600 is links and focus.
  accent:  { 50: '#EEF5FD', 100: '#DCEAFA', 300: '#A9CEF3', 500: '#5B9BE0', 600: '#1F64B0', 700: '#174F8C' },
  // Soft pastels for stat tiles and highlight cards, ink text on top
  butter:  '#FBEFC7',
  sky:     '#DCEBF8',
  lilac:   '#E4DCF8',
  pink:    '#F8DDEB',
  mint:    '#D6F2E8',
  peach:   '#FCE3D2',
  clay:    '#F1E4D3',
  // Status pairs: text colour on tint, all 5.2:1 or better
  ok:      { fg: '#146C43', bg: '#DDF3E6', solid: '#2BB673' },
  warn:    { fg: '#8A5A00', bg: '#FDF0C8' },
  bad:     { fg: '#B42318', bg: '#FDE4E1' },
  info:    { fg: '#1F64B0', bg: '#DCEAFA' },
  neutral: { fg: '#4B4F57', bg: '#EEF0F3' },
};

/**
 * Class colour palette. Each class stores a `colorKey`; `surface` fills cards and
 * chips (ink text on top), `strong` is for dots, icons and chart marks on white.
 * The last four keys are spares for classes the admin adds later.
 */
export const classPalette = {
  sky:    { surface: '#DCEBF8', strong: '#1D6FA3', label: 'Sky' },
  pink:   { surface: '#F8DDEB', strong: '#B8336A', label: 'Pink' },
  lilac:  { surface: '#E4DCF8', strong: '#6A4FF0', label: 'Lilac' },
  mint:   { surface: '#D6F2E8', strong: '#0E7C6B', label: 'Mint' },
  butter: { surface: '#FBEFC7', strong: '#986F00', label: 'Butter' },
  lime:   { surface: '#EAF3C8', strong: '#5E7300', label: 'Lime' },
  peach:  { surface: '#FCE3D2', strong: '#C2410C', label: 'Peach' },
  clay:   { surface: '#F1E4D3', strong: '#8C5523', label: 'Clay' },
  // spares
  aqua:   { surface: '#D5F0F4', strong: '#0B7285', label: 'Aqua' },
  rose:   { surface: '#FBE0E0', strong: '#C0392B', label: 'Rose' },
  sage:   { surface: '#E2EEDA', strong: '#3F7A2E', label: 'Sage' },
  stone:  { surface: '#ECEAE5', strong: '#5F5A50', label: 'Stone' },
};

export const fonts = {
  display: ['DM Sans', 'Segoe UI', 'system-ui', 'sans-serif'],
  body:    ['DM Sans', 'Segoe UI', 'system-ui', 'sans-serif'],
  mono:    ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
};

/** Type scale: [font-size, { lineHeight, fontWeight?, letterSpacing? }] — mobile sizes; md: steps up in components */
export const fontSize = {
  caption:   ['0.75rem',   { lineHeight: '1rem' }],      // 12
  small:     ['0.875rem',  { lineHeight: '1.3rem' }],    // 14
  body:      ['1rem',      { lineHeight: '1.6rem' }],    // 16
  h3:        ['1.0625rem', { lineHeight: '1.5rem',  fontWeight: '600', letterSpacing: '-0.01em' }],  // 17
  h2:        ['1.25rem',   { lineHeight: '1.75rem', fontWeight: '600', letterSpacing: '-0.015em' }], // 20
  h1:        ['1.625rem',  { lineHeight: '2rem',    fontWeight: '600', letterSpacing: '-0.025em' }], // 26
  display:   ['2rem',      { lineHeight: '2.25rem', fontWeight: '600', letterSpacing: '-0.03em' }],  // 32
  'h2-lg':   ['1.375rem',  { lineHeight: '1.875rem', fontWeight: '600', letterSpacing: '-0.015em' }], // 22
  'h1-lg':   ['2rem',      { lineHeight: '2.375rem', fontWeight: '600', letterSpacing: '-0.025em' }], // 32
  'display-lg': ['2.75rem', { lineHeight: '3rem',   fontWeight: '600', letterSpacing: '-0.035em' }], // 44
};

export const radius = {
  xs: '6px', sm: '10px', md: '14px', lg: '20px', xl: '28px',
};

export const shadow = {
  sm:    '0 1px 2px rgba(16,24,40,.05)',
  md:    '0 6px 20px rgba(16,24,40,.08)',
  lg:    '0 24px 48px rgba(16,24,40,.18)',
  focus: '0 0 0 2px #FFFFFF, 0 0 0 4px #1F64B0',
};
