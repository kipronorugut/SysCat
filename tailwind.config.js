/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{ts,tsx}',
    './public/index.html',
  ],
  theme: {
    extend: {
      colors: {
        'syscat-orange': '#FF6B35',
        'syscat-dark': '#0F172A',
        'syscat-slate': '#1E293B',
      },
      fontFamily: {
        'heading': ['Outfit', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'body': ['Outfit', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-in': 'slideIn 0.4s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};

