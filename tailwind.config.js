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
        'heading': ['Playfair Display', 'serif'],
        'secondary': ['Cormorant Garamond', 'serif'],
        'body': ['Lora', 'serif'],
      },
    },
  },
  plugins: [],
};

