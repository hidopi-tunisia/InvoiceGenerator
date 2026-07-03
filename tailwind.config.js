/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Bleu primaire unique de l'app (indigo-600) — utiliser bg-primary /
        // text-primary / border-primary plutôt que des indigo-*/blue-* épars.
        primary: {
          DEFAULT: '#4f46e5',
          light: '#6366f1',
          dark: '#4338ca',
        },
      },
    },
  },
  plugins: [],
};
