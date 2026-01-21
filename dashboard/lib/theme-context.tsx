'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'day' | 'night';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDay: boolean;
  isNight: boolean;
}

// Default values for SSR and initial render
const defaultContext: ThemeContextType = {
  theme: 'day',
  toggleTheme: () => {},
  isDay: true,
  isNight: false,
};

const ThemeContext = createContext<ThemeContextType>(defaultContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('day');
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('minecraft-theme') as Theme;
    if (savedTheme === 'day' || savedTheme === 'night') {
      setTheme(savedTheme);
    }
    setMounted(true);
  }, []);

  // Save theme to localStorage when it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('minecraft-theme', theme);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'day' ? 'night' : 'day');
  };

  // Always provide context, even during SSR (with defaults)
  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      isDay: theme === 'day',
      isNight: theme === 'night'
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Theme color utilities
export const themeColors = {
  day: {
    skyGradient: 'from-sky-400 via-sky-300 to-emerald-200',
    grassGradient: 'from-green-500 to-green-600',
    dirtGradient: 'from-amber-700 to-amber-800',
    cardBg: 'bg-white/90 backdrop-blur',
    cardBorder: 'border-amber-400',
    textPrimary: 'text-amber-900',
    textSecondary: 'text-amber-800',
    textMuted: 'text-amber-700',
    accent: 'emerald',
    accentBg: 'bg-emerald-100',
    accentBorder: 'border-emerald-400',
    accentText: 'text-emerald-700',
  },
  night: {
    skyGradient: 'from-slate-900 via-purple-900 to-slate-800',
    grassGradient: 'from-emerald-900 to-emerald-950',
    dirtGradient: 'from-stone-800 to-stone-900',
    cardBg: 'bg-stone-800/90 backdrop-blur',
    cardBorder: 'border-stone-600',
    textPrimary: 'text-white',
    textSecondary: 'text-gray-200',
    textMuted: 'text-gray-400',
    accent: 'emerald',
    accentBg: 'bg-emerald-900/50',
    accentBorder: 'border-emerald-700',
    accentText: 'text-emerald-400',
  }
};
