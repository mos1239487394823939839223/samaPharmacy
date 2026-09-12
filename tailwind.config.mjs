/** @type {import('tailwindcss').Config} */
export default {
  content: ['./apps/renderer/index.html', './apps/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
