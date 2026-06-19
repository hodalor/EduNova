/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0F1B3C',
          gold: '#F5A623',
          ink: '#10213F',
          mist: '#F5F7FB',
          line: '#D9E1F2',
        },
      },
      boxShadow: {
        panel: '0 18px 40px rgba(15, 27, 60, 0.08)',
      },
    },
  },
  plugins: [],
};
