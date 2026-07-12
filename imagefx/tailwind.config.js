/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        border: '#E5E7EB',
        surface: '#FAFAFA',
        muted: '#6B7280',
        danger: '#DC2626',
        success: '#16A34A',
      },
    },
  },
  plugins: [],
}
