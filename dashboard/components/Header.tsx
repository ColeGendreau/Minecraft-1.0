'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { checkHealth } from '@/lib/api';
import { useTheme } from '@/lib/theme-context';

const navItems = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/assets/create', label: 'Create', icon: '🎨' },
  { href: '/assets', label: 'Gallery', icon: '🖼️' },
  { href: '/admin', label: 'Admin', icon: '⚙️' },
];

export function Header() {
  const pathname = usePathname();
  const { toggleTheme, isDay } = useTheme();
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [hearts, setHearts] = useState(10);

  useEffect(() => {
    const checkApi = async () => {
      try {
        await checkHealth();
        setApiStatus('online');
        setHearts(10);
      } catch {
        setApiStatus('offline');
        setHearts(0);
      }
    };

    checkApi();
    const interval = setInterval(checkApi, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className={`sticky top-0 z-50 shadow-xl border-b-4 transition-colors duration-500 ${
      isDay 
        ? 'bg-gradient-to-b from-amber-700 to-amber-800 border-amber-900' 
        : 'bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-4 group">
            {/* Grass/Stone block icon */}
            <div className={`relative w-12 h-12 transform group-hover:rotate-12 transition-transform shadow-lg ${
              isDay ? '' : 'brightness-75'
            }`}>
              <div className={`absolute inset-0 rounded-sm ${
                isDay 
                  ? 'bg-gradient-to-b from-green-400 to-green-600' 
                  : 'bg-gradient-to-b from-emerald-700 to-emerald-900'
              }`} style={{ clipPath: 'inset(0 0 40% 0)' }} />
              <div className={`absolute inset-0 rounded-sm ${
                isDay 
                  ? 'bg-gradient-to-b from-amber-600 to-amber-800' 
                  : 'bg-gradient-to-b from-stone-600 to-stone-800'
              }`} style={{ clipPath: 'inset(30% 0 0 0)' }} />
              <div className="absolute inset-0 border-4 border-black/30 rounded-sm" />
              <div className="absolute inset-0 opacity-20"
                   style={{
                     backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Crect fill='%23000' x='0' y='0' width='2' height='2'/%3E%3C/svg%3E")`,
                     backgroundSize: '4px 4px'
                   }} />
            </div>
            
            <div>
              <h1 className="text-lg font-bold text-white" 
                  style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px', letterSpacing: '1px', textShadow: '2px 2px 0 #000' }}>
                WORLD FORGE
              </h1>
              <p className={`text-xs mt-1 ${isDay ? 'text-amber-200' : 'text-slate-400'}`} 
                 style={{ fontFamily: "'VT323', monospace", fontSize: '14px' }}>
                Pixel Art Builder
              </p>
            </div>
          </Link>

          {/* Navigation - Hotbar Style */}
          <nav className={`flex rounded-lg p-1 shadow-inner border-2 transition-colors duration-500 ${
            isDay 
              ? 'bg-stone-800/90 border-stone-700' 
              : 'bg-slate-900/90 border-slate-700'
          }`}>
            {navItems.map((item, index) => {
              // Exact match only - prevents /assets/create from highlighting /assets
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative w-14 h-14 flex flex-col items-center justify-center rounded
                    transition-all duration-150
                    ${isActive 
                      ? 'bg-gradient-to-br from-emerald-400/40 to-emerald-600/40 scale-105 -translate-y-0.5 shadow-lg' 
                      : 'hover:bg-stone-700/50 hover:scale-105'
                    }
                  `}
                  style={{
                    boxShadow: isActive ? 'inset 0 0 10px rgba(52,211,153,0.3)' : 'none'
                  }}
                >
                  <span className="text-2xl drop-shadow">{item.icon}</span>
                  <span className="text-[8px] text-gray-300 mt-0.5 font-mono">{item.label}</span>
                  
                  {/* Slot number */}
                  <span className="absolute -bottom-0.5 -right-0.5 text-[10px] text-yellow-400 font-bold drop-shadow">
                    {index + 1}
                  </span>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side: Theme toggle + Status */}
          <div className="flex items-center gap-4">
            {/* Day/Night Toggle */}
            <button
              onClick={toggleTheme}
              className={`relative w-14 h-8 rounded-full transition-all duration-500 shadow-inner border-2 ${
                isDay 
                  ? 'bg-sky-400 border-sky-500' 
                  : 'bg-slate-700 border-slate-600'
              }`}
              title={`Switch to ${isDay ? 'night' : 'day'} mode`}
            >
              {/* Sun/Moon */}
              <div 
                className={`absolute top-1 w-6 h-6 rounded-full transition-all duration-500 flex items-center justify-center text-sm ${
                  isDay 
                    ? 'left-1 bg-yellow-400 shadow-lg shadow-yellow-400/50' 
                    : 'left-7 bg-slate-300 shadow-lg shadow-slate-300/30'
                }`}
              >
                {isDay ? '☀️' : '🌙'}
              </div>
              
              {/* Stars (night mode) */}
              {!isDay && (
                <>
                  <span className="absolute left-2 top-1 text-[8px]">✨</span>
                  <span className="absolute left-4 top-4 text-[6px]">⭐</span>
                </>
              )}
              
              {/* Clouds (day mode) */}
              {isDay && (
                <span className="absolute right-2 top-2 text-[8px]">☁️</span>
              )}
            </button>

            {/* Hearts */}
            <div className="flex items-center gap-0.5">
              {[...Array(10)].map((_, i) => (
                <span 
                  key={i} 
                  className={`text-base transition-all duration-300 ${i < hearts ? '' : 'grayscale opacity-30'}`}
                  style={{ 
                    filter: i < hearts ? 'drop-shadow(0 0 3px #ff0000)' : 'none',
                    transform: i < hearts ? 'scale(1)' : 'scale(0.8)'
                  }}
                >
                  ❤️
                </span>
              ))}
            </div>
            
            {/* Status */}
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 ${
              apiStatus === 'online' 
                ? (isDay ? 'bg-emerald-900/50 border-emerald-600' : 'bg-emerald-900/30 border-emerald-700')
                : apiStatus === 'offline' 
                  ? 'bg-red-900/50 border-red-600' 
                  : 'bg-yellow-900/50 border-yellow-600'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                apiStatus === 'online' ? 'bg-emerald-400 animate-pulse' :
                apiStatus === 'offline' ? 'bg-red-400' :
                'bg-yellow-400 animate-bounce'
              }`} />
              <span className="text-xs text-white font-bold" style={{ fontFamily: "'VT323', monospace" }}>
                {apiStatus === 'online' ? 'Online' :
                 apiStatus === 'offline' ? 'Offline' :
                 '...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* XP Bar */}
      <div className={`h-2 relative overflow-hidden ${isDay ? 'bg-black/50' : 'bg-black/70'}`}>
        <div 
          className={`h-full transition-all duration-1000 ${
            isDay 
              ? 'bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400' 
              : 'bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500'
          }`}
          style={{ 
            width: apiStatus === 'online' ? '100%' : '0%',
            boxShadow: isDay 
              ? '0 0 10px rgba(52,211,153,0.5)' 
              : '0 0 10px rgba(168,85,247,0.5)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" 
             style={{ animation: 'shimmer 2s infinite' }} />
      </div>
    </header>
  );
}
