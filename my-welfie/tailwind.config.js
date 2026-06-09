/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        // Keep in sync with src/style/tokens.ts → fonts.primary
        sans: ['Hanken Grotesk', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        wellness: {
          teal: '#14b8a6',
          'teal-dark': '#0f766e',
          mint: '#ecfdf5',
        },
      },
      boxShadow: {
        metric:
          '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 118, 110, 0.06)',
        'metric-hover':
          '0 4px 12px rgba(15, 23, 42, 0.08), 0 8px 28px rgba(15, 118, 110, 0.14)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
