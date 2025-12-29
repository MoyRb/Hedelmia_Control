/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#f7f2e8',
        mint: '#7ed6c1',
        blush: '#f3c7d5',
        coffee: '#4a3b35',
        accent: '#2e8b7d',
      },
      boxShadow: {
        card: '0 10px 25px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};
