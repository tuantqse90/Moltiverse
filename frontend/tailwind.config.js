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
      colors: {
        // Monad Brand Colors
        monad: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd7fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#6e54ff', // Primary Monad Purple
          700: '#5b3fd9',
          800: '#4c1d95',
          900: '#0e091c', // Monad Dark
        },
        // Legacy lobster (keeping for compatibility)
        lobster: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Monad accent colors
        ocean: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#85e6ff', // Monad Cyan
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        accent: {
          pink: '#ff8ee4',
          orange: '#ffae45',
          cyan: '#85e6ff',
        },
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
        'pulse-fast': 'pulse 1s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #6e54ff, 0 0 10px #6e54ff, 0 0 15px #6e54ff' },
          '100%': { boxShadow: '0 0 10px #6e54ff, 0 0 20px #6e54ff, 0 0 30px #6e54ff' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
