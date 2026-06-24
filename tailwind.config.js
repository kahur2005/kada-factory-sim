/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#1b1f27',
        panelAlt: '#232834',
        edge: '#333a47',
      },
    },
  },
  plugins: [],
};
