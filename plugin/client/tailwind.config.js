/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        'neu-text': 'var(--text-primary)',
        'neu-text-light': 'var(--text-secondary)',
        'neu-accent': 'var(--accent-start)',
        'neu-accent-hover': 'var(--accent-end)',
        glass: {
          1: 'var(--glass-1)',
          2: 'var(--glass-2)',
          3: 'var(--glass-3)',
          4: 'var(--glass-4)',
        },
        accent: {
          DEFAULT: 'var(--accent-start)',
          light: 'var(--accent-end)',
          dark: 'var(--accent-start)',
          violet: 'var(--accent-end)',
          glow: 'var(--accent-glow)',
          surface: 'var(--accent-surface)',
        },
        border: {
          glass: 'var(--border-glass)',
          'glass-hover': 'var(--border-glass-hover)',
          'glass-active': 'var(--border-glass-active)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          accent: 'var(--text-accent)',
        },
        status: {
          success: 'var(--status-success)',
          'success-bg': 'var(--status-success-bg)',
          error: 'var(--status-error)',
          'error-bg': 'var(--status-error-bg)',
          warning: 'var(--status-warning)',
          processing: 'var(--status-processing)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        syne: ['Syne', 'sans-serif'],
      },
      fontSize: {
        caption: ['11px', { lineHeight: '1.4', letterSpacing: '0.02em' }],
        body: ['13px', { lineHeight: '1.45', letterSpacing: '0.01em' }],
        subhead: ['14px', { lineHeight: '1.4', letterSpacing: '0.01em' }],
        heading: ['18px', { lineHeight: '1.3', letterSpacing: '0.02em' }],
        credit: ['20px', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        glass: '12px',
        'glass-sm': '8px',
        'glass-lg': '16px',
        pill: '9999px',
        neu: '20px',
      },
      backdropBlur: {
        glass: '20px',
        'glass-lg': '32px',
      },
      boxShadow: {
        glass: 'var(--shadow-glass)',
        'glass-lg': 'var(--shadow-glass-lg)',
        glow: 'var(--shadow-glow-sm)',
        'glow-lg': 'var(--shadow-glow-lg)',
        'neu-flat': 'var(--shadow-neu-flat)',
        'neu-pressed': 'var(--shadow-neu-pressed)',
        'neu-icon': 'var(--shadow-neu-icon)',
        'neu-button': 'var(--shadow-neu-button)',
        'neu-button-active': 'var(--shadow-neu-button-active)',
      },
      animation: {
        'pulse-slow': 'pulse-slow 1.5s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-out-right': 'slide-out-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
        'gradient-shift': 'gradient-shift 3s ease-in-out infinite',
        'orb-float-1': 'orb-float-1 8s ease-in-out infinite',
        'orb-float-2': 'orb-float-2 10s ease-in-out infinite',
        'orb-float-3': 'orb-float-3 12s ease-in-out infinite',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'orb-float-1': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -20px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 15px) scale(0.9)' },
        },
        'orb-float-2': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(-25px, 20px) scale(1.05)' },
          '66%': { transform: 'translate(15px, -25px) scale(0.95)' },
        },
        'orb-float-3': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(20px, 15px) scale(0.95)' },
          '66%': { transform: 'translate(-15px, -20px) scale(1.1)' },
        },
      },
    },
  },
  plugins: [],
};
