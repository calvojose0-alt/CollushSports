/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        f1red: '#E8002D',
        f1dark: '#15151E',
        f1gray: '#1F1F2E',
        f1light: '#38383F',
        f1accent: '#FF8000',
        f1gold: '#FFD700',
        f1silver: '#C0C0C0',
        f1bronze: '#CD7F32',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
