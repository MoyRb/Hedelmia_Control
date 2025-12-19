/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#f8c4a4',
        secondary: '#efe6c6',
        accent: '#dec3cd',
        highlight: '#f0f0b7',
        surface: '#fcf2e4',
        background: '#d0d0d8',
        texto: '#2f2f2f'
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif']
      }
    }
  }
};
