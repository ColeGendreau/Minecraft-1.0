import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Minecraft-inspired palette
        mc: {
          dirt: '#8B5A2B',
          grass: '#5D8731',
          stone: '#7F7F7F',
          bedrock: '#1A1A1A',
          obsidian: '#0F0F1A',
          diamond: '#4AEDD9',
          emerald: '#17DD62',
          gold: '#FCEE4B',
          redstone: '#FF0000',
          lapis: '#1E5FA8',
          portal: '#8932B8',
        },
        // UI colors
        surface: {
          DEFAULT: '#0C0C14',
          raised: '#13131F',
          overlay: '#1A1A28',
          border: '#2A2A3E',
        },
        accent: {
          primary: '#4AEDD9',
          secondary: '#8932B8',
          success: '#17DD62',
          warning: '#FCEE4B',
          error: '#FF4757',
        },
        text: {
          primary: '#E8E8F0',
          secondary: '#8888A0',
          muted: '#5A5A70',
        }
      },
      fontFamily: {
        display: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': `
          linear-gradient(to right, rgba(42, 42, 62, 0.3) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(42, 42, 62, 0.3) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid': '24px 24px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(74, 237, 217, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(74, 237, 217, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
