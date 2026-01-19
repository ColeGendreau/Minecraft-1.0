'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { checkHealth } from '@/lib/api';

const navItems = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/create', label: 'Create', icon: '⚒️' },
  { href: '/worlds', label: 'Worlds', icon: '🗺️' },
];

export function Header() {
  const pathname = usePathname();
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [hearts, setHearts] = useState(10);

  // Check API status
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
    <header className="sticky top-0 z-50 mc-panel-stone">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo - Minecraft Style */}
          <Link href="/" className="flex items-center gap-4 group">
            {/* Grass block icon */}
            <div className="relative w-12 h-12 transform group-hover:rotate-12 transition-transform">
              <div className="absolute inset-0 bg-gradient-to-b from-green-500 to-green-700 rounded-sm" 
                   style={{ clipPath: 'inset(0 0 40% 0)' }} />
              <div className="absolute inset-0 bg-gradient-to-b from-amber-700 to-amber-900 rounded-sm"
                   style={{ clipPath: 'inset(30% 0 0 0)' }} />
              <div className="absolute inset-0 border-4 border-black/30 rounded-sm" />
              {/* Pixel texture */}
              <div className="absolute inset-0 opacity-20"
                   style={{
                     backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Crect fill='%23000' x='0' y='0' width='2' height='2'/%3E%3C/svg%3E")`,
                     backgroundSize: '4px 4px'
                   }} />
            </div>
            
            <div>
              <h1 className="text-lg font-bold text-white text-shadow-mc" 
                  style={{ fontFamily: "'VT323', monospace", fontSize: '22px', letterSpacing: '2px' }}>
                WORLD FORGE
              </h1>
              <p className="text-xs text-gray-200 mt-1" style={{ fontFamily: "'VT323', monospace", fontSize: '14px' }}>
                AI Minecraft World Creation
              </p>
            </div>
          </Link>

          {/* Navigation - Hotbar Style */}
          <nav className="mc-hotbar">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative w-14 h-14 flex flex-col items-center justify-center
                    transition-all duration-150
                    ${isActive 
                      ? 'mc-slot bg-gradient-to-br from-emerald-500/30 to-emerald-700/30 scale-110 -translate-y-1' 
                      : 'mc-slot hover:scale-105 hover:-translate-y-0.5'
                    }
                  `}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-[8px] text-gray-300 mt-0.5 font-mono">{item.label}</span>
                  
                  {/* Slot number */}
                  <span className="absolute -bottom-1 -right-1 text-[10px] text-yellow-400 font-bold">
                    {index + 1}
                  </span>
                  
                  {/* Active glow */}
                  {isActive && (
                    <div className="absolute inset-0 bg-emerald-400/20 rounded animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Status - Health Bar Style */}
          <div className="flex items-center gap-4">
            {/* Hearts */}
            <div className="flex items-center gap-1">
              {[...Array(10)].map((_, i) => (
                <span 
                  key={i} 
                  className={`text-lg transition-all duration-300 ${i < hearts ? '' : 'grayscale opacity-30'}`}
                  style={{ 
                    filter: i < hearts ? 'drop-shadow(0 0 4px #ff0000)' : 'none',
                    transform: i < hearts ? 'scale(1)' : 'scale(0.8)'
                  }}
                >
                  ❤️
                </span>
              ))}
            </div>
            
            {/* Status text */}
            <div className="mc-tooltip">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  apiStatus === 'online' ? 'bg-emerald-400 animate-pulse' :
                  apiStatus === 'offline' ? 'bg-red-500' :
                  'bg-yellow-400 animate-bounce'
                }`} />
                <span className="text-sm">
                  {apiStatus === 'online' ? 'Server Online' :
                   apiStatus === 'offline' ? 'Server Offline' :
                   'Connecting...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* XP Bar style bottom border */}
      <div className="h-2 bg-black/50 relative overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400 transition-all duration-1000"
          style={{ 
            width: apiStatus === 'online' ? '100%' : '0%',
            boxShadow: '0 0 10px rgba(52,211,153,0.5)'
          }}
        />
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
      </div>
    </header>
  );
}
