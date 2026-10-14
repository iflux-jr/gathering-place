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
        // ── New design system (src/theme/tokens.js) ──
        ...colors,
        class: classColors,
      },
      fontFamily: {
        heading: fonts.display,
        body:    fonts.body,
        mono:    fonts.mono,
      },
      fontSize,
      boxShadow: {
        sm:    shadow.sm,
        md:    shadow.md,
        lg:    shadow.lg,
        focus: shadow.focus,
      },
      borderWidth: { 1.5: '1.5px' },
      minHeight: { touch: '44px' },
      minWidth:  { touch: '44px' },
      animation: {
        'fade-in':     'fadeIn 0.4s ease-out',
        'slide-up':    'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)',
        'slide-in':    'slideIn 0.4s cubic-bezier(0.16,1,0.3,1)',
        'slide-right': 'slideRight 0.4s cubic-bezier(0.16,1,0.3,1)',
        'scale-in':    'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)',
        'pulse-warm':  'pulseWarm 2.5s ease-in-out infinite',
        'shimmer':     'shimmer 2s linear infinite',
        'bounce-sm':   'bounceSm 0.6s ease-out',
      },
      keyframes: {
        fadeIn:     { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:    { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideIn:    { from: { opacity: 0, transform: 'translateX(-20px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        slideRight: { from: { opacity: 0, transform: 'translateX(20px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        scaleIn:    { from: { opacity: 0, transform: 'scale(0.93)' }, to: { opacity: 1, transform: 'scale(1)' } },
        pulseWarm:  { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.55 } },
        shimmer:    { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        bounceSm:   { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
      },
      borderRadius: {
        xs:    radius.xs,
        control: radius.sm,
        md:    radius.md,
        card:  radius.lg,
        frame: radius.xl,
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.75rem',
      },
    },
  },
  plugins: [],
}
