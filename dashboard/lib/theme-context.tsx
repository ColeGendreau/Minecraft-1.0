'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'day' | 'night';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDay: boolean;
  isNight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

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

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <>{children}</>;
  }

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
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme color utilities
export const themeColors = {
  day: {
    // Backgrounds
    skyGradient: 'from-sky-400 via-sky-300 to-emerald-200',
    grassGradient: 'from-green-500 to-green-600',
    dirtGradient: 'from-amber-700 to-amber-800',
    
    // Cards
    cardBg: 'bg-white/90 backdrop-blur',
    cardBorder: 'border-amber-400',
    
    // Text
    textPrimary: 'text-amber-900',
    textSecondary: 'text-amber-800',
    textMuted: 'text-amber-700',
    
    // Accents
    accent: 'emerald',
    accentBg: 'bg-emerald-100',
    accentBorder: 'border-emerald-400',
    accentText: 'text-emerald-700',
  },
  night: {
    // Backgrounds
    skyGradient: 'from-slate-900 via-purple-900 to-slate-800',
    grassGradient: 'from-emerald-900 to-emerald-950',
    dirtGradient: 'from-stone-800 to-stone-900',
    
    // Cards
    cardBg: 'bg-stone-800/90 backdrop-blur',
    cardBorder: 'border-stone-600',
    
    // Text
    textPrimary: 'text-white',
    textSecondary: 'text-gray-200',
    textMuted: 'text-gray-400',
    
    // Accents
    accent: 'emerald',
    accentBg: 'bg-emerald-900/50',
    accentBorder: 'border-emerald-700',
    accentText: 'text-emerald-400',
  }
};

