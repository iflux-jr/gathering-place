import { colors, classPalette, fonts, fontSize, radius, shadow } from './src/theme/tokens.js';

// Class palette as utilities: bg-class-sky, text-class-sky-strong, …
const classColors = Object.fromEntries(
  Object.entries(classPalette).map(([key, v]) => [key, { DEFAULT: v.surface, strong: v.strong }])
);

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ...colors,
        class: classColors,
      },
      fontFamily: {
        // Headings use the UI face too (the workspace look); Bricolage is kept for brand moments
        heading: fonts.body,
        display: fonts.display,
        body:    fonts.body,
        mono:    fonts.mono,
      },
      fontSize,
      boxShadow: {
        sm:     shadow.sm,
        md:     shadow.md,
        lg:     shadow.lg,
        glow:   shadow.glow,
        raised: shadow.raised,
        inset:  shadow.inset,
        focus:  shadow.focus,
      },
      borderWidth: { 1.5: '1.5px' },
      minHeight: { touch: '44px' },
      minWidth:  { touch: '44px' },
      transitionTimingFunction: { calm: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      animation: {
        'fade-in':   'fadeIn 0.18s cubic-bezier(0.22,1,0.36,1)',
        'pulse-warm':'pulseWarm 2.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        pulseWarm: { '0%,100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.6, transform: 'scale(.94)' } },
      },
      borderRadius: {
        xs:      radius.xs,
        control: radius.sm,
        md:      radius.md,
        card:    radius.lg,
        frame:   radius.xl,
      },
    },
  },
  plugins: [],
}
