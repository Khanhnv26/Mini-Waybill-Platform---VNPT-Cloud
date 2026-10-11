/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./login.html",
    "./fleet-shipper-mockup.html",
    "./error.html",
    "./js/**/*.{js,html}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        vnpt: {
          50: '#eef6ff',
          100: '#d9ecff',
          200: '#bcdfff',
          500: '#0066cc',
          600: '#0055bb',
          700: '#004488',
          800: '#003366',
        }
      }
    },
  },
  plugins: [],
};
