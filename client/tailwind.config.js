/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      colors: {
        // App palette
        bg: {
          primary: '#0B0F19',
          secondary: '#161D30',
          card: '#1E2640',
          glass: 'rgba(30, 38, 64, 0.6)',
        },
        accent: {
          green: '#10B981',
          amber: '#F59E0B',
          red: '#EF4444',
          blue: '#3B82F6',
          purple: '#8B5CF6',
        },
        border: {
          subtle: 'rgba(255,255,255,0.08)',
          medium: 'rgba(255,255,255,0.15)',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'card-gradient': 'linear-gradient(135deg, #1E2640 0%, #161D30 100%)',
      },
    },
  },
  plugins: [],
};
