// src/theme/tokens.js
// Design tokens: the single source for colour, type, radius, shadow, glass and motion.
// Read by tailwind.config.js (utility classes) and by app code that needs raw values
// (charts, QR codes, the theme-color meta tag, Motion transitions). Plain JS so both can import it.
//
// Brand board: Soft Cream #F2E9DF, Orange #E57A06, Brown #5A3825.
// Contrast notes (WCAG 2.1, checked by scripts against white, cream and the worst-case
// glass tint): ink is 15:1, muted 6.9:1; orange buttons carry ink text (5.7:1) because
// white on brand orange is 2.95:1; accent-600 is the orange used for text and focus (5.1:1 on cream).

export const brand = {
  cream:  '#F2E9DF',
  orange: '#E57A06',
  brown:  '#5A3825',
};

export const colors = {
  brand,
  // Text and dark fills, warm browns rather than black
  ink:     { DEFAULT: '#2B1B12', 2: '#3B2417', 3: '#5A3825' },
  // App background: warm off-white; glass panels float over it
  canvas:  '#FAF6F1',
  cream:   { DEFAULT: '#F2E9DF', 50: '#FAF6F1', 100: '#F5EEE6' },
  surface: '#FFFFFF',
  line:    { DEFAULT: '#EADFD3', strong: '#D9C8B6', control: '#9C7F6A' }, // control: input and toggle edges, 3.6:1 on white
  muted:   '#6B4F3E',   // secondary text, 6.9:1 on white
  subtle:  '#F3EBE2',   // quiet fills and tracks
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

/** Type scale: [font-size, { lineHeight, fontWeight?, letterSpacing? }] — mobile sizes; md: steps up in components */
export const fontSize = {
  label:     ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],  // 11, mono caps
  caption:   ['0.75rem',   { lineHeight: '1rem' }],      // 12
  small:     ['0.875rem',  { lineHeight: '1.3rem' }],    // 14
  body:      ['1rem',      { lineHeight: '1.6rem' }],    // 16
  h3:        ['1.0625rem', { lineHeight: '1.5rem',  fontWeight: '650', letterSpacing: '-0.01em' }],  // 17
  h2:        ['1.25rem',   { lineHeight: '1.75rem', fontWeight: '700', letterSpacing: '-0.015em' }], // 20
  h1:        ['1.75rem',   { lineHeight: '2.125rem', fontWeight: '750', letterSpacing: '-0.025em' }], // 28
  display:   ['2.25rem',   { lineHeight: '2.5rem',  fontWeight: '800', letterSpacing: '-0.03em' }],  // 36
  'h2-lg':   ['1.375rem',  { lineHeight: '1.875rem', fontWeight: '700', letterSpacing: '-0.015em' }], // 22
  'h1-lg':   ['2.25rem',   { lineHeight: '2.625rem', fontWeight: '750', letterSpacing: '-0.03em' }], // 36
  'display-lg': ['3rem',   { lineHeight: '3.25rem', fontWeight: '800', letterSpacing: '-0.035em' }], // 48
};

export const radius = {
  // controls 14, inner panels 18, cards 24, sheets and floating nav 30
  xs: '8px', sm: '14px', md: '18px', lg: '24px', xl: '30px',
};

// Layered, low-opacity shadows tinted with brand brown; never black
export const shadow = {
  sm:    '0 1px 2px rgba(90,56,37,.06), 0 2px 6px rgba(90,56,37,.05)',
  md:    '0 2px 4px rgba(90,56,37,.04), 0 8px 20px rgba(90,56,37,.08), 0 20px 40px -12px rgba(90,56,37,.10)',
  lg:    '0 4px 8px rgba(90,56,37,.05), 0 16px 36px rgba(90,56,37,.12), 0 40px 80px -20px rgba(90,56,37,.20)',
  // Lifted card on hover: a soft orange glow under the usual shadow
  glow:  '0 2px 4px rgba(90,56,37,.04), 0 14px 32px rgba(90,56,37,.10), 0 0 0 1px rgba(229,122,6,.10), 0 12px 40px -8px rgba(229,122,6,.22)',
  // Raised (neumorphic) controls: light from above, warm shade below
  raised: 'inset 0 1px 0 rgba(255,255,255,.9), 0 1px 2px rgba(90,56,37,.08), 0 4px 10px -2px rgba(90,56,37,.10)',
  // Pressed wells such as segmented-control tracks
  inset: 'inset 0 1px 2px rgba(90,56,37,.10), inset 0 -1px 0 rgba(255,255,255,.7)',
  focus: '0 0 0 2px #FFFFFF, 0 0 0 4px #A35300',
};

/** Frosted panels. Only top-level surfaces blur; anything inside a panel uses a plain fill. */
export const glass = {
  fill:      'rgba(255,255,255,.66)',
  fillStrong:'rgba(255,255,255,.82)',
  border:    'rgba(255,255,255,.75)',
  edge:      'rgba(90,56,37,.08)',   // hairline outside the white highlight, so edges stay visible
  blur:      '18px',
  blurPhone: '12px',
  // Where backdrop blur isn't supported the panel is solid
  fallback:  '#FFFCF8',
};

/** Motion: calm and short. Durations in seconds for Motion, ms for CSS. */
export const motion = {
  fast: 0.15, base: 0.24, slow: 0.4,
  ease: [0.22, 1, 0.36, 1],
  spring: { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 },
  springSoft: { type: 'spring', stiffness: 260, damping: 30 },
};
