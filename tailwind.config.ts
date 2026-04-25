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
    },
  },
  plugins: [],
};

export default config;
