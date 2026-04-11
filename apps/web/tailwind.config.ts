import type { Config } from 'tailwindcss'

/**
 * Tailwind configuration for Webhookey with Uber-inspired design system
 * Palette: Uber Black (#000000), Pure White (#ffffff), Grayscale system
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Uber color palette
        'uber-black': '#000000',
        'uber-white': '#ffffff',
        'body-gray': '#4b4b4b',
        'muted-gray': '#afafaf',
        'chip-gray': '#efefef',
        'hover-gray': '#e2e2e2',
        'hover-light': '#f3f3f3',
        // Semantic colors mapped to CSS variables
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        pill: '999px',
        card: '8px',
        'card-featured': '12px',
      },
      boxShadow: {
        // Uber whisper shadows
        'card': '0 4px 16px 0 rgba(0, 0, 0, 0.12)',
        'card-elevated': '0 4px 16px 0 rgba(0, 0, 0, 0.16)',
        'floating': '0 2px 8px 0 rgba(0, 0, 0, 0.16)',
        'button-pressed': 'inset 0 0 0 999px rgba(0, 0, 0, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'display': ['52px', { lineHeight: '1.23', fontWeight: '700' }],
        'heading': ['36px', { lineHeight: '1.22', fontWeight: '700' }],
        'section': ['24px', { lineHeight: '1.33', fontWeight: '700' }],
        'card-title': ['32px', { lineHeight: '1.25', fontWeight: '700' }],
        'ui': ['14px', { lineHeight: '1.43', fontWeight: '500' }],
        'caption': ['14px', { lineHeight: '1.43', fontWeight: '400' }],
        'micro': ['12px', { lineHeight: '1.67', fontWeight: '400' }],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
