/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 12px 40px -12px rgb(15 23 42 / 0.18)',
        'card-dark': '0 1px 2px rgb(0 0 0 / 0.4), 0 24px 60px -20px rgb(0 0 0 / 0.7)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(12px) scale(.96)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .2s ease-out both',
        'pop-in': 'pop-in .22s cubic-bezier(.16,1,.3,1) both',
        'slide-up': 'slide-up .3s cubic-bezier(.16,1,.3,1) both',
        'toast-in': 'toast-in .25s cubic-bezier(.16,1,.3,1) both',
      },
    },
  },
  plugins: [],
}
