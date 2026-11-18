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
          canvas: '#09090B',
          card: '#111114',
          pill: 'rgba(15, 15, 18, 0.72)',
          popover: '#18181B',
          inset: '#0E0E10',
          elevated: '#1F1F24',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.07)',
          emphasis: 'rgba(255, 255, 255, 0.14)',
          glow: 'rgba(229, 9, 20, 0.3)',
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
      boxShadow: {
        pill: '0 16px 36px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'pill-hover': '0 20px 45px -10px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.15)',
        'card-glow': '0 8px 30px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
