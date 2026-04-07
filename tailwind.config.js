/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          900: '#02040a',
          800: '#0a0f1c',
          700: '#111827',
        },
        neon: {
          blue: '#00f0ff',
          white: '#ffffff',
          dark: '#005fcc',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
