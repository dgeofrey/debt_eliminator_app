/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/client/**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Montserrat', 'system-ui', 'sans-serif'],
        serif:   ['Fraunces', 'Georgia', 'serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        numeric: ['Calibri', 'Trebuchet MS', 'Verdana', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      colors: {
        // Premium dark theme - warmer and deeper than slate-950
        ink: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'softer': '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        'card': '0 2px 8px -2px rgb(0 0 0 / 0.06), 0 1px 3px -1px rgb(0 0 0 / 0.04)',
        'glow-emerald': '0 0 0 1px rgb(16 185 129 / 0.2), 0 8px 24px -8px rgb(16 185 129 / 0.4)',
      },
    },
  },
  plugins: [],
};
