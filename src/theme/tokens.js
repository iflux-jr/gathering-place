// src/theme/tokens.js
// Design tokens: the single source for colour, type, radius, shadow and motion.
// Read by tailwind.config.js (utility classes) and by app code that needs raw values
// (charts, QR codes, the theme-color meta tag, Motion transitions). Plain JS so both can import it.
//
// Brand board: Soft Cream #F2E9DF, Orange #E57A06, Brown #5A3825.
// Workspace look: white cards with hairline borders on a light warm-grey canvas, a white
// sidebar, compact type (14px body). Brown is the primary action colour; orange marks badges,
// the active nav icon and focus.
// Contrast notes (WCAG 2.1): ink is 16:1 on white, muted 6.4:1; orange fills carry ink text
// because white on brand orange is 2.95:1; accent-600 is the orange used for text (5.1:1).

export const brand = {
  cream:  '#F2E9DF',
  orange: '#E57A06',
  brown:  '#5A3825',
};

export const colors = {
  brand,
  // Text and dark fills, warm browns rather than black
  ink:     { DEFAULT: '#1F1A17', 2: '#3C3531', 3: '#5A3825' },
  // App background: light warm grey; white cards sit on it
  canvas:  '#F6F5F3',
  cream:   { DEFAULT: '#F2E9DF', 50: '#FAF6F1', 100: '#F5EEE6' },
  surface: '#FFFFFF',
  line:    { DEFAULT: '#ECEAE6', strong: '#E2DFDA', control: '#8F857D' }, // control: input and toggle edges, 3.6:1 on white
  muted:   '#645C56',   // secondary text, 6.4:1 on white
  faint:   '#7A726C',   // tertiary text and section labels, 4.8:1 on white
  subtle:  '#F4EFE9',   // quiet fills, selected nav and segmented controls
  // Primary action: brand brown with white text (10:1)
  primary: { DEFAULT: '#5A3825', hover: '#4A2D1E' },
  onDark:  { DEFAULT: '#FFFFFF', muted: '#E2D5C7' },
  // Brand orange. 500 fills buttons (ink text on top), 600 is orange text, links and focus
  accent:  { 50: '#FEF6EC', 100: '#FCE6CC', 300: '#F6B566', 400: '#F09A32', 500: '#E57A06', 600: '#A35300', 700: '#8F4A00' },
  // Soft pastels for highlight tiles, ink text on top
  butter:  '#F8EBC6',
  sky:     '#DDE9F1',
  lilac:   '#E8DFF0',
  pink:    '#F6DEE3',
  mint:    '#DCEEE3',
  peach:   '#FBE2CF',
  clay:    '#EEE1D3',
  // Status pairs: text colour on tint, every pair 4.8:1 or better
  ok:      { fg: '#236B42', bg: '#E1F1E6', solid: '#2F8A57' },
  warn:    { fg: '#8A5300', bg: '#FBEBC8' },
  bad:     { fg: '#B3261E', bg: '#FBE3E0', solid: '#D23A2F' },
  info:    { fg: '#1A62A0', bg: '#E2EEF9' },
  neutral: { fg: '#6B5446', bg: '#EFE6DC' },
};

/**
 * Class colour palette. Each class stores a `colorKey`; the keys are unchanged so no data
 * changes. `surface` fills cards and chips (ink text on top), `strong` is for dots, icons and
 * chart marks on white. The last four keys are spares for classes the admin adds later.
 */
