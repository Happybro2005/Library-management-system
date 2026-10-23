/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mono: {
          black: '#000000',
          950: '#09090b',
          900: '#121215',
          850: '#18181b',
          800: '#27272a',
          700: '#3f3f46',
          600: '#52525b',
          500: '#71717a',
          400: '#a1a1aa',
          300: '#d4d4d8',
          200: '#e4e4e7',
          100: '#f4f4f5',
          50: '#fafafa',
          white: '#ffffff',
        },
        navy: {
          900: '#09090b',
          800: '#18181b',
          700: '#27272a',
        },
        primary: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#ffffff',
          700: '#e4e4e7',
        },
      },
      boxShadow: {
        'glow-white': '0 0 20px -3px rgba(255, 255, 255, 0.2)',
        'glow-subtle': '0 0 15px -3px rgba(255, 255, 255, 0.08)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.6)',
      }
    },
  },
  plugins: [],
}
