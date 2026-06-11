/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'primary-dark': '#1B4332',
        'primary-mid': '#1a5c45',
        'primary-light': '#2D6A4F',
        'accent': '#52B788',
        'secondary': '#1A759F',
      },
    },
  },
  plugins: [],
}