export const classPalette = {
  sky:    { surface: '#DCE9F2', strong: '#1E5A85', label: 'Sky' },
  pink:   { surface: '#F6DCE2', strong: '#9A2E4A', label: 'Pink' },
  lilac:  { surface: '#E6DDF0', strong: '#5B3D8A', label: 'Lilac' },
  mint:   { surface: '#D8EDE3', strong: '#1F6A4E', label: 'Mint' },
  butter: { surface: '#F7EAC4', strong: '#7A5600', label: 'Butter' },
  lime:   { surface: '#E5EDCB', strong: '#4D6316', label: 'Lime' },
  peach:  { surface: '#FADFCB', strong: '#9A4510', label: 'Peach' },
  clay:   { surface: '#EBDDCF', strong: '#6B4527', label: 'Clay' },
  // spares
  aqua:   { surface: '#D6ECEE', strong: '#1C6470', label: 'Aqua' },
  rose:   { surface: '#F5D9D4', strong: '#9A3328', label: 'Rose' },
  sage:   { surface: '#DFE8D6', strong: '#45603A', label: 'Sage' },
  stone:  { surface: '#E8E3DC', strong: '#5C5248', label: 'Stone' },
};

// Self-hosted through @fontsource (see main.jsx), so no request leaves for Google Fonts
export const fonts = {
  display: ['Bricolage Grotesque Variable', 'Segoe UI', 'system-ui', 'sans-serif'],
  body:    ['Plus Jakarta Sans Variable', 'Segoe UI', 'system-ui', 'sans-serif'],
  mono:    ['Space Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
};

/** Type scale: [font-size, { lineHeight, fontWeight?, letterSpacing? }]. Compact: 14px body, 22–24px titles */
export const fontSize = {
  label:     ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],  // 11, section labels in caps
  caption:   ['0.75rem',   { lineHeight: '1rem' }],      // 12
  small:     ['0.8125rem', { lineHeight: '1.25rem' }],   // 13, secondary text
  body:      ['0.875rem',  { lineHeight: '1.35rem' }],   // 14
  input:     ['1rem',      { lineHeight: '1.5rem' }],    // 16 on phones so iOS doesn't zoom
  h3:        ['0.9375rem', { lineHeight: '1.35rem', fontWeight: '600', letterSpacing: '-0.005em' }], // 15
  h2:        ['1rem',      { lineHeight: '1.5rem',  fontWeight: '600', letterSpacing: '-0.01em' }],  // 16, card titles
  h1:        ['1.25rem',   { lineHeight: '1.75rem', fontWeight: '700', letterSpacing: '-0.02em' }],  // 20
  display:   ['1.5rem',    { lineHeight: '1.875rem', fontWeight: '700', letterSpacing: '-0.02em' }], // 24, key figures
  'h2-lg':   ['1.0625rem', { lineHeight: '1.5rem',  fontWeight: '600', letterSpacing: '-0.01em' }],  // 17
  'h1-lg':   ['1.375rem',  { lineHeight: '1.875rem', fontWeight: '700', letterSpacing: '-0.02em' }], // 22, page titles
  'display-lg': ['1.75rem', { lineHeight: '2.125rem', fontWeight: '700', letterSpacing: '-0.025em' }], // 28
};

export const radius = {
  // controls 8, inner panels 9, cards 10, sheets 14
  xs: '6px', sm: '8px', md: '9px', lg: '10px', xl: '14px',
};

// Cards are flat with a hairline border; shadows only for things that float (menus, dialogs, toasts)
export const shadow = {
  sm:    '0 1px 2px rgba(31,26,23,.05)',
  md:    '0 2px 8px -4px rgba(31,26,23,.12)',
  lg:    '0 12px 32px -12px rgba(31,26,23,.28), 0 2px 6px rgba(31,26,23,.06)',
  // Hover on a clickable card
  glow:  '0 4px 12px -6px rgba(31,26,23,.18)',
  raised: '0 1px 2px rgba(31,26,23,.06)',
  inset: 'inset 0 1px 2px rgba(31,26,23,.06)',
  focus: '0 0 0 2px #FFFFFF, 0 0 0 4px #E57A06',
};

/** Motion: calm and short. Durations in seconds for Motion, ms for CSS. */
export const motion = {
  fast: 0.15, base: 0.24, slow: 0.4,
  ease: [0.22, 1, 0.36, 1],
  spring: { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 },
  springSoft: { type: 'spring', stiffness: 260, damping: 30 },
};
