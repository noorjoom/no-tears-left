import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#000000',
          surface: '#0a0a0a',
          elevated: '#111111',
        },
        border: {
          DEFAULT: '#1f1f1f',
        },
        text: {
          primary: '#e8e8e8',
          muted: '#6b6b6b',
        },
        accent: {
          DEFAULT: '#a8c8e8',
          bright: '#c8e0f4',
        },
        chrome: '#d4d4d4',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        display: ['var(--font-display)', 'serif'],
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.7s ease-out both',
        'fade-in': 'fade-in 0.9s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
