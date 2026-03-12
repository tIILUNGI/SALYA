/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: "#1162d4",
        "background-light": "#f6f7f8",
        "background-dark": "#101822",
      },
      fontFamily: {
        display: ["Inter"],
      },
    },
  },
  plugins: [],
}
