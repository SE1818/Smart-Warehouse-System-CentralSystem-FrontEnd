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
          50: '#f5f7fa',
          100: '#e4ebf2',
          200: '#cddce9',
          300: '#a7c2da',
          400: '#7ba1c8',
          500: '#5881b2',
          600: '#436695',
          700: '#365179',
          800: '#304565',
          900: '#2c3b54',
          950: '#1e2637',
        }
      }
    },
  },
  plugins: [],
}
