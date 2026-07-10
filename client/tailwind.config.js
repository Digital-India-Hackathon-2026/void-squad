/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
        'headline-lg': ['Outfit', 'sans-serif'],
        'headline-md': ['Outfit', 'sans-serif'],
        'display-metrics': ['Outfit', 'sans-serif'],
        'metric-label': ['Outfit', 'sans-serif'],
        'body-lg': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'],
        'label-caps': ['Inter', 'sans-serif'],
      },
      fontSize: {
        'headline-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '500' }],
        'display-metrics': ['48px', { lineHeight: '52px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'metric-label': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-caps': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '700' }],
      },
      colors: {
        // Stitch Obsidian design system
        primary: '#4edea3',
        'primary-fixed': '#6ffbbe',
        'primary-fixed-dim': '#4edea3',
        'primary-container': '#10b981',
        'on-primary': '#003824',
        'on-primary-fixed': '#002113',
        'on-primary-fixed-variant': '#005236',
        'on-primary-container': '#00422b',
        'inverse-primary': '#006c49',

        secondary: '#ffb95f',
        'secondary-fixed': '#ffddb8',
        'secondary-fixed-dim': '#ffb95f',
        'secondary-container': '#ee9800',
        'on-secondary': '#472a00',
        'on-secondary-fixed': '#2a1700',
        'on-secondary-fixed-variant': '#653e00',
        'on-secondary-container': '#5b3800',

        tertiary: '#ffb3ad',
        'tertiary-fixed': '#ffdad7',
        'tertiary-fixed-dim': '#ffb3ad',
        'tertiary-container': '#ff7a73',
        'on-tertiary': '#68000a',
        'on-tertiary-fixed': '#410004',
        'on-tertiary-fixed-variant': '#930013',
        'on-tertiary-container': '#79000e',

        error: '#ffb4ab',
        'error-container': '#93000a',
        'on-error': '#690005',
        'on-error-container': '#ffdad6',

        background: '#0f131d',
        'on-background': '#dfe2f1',

        surface: '#0f131d',
        'surface-dim': '#0f131d',
        'surface-bright': '#353944',
        'surface-tint': '#4edea3',
        'surface-variant': '#313540',
        'surface-container': '#1c1f2a',
        'surface-container-low': '#171b26',
        'surface-container-lowest': '#0a0e18',
        'surface-container-high': '#262a35',
        'surface-container-highest': '#313540',
        'on-surface': '#dfe2f1',
        'on-surface-variant': '#bbcabf',
        'inverse-surface': '#dfe2f1',
        'inverse-on-surface': '#2c303b',

        outline: '#86948a',
        'outline-variant': '#3c4a42',

        // Legacy compat
        bg: {
          primary: '#0B0F19',
          secondary: '#161D30',
          card: '#1E2640',
        },
        accent: {
          green: '#10B981',
          amber: '#F59E0B',
          red: '#EF4444',
          blue: '#3B82F6',
          purple: '#8B5CF6',
        },
        border: {
          subtle: 'rgba(255,255,255,0.08)',
          medium: 'rgba(255,255,255,0.15)',
        },
      },
      spacing: {
        'safe-margin': '20px',
        gutter: '16px',
        xs: '8px',
        sm: '16px',
        md: '24px',
        lg: '32px',
        xl: '48px',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
      animation: {
        'scan-line': 'scan-line 3s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
      },
      keyframes: {
        'scan-line': {
          '0%': { transform: 'translateY(0)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
        fadeInUp: {
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'ambient-grid':
          'linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
