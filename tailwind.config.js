/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9ddfe',
          300: '#7cc0fd',
          400: '#369dfa',
          500: '#0062FF', // VORA Electric Cobalt (Primary Core)
          600: '#0052cc',
          700: '#0042a8',
          800: '#003585',
          900: '#0a2560',
          950: '#061840',
        },
        vora: {
          primary: '#0062FF', // 1. Màu Chủ Đạo: Electric Cobalt
          cyan: '#00D2FF',    // 2. Màu Phụ Thuộc 1: Cyber Cyan
          navy: '#0A192F',    // 3. Màu Phụ Thuộc 2: Midnight Navy
          slate: '#64748B',   // 4. Màu Phụ Thuộc 3: Steel Slate
          glow: '#00D2FF',
          dark: '#0052cc',
          deep: '#061224',
        },
        neon: {
          DEFAULT: '#00D2FF',
          glow: '#38BDF8',
          hover: '#00BFFF',
          dark: '#0062FF',
        },
        studio: {
          bg: '#0A192F',
          surface: '#0F203C',
          card: 'rgba(255, 255, 255, 0.03)',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-hover': 'rgba(0, 210, 255, 0.35)',
        },
        slate: {
          850: '#151f32',
          900: '#0f172a',
          950: '#020617',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Outfit"', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"Outfit"', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'vora-glow': '0 0 30px -5px rgba(0, 98, 255, 0.45)',
        'vora-cyan-glow': '0 0 35px -5px rgba(0, 210, 255, 0.5)',
        'neon-glow': '0 0 30px -5px rgba(0, 210, 255, 0.45)',
        'neon-glow-lg': '0 0 50px -5px rgba(0, 98, 255, 0.55)',
        'glass-card': '0 20px 50px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
