/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './docs/**/*.{md,mdx}',
    './blog/**/*.{md,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0091FF',
          dark: '#0070CC',
          light: '#33A9FF',
        },
        success: '#00D084',
        warning: '#FFB84D',
        error: '#FF5656',
        code: {
          bg: '#1E1E1E',
          text: '#D4D4D4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
