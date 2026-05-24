/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
        display: ['"Instrument Serif"', 'serif'],
      },
      colors: {
        // Surface scale — paper-warm dark
        ink: {
          950: '#0a0a09',
          900: '#111110',
          800: '#1c1b18',
          700: '#2a2925',
          600: '#3a3833',
          500: '#5a574f',
          400: '#7a766c',
          300: '#a39e8f',
          200: '#cfcabb',
          100: '#ebe6d6',
          50: '#f5f1e1',
        },
        // Restaff accent — warm terracotta
        flame: {
          DEFAULT: '#d96a3c',
          dark: '#a64a25',
          light: '#e88a5e',
        },
        priority: {
          a: '#7ec48a',
          b: '#e9c46a',
          c: '#e88a5e',
          d: '#6b6660',
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};
