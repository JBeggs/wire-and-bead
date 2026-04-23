/** @type {import('tailwindcss').Config} */

// Semantic token helper: Tailwind consumes CSS variables that hold space-separated
// RGB triplets (e.g. `184 115 51`), so `rgb(var(--x) / <alpha-value>)` works with
// opacity modifiers like `bg-primary/50`.
const rgbVar = (name) => `rgb(var(${name}) / <alpha-value>)`

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Semantic font families driven by the active theme.
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-heading)', 'Georgia', 'serif'],
        heading: ['var(--font-heading)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        // Legacy aliases the existing codebase references.
        inter: ['var(--font-body)', 'system-ui', 'sans-serif'],
        playfair: ['var(--font-heading)', 'Georgia', 'serif'],
      },
      colors: {
        // --- Semantic tokens (used by new code) ---
        bg: rgbVar('--color-bg'),
        surface: rgbVar('--color-surface'),
        'surface-raised': rgbVar('--color-surface-raised'),
        primary: {
          DEFAULT: rgbVar('--color-primary'),
          hover: rgbVar('--color-primary-hover'),
        },
        secondary: rgbVar('--color-secondary'),
        accent: rgbVar('--color-accent'),
        'border-default': rgbVar('--color-border'),
        ring: rgbVar('--color-ring'),

        // --- Legacy aliases (keep existing components working) ---
        // Vintage scale -> maps to primary/bg/accent so old classes still work
        vintage: {
          primary: rgbVar('--color-primary'),
          'primary-dark': rgbVar('--color-primary-hover'),
          background: rgbVar('--color-bg'),
          accent: rgbVar('--color-accent'),
          'accent-dark': rgbVar('--color-accent'),
        },
        // Modern scale -> maps to secondary/surface/accent
        modern: {
          primary: rgbVar('--color-secondary'),
          'primary-dark': rgbVar('--color-secondary'),
          background: rgbVar('--color-surface'),
          accent: rgbVar('--color-accent'),
          'accent-dark': rgbVar('--color-accent'),
        },
        // Text scale
        text: {
          DEFAULT: rgbVar('--color-text'),
          light: rgbVar('--color-text-muted'),
          muted: rgbVar('--color-text-muted'),
        },
      },
      borderRadius: {
        card: 'var(--radius-card)',
        button: 'var(--radius-button)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
