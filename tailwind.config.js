/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fff2eb',
          100: '#ffe3d4',
          200: '#ffc7ab',
          300: '#ffa177',
          400: '#ff703d',
          500: '#e85d04',
          600: '#cc4900',
          700: '#a33400',
          800: '#802800',
          900: '#661f00',
          950: '#3d1000',
        }
      }
    },
  },
  plugins: [],
}
