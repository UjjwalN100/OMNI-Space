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
        omni: {
          teal: '#16A085',
          navy: '#0d131f',
        }
      }
    },
  },
  plugins: [],
}
