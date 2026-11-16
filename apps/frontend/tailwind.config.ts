import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#E50914',
          hover: '#CC0812',
          light: '#FF1A25',
          glow: 'rgba(229, 9, 20, 0.15)',
        },
        surface: {
          canvas: '#0A0A0A',
          card: '#121212',
          popover: '#18181B',
          inset: '#0E0E10',
          elevated: '#222226',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.08)',
          emphasis: 'rgba(255, 255, 255, 0.16)',
        },
        text: {
          primary: '#FAFAFA',
          secondary: '#A1A1AA',
          muted: '#71717A',
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
