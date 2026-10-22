import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../packages/shared/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: 'hsl(var(--bg))',
        'bg-subtle': 'hsl(var(--bg-subtle))',
        'bg-muted': 'hsl(var(--bg-muted))',
        'bg-inverse': 'hsl(var(--bg-inverse))',
        fg: 'hsl(var(--fg))',
        'fg-muted': 'hsl(var(--fg-muted))',
        'fg-subtle': 'hsl(var(--fg-subtle))',
        border: 'hsl(var(--border))',
        'border-strong': 'hsl(var(--border-strong))',
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          hover: 'hsl(var(--accent-hover))',
          subtle: 'hsl(var(--accent-subtle))',
          fg: 'hsl(var(--accent-fg))',
        },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        danger: 'hsl(var(--danger))',
        info: 'hsl(var(--info))',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 hsl(30 20% 20% / 0.04)',
        sm: '0 1px 3px 0 hsl(30 20% 20% / 0.06), 0 1px 2px -1px hsl(30 20% 20% / 0.04)',
        md: '0 4px 8px -2px hsl(30 20% 20% / 0.06), 0 2px 4px -2px hsl(30 20% 20% / 0.04)',
        lg: '0 10px 24px -4px hsl(30 20% 20% / 0.08), 0 4px 8px -4px hsl(30 20% 20% / 0.04)',
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '20px' }],
        base: ['14px', { lineHeight: '22px' }],
        md: ['15px', { lineHeight: '24px' }],
        lg: ['16px', { lineHeight: '24px' }],
        xl: ['18px', { lineHeight: '28px' }],
        '2xl': ['20px', { lineHeight: '28px' }],
        '3xl': ['24px', { lineHeight: '32px' }],
        '4xl': ['30px', { lineHeight: '36px' }],
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        out: 'cubic-bezier(0, 0, 0.2, 1)',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
