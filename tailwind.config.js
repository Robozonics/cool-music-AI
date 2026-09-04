/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Satoshi', 'Inter', 'sans-serif'],
      },
      colors: {
        obsidian: '#06060A',
        'acid-lime': '#A3E635',
        'electric-fuchsia': '#EC4899',
        'cyber-cyan': '#06B6D4',
        'electric-violet': '#8B5CF6',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
}
