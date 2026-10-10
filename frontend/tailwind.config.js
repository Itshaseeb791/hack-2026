/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'mobile': '640px',
        'tablet': '768px',
        'desktop': '1024px',
      },
      spacing: {
        'touch-target': '44px',
      },
      fontSize: {
        'mobile-min': '14px',
      },
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        surface: '#ffffff',
        canvas: '#f8fafc',
        border: '#e2e8f0',
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        info: '#2563eb',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        modal: '0 20px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
