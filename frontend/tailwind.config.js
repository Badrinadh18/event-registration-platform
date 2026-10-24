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
          dark: '#0f172a', // Deep slate background
          card: '#1e293b', // Lighter slate for cards
          primary: '#4f46e5', // Indigo button color
          accent: '#8b5cf6', // Purple accent
        }
      }
    },
  },
  plugins: [],
}