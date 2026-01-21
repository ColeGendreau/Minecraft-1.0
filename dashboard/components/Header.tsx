'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { checkHealth } from '@/lib/api';

const navItems = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/assets/create', label: 'Create', icon: '🎨' },
  { href: '/assets', label: 'Gallery', icon: '🖼️' },
  { href: '/admin', label: 'Admin', icon: '⚙️' },
];

export function Header() {
  const pathname = usePathname();
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
    <header className="sticky top-0 z-50 bg-gradient-to-b from-amber-700 to-amber-800 shadow-xl border-b-4 border-amber-900">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-4 group">
            {/* Grass block icon */}
            <div className="relative w-12 h-12 transform group-hover:rotate-12 transition-transform shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-b from-green-400 to-green-600 rounded-sm" 
                   style={{ clipPath: 'inset(0 0 40% 0)' }} />
              <div className="absolute inset-0 bg-gradient-to-b from-amber-600 to-amber-800 rounded-sm"
                   style={{ clipPath: 'inset(30% 0 0 0)' }} />
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
              <p className="text-xs text-amber-200 mt-1" style={{ fontFamily: "'VT323', monospace", fontSize: '14px' }}>
                Pixel Art Builder
              </p>
            </div>
          </Link>

          {/* Navigation - Hotbar Style */}
          <nav className="flex bg-stone-800/90 rounded-lg p-1 shadow-inner border-2 border-stone-700">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href));
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

          {/* Status - Health Bar */}
          <div className="flex items-center gap-4">
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
              apiStatus === 'online' ? 'bg-emerald-900/50 border-emerald-600' :
              apiStatus === 'offline' ? 'bg-red-900/50 border-red-600' :
              'bg-yellow-900/50 border-yellow-600'
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
      <div className="h-2 bg-black/50 relative overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400 transition-all duration-1000"
          style={{ 
            width: apiStatus === 'online' ? '100%' : '0%',
            boxShadow: '0 0 10px rgba(52,211,153,0.5)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" 
             style={{ animation: 'shimmer 2s infinite' }} />
      </div>
    </header>
  );
}
