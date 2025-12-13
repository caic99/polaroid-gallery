/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
    './types.ts'
  ],
  theme: {
    extend: {
      colors: {
        'polaroid-red': '#f5262e',
        'polaroid-orange': '#f78a22',
        'polaroid-yellow': '#fde024',
        'polaroid-green': '#279d52',
        'polaroid-blue': '#0073c2'
      }
    }
  },
  plugins: []
};
