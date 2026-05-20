import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page: '#0a0a0f',
        surface: '#14141f',
        surface2: '#1d1d2e',
        text1: '#f5f5f7',
        text2: '#a0a0b0',
        text3: '#6f6f80',
        accent: '#3b82f6',
        accent2: '#60a5fa',
        danger: '#ef4444',
        warning: '#f59e0b',
        success: '#10b981',
        seg: {
          external: '#888780',
          identity: '#7F77DD',
          finance: '#D85A30',
          engineering: '#1D9E75',
          sales: '#D4537E',
          it: '#378ADD',
          ot: '#E24B4A',
          endpoint: '#B4B2A9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        eyebrow: ['11px', { letterSpacing: '0.06em', lineHeight: '1.4' }],
        small: ['12px', { lineHeight: '1.45' }],
        body: ['14px', { lineHeight: '1.5' }],
        h2: ['16px', { lineHeight: '1.4' }],
        h1: ['22px', { lineHeight: '1.3' }],
        hero: ['32px', { lineHeight: '1.2' }],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      transitionDuration: {
        fast: '150ms',
        base: '280ms',
        slow: '600ms',
        cine: '1500ms',
      },
    },
  },
  plugins: [],
} satisfies Config;
