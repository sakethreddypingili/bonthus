/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primaryNavy: '#000000',
        accentTeal: '#333333',
        accentOrange: '#666666',
        accentGold: '#999999',
        textDark: '#000000',
        grayLight: '#F5F5F5',
        white: '#FFFFFF',
        // Brand aliases for consistency
        brand: '#000000',
        'brand-teal': '#333333',
        'brand-grey': '#F5F5F5',
        'brand-grey-border': '#E5E7EB',
        // Admin-specific aliases
        primary: '#000000',
        teal: '#333333',
        orange: '#666666',
        gold: '#999999',
        dark: '#000000',
        light: '#F8F9FB',
        'primary-light': '#1a1a1a',
        'teal-light': '#f0f0f0',
        'orange-light': '#f5f5f5',
        border: '#E5E7EB',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        lenskart: '0 1px 4px 0 rgba(0,0,0,0.1)',
        float: '0 4px 12px 0 rgba(0,0,0,0.1)',
        card: '0 1px 4px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};
