'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getAssets, checkHealth, getInfrastructureStatus } from '@/lib/api';
import type { Asset, InfrastructureStatusResponse } from '@/lib/api';
import { useTheme } from '@/lib/theme-context';

export default function HomePage() {
  const { isDay } = useTheme();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [infraStatus, setInfraStatus] = useState<InfrastructureStatusResponse | null>(null);
  const [serverOnline, setServerOnline] = useState(false);
  const [serverAddress, setServerAddress] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      await checkHealth();
      const [assetsData, infraData] = await Promise.all([
        getAssets(),
        getInfrastructureStatus().catch(() => null)
      ]);
      setAssets(assetsData.assets);
      setInfraStatus(infraData);
      setServerOnline(infraData?.isRunning ?? false);
      setServerAddress(infraData?.metrics?.minecraftAddress ?? null);
    } catch {
      setServerOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <main className={`min-h-screen transition-colors duration-500 ${
      isDay 
        ? 'bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-200' 
        : 'bg-gradient-to-b from-slate-900 via-purple-900/50 to-slate-800'
    }`}>
      {/* Sky decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {isDay ? (
          // Clouds for day
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float opacity-80"
              style={{
                left: `${(i * 18) % 100}%`,
                top: `${5 + (i * 7) % 20}%`,
                animationDelay: `${i * 0.8}s`,
                animationDuration: `${4 + (i % 3)}s`
              }}
            >
              <div className="flex gap-1">
                <div className="w-12 h-8 bg-white rounded-lg shadow-lg" />
                <div className="w-16 h-10 bg-white rounded-lg shadow-lg -mt-2" />
                <div className="w-10 h-7 bg-white rounded-lg shadow-lg" />
              </div>
            </div>
          ))
        ) : (
          // Stars for night
          [...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-pulse"
              style={{
                left: `${(i * 3.3) % 100}%`,
                top: `${(i * 7) % 60}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: `${2 + (i % 3)}s`
              }}
            >
              <span className="text-white text-xs">✦</span>
            </div>
          ))
        )}
      </div>

      {/* Hero Section */}
      <section className="relative pt-8 pb-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          {/* Logo */}
          <div className="mb-8">
            <h1 
              className="text-5xl md:text-7xl font-bold mb-4"
              style={{ 
                fontFamily: "'Press Start 2P', cursive",
                color: isDay ? '#FCD34D' : '#FCD34D', // Bright gold/yellow
                textShadow: isDay 
                  ? '4px 4px 0 #92400E, -2px -2px 0 #78350F, 2px -2px 0 #78350F, -2px 2px 0 #78350F, 0 5px 0 #451A03'
                  : '4px 4px 0 #1E1B4B, -2px -2px 0 #312E81, 2px -2px 0 #312E81, -2px 2px 0 #312E81, 0 5px 0 #0F0D24',
                letterSpacing: '2px'
              }}
            >
              WORLD FORGE
            </h1>
            <p 
              className={`text-2xl ${isDay ? 'text-emerald-800' : 'text-emerald-400'}`}
              style={{ fontFamily: "'VT323', monospace", textShadow: isDay ? '1px 1px 0 rgba(255,255,255,0.5)' : '1px 1px 0 rgba(0,0,0,0.5)' }}
            >
              ⚡ Build pixel art in Minecraft — watch it construct live! ⚡
            </p>
          </div>

          {/* Server Status Card */}
          <div className={`inline-block p-6 mb-8 rounded-lg border-4 shadow-xl transition-colors duration-500 ${
            isDay 
              ? 'bg-amber-50/90 backdrop-blur border-amber-600' 
              : 'bg-slate-800/90 backdrop-blur border-slate-600'
          }`}>
            <div className="flex items-center justify-center gap-4">
              <div className={`w-5 h-5 rounded-full ${serverOnline ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-red-500'}`} />
              <span 
                className={`text-2xl font-bold ${serverOnline ? (isDay ? 'text-emerald-700' : 'text-emerald-400') : 'text-red-500'}`}
                style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}
              >
                {serverOnline ? '🎮 SERVER ONLINE' : '💤 SERVER OFFLINE'}
              </span>
            </div>
            {serverAddress && serverOnline && (
              <div className={`mt-4 p-3 rounded-lg border-2 ${
                isDay 
                  ? 'bg-emerald-100 border-emerald-400' 
                  : 'bg-emerald-900/50 border-emerald-700'
              }`}>
                <p className={`text-sm mb-1 ${isDay ? 'text-emerald-600' : 'text-emerald-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
                  Server Address:
                </p>
                <code className={`text-xl font-bold ${isDay ? 'text-emerald-800' : 'text-emerald-300'}`}>{serverAddress}</code>
              </div>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Link href="/assets/create" className="mc-button-grass text-lg px-8 py-4 shadow-xl hover:scale-105 transition-transform">
              🎨 CREATE PIXEL ART
            </Link>
            <Link href="/admin" className="mc-button-stone text-lg px-8 py-4 shadow-xl hover:scale-105 transition-transform">
              ⚙️ ADMIN PANEL
            </Link>
          </div>

          {/* How to Join */}
          {serverOnline && serverAddress && (
            <div className={`max-w-xl mx-auto p-6 rounded-lg border-4 shadow-xl transition-colors duration-500 ${
              isDay 
                ? 'bg-white/90 backdrop-blur border-sky-400' 
                : 'bg-slate-800/90 backdrop-blur border-purple-700'
            }`}>
              <h3 
                className={`text-lg mb-4 ${isDay ? 'text-sky-700' : 'text-purple-300'}`}
                style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '12px' }}
              >
                🎮 HOW TO JOIN
              </h3>
              <ol className={`text-left space-y-2 ${isDay ? 'text-gray-700' : 'text-gray-300'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
                <li>1. Open <span className={`font-bold ${isDay ? 'text-emerald-700' : 'text-emerald-400'}`}>Minecraft Java Edition</span></li>
                <li>2. Click <span className="font-bold">Multiplayer</span> → <span className="font-bold">Add Server</span></li>
                <li>3. Paste: <code className={`px-2 py-1 rounded font-bold ${isDay ? 'text-emerald-700 bg-emerald-100' : 'text-emerald-400 bg-emerald-900/50'}`}>{serverAddress}</code></li>
                <li>4. Join and explore your pixel art! 🖼️</li>
              </ol>
            </div>
          )}
        </div>
      </section>

      {/* Grass Hill Divider */}
      <div className="relative h-16">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full">
          <path d="M0,120 Q300,60 600,80 T1200,60 L1200,120 Z" fill={isDay ? '#4ade80' : '#065f46'} />
          <path d="M0,120 Q200,80 500,90 T1200,70 L1200,120 Z" fill={isDay ? '#22c55e' : '#064e3b'} />
        </svg>
      </div>

      {/* Asset Gallery Section */}
      <section className={`py-16 relative transition-colors duration-500 ${
        isDay 
          ? 'bg-gradient-to-b from-green-500 to-green-600' 
          : 'bg-gradient-to-b from-emerald-900 to-emerald-950'
      }`}>
        {/* Texture */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Crect fill='%23000' x='0' y='0' width='4' height='4'/%3E%3C/svg%3E")`,
            backgroundSize: '8px 8px'
          }}
        />
        
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <span className="text-5xl drop-shadow-lg">🖼️</span>
              <div>
                <h2 
                  className="text-2xl text-white drop-shadow-lg"
                  style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '16px', textShadow: '2px 2px 0 #166534' }}
                >
                  PIXEL ART GALLERY
                </h2>
                <p className={`mt-1 ${isDay ? 'text-green-100' : 'text-emerald-300'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                  Assets built in the Minecraft world
                </p>
              </div>
            </div>
            <Link href="/assets/create" className="mc-button-grass shadow-xl">
              + NEW ASSET
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4 animate-bounce drop-shadow-lg">⛏️</div>
              <p className="text-white text-xl" style={{ fontFamily: "'VT323', monospace" }}>
                Mining data...
              </p>
            </div>
          ) : assets.length === 0 ? (
            <div className={`p-12 text-center rounded-lg border-4 border-dashed shadow-xl transition-colors duration-500 ${
              isDay 
                ? 'border-green-300 bg-green-50/90 backdrop-blur' 
                : 'border-emerald-700 bg-emerald-950/90 backdrop-blur'
            }`}>
              <div className="text-8xl mb-6 animate-float drop-shadow-lg">🎨</div>
              <h3 
                className={`text-xl mb-4 ${isDay ? 'text-green-800' : 'text-emerald-300'}`}
                style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}
              >
                NO ASSETS YET
              </h3>
              <p className={`mb-6 text-xl ${isDay ? 'text-green-700' : 'text-emerald-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
                Create your first pixel art masterpiece!
              </p>
              <Link href="/assets/create" className="mc-button-grass inline-block shadow-xl">
                🎨 CREATE YOUR FIRST ASSET
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {assets.slice(0, 8).map((asset) => (
                  <AssetCard key={asset.id} asset={asset} isDay={isDay} />
                ))}
              </div>
              {assets.length > 8 && (
                <div className="text-center mt-8">
                  <Link 
                    href="/assets" 
                    className="text-white hover:text-green-100 transition-colors text-xl underline"
                    style={{ fontFamily: "'VT323', monospace" }}
                  >
                    View all {assets.length} assets →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Dirt Layer */}
      <div className={`h-8 transition-colors duration-500 ${
        isDay 
          ? 'bg-gradient-to-b from-amber-600 to-amber-700' 
          : 'bg-gradient-to-b from-stone-700 to-stone-800'
      }`} />

      {/* Features Section */}
      <section className={`py-16 relative transition-colors duration-500 ${
        isDay 
          ? 'bg-gradient-to-b from-amber-700 to-amber-800' 
          : 'bg-gradient-to-b from-stone-800 to-stone-900'
      }`}>
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Crect fill='%23000' x='0' y='0' width='4' height='4'/%3E%3C/svg%3E")`,
            backgroundSize: '8px 8px'
          }}
        />
        <div className="max-w-6xl mx-auto px-6 relative">
          <h2 
            className={`text-center text-2xl mb-12 drop-shadow-lg ${isDay ? 'text-amber-100' : 'text-stone-200'}`}
            style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '16px', textShadow: '2px 2px 0 #78350f' }}
          >
            ⚡ HOW IT WORKS
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard icon="📷" title="IMAGE URL" description="Paste any PNG or JPG URL. Logos, sprites, icons — we convert them to Minecraft blocks." color="sky" isDay={isDay} />
            <FeatureCard icon="🔍" title="IMAGE SEARCH" description="Search for any image on the web. Bing finds it and builds it automatically." color="purple" isDay={isDay} />
            <FeatureCard icon="⚡" title="LIVE BUILD" description="Watch blocks appear in real-time via RCON. No server restart needed!" color="emerald" isDay={isDay} />
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      {infraStatus && (
        <section className={`py-12 transition-colors duration-500 ${isDay ? 'bg-amber-800' : 'bg-stone-900'}`}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Assets Built" value={assets.length.toString()} icon="🖼️" color="purple" isDay={isDay} />
              <StatCard label="Server Status" value={serverOnline ? 'ONLINE' : 'OFFLINE'} icon="🎮" color={serverOnline ? 'emerald' : 'red'} isDay={isDay} />
              <StatCard label="K8s Pods" value={infraStatus.metrics?.pods?.toString() ?? '-'} icon="📦" color="sky" isDay={isDay} />
              <StatCard label="K8s Nodes" value={infraStatus.metrics?.nodes?.toString() ?? '-'} icon="🖥️" color="orange" isDay={isDay} />
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className={`py-8 text-center transition-colors duration-500 ${isDay ? 'bg-stone-800' : 'bg-black'}`}>
        <p className="text-stone-400" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
          Made with 💎 by Cole Gendreau
        </p>
        <div className="flex justify-center gap-6 mt-4">
          <Link href="https://github.com/ColeGendreau/Minecraft-1.0" target="_blank" className="text-stone-400 hover:text-white transition-colors">
            GitHub
          </Link>
          <Link href="/admin" className="text-stone-400 hover:text-white transition-colors">
            Admin Panel
          </Link>
        </div>
      </footer>
    </main>
  );
}

function AssetCard({ asset, isDay }: { asset: Asset; isDay: boolean }) {
  const imageUrl = asset.generatedImageUrl || asset.imageUrl;
  const isAiLookup = !!asset.prompt;

  return (
    <div className={`group relative rounded-lg overflow-hidden shadow-xl border-4 transition-all hover:scale-105 hover:-translate-y-1 ${
      isDay 
        ? 'bg-white border-amber-400' 
        : 'bg-slate-800 border-slate-600'
    }`}>
      <div className={`aspect-square overflow-hidden ${isDay ? 'bg-amber-50' : 'bg-slate-900'}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={asset.name}
            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center text-4xl ${isDay ? 'text-amber-300' : 'text-slate-600'}`}>
            🖼️
          </div>
        )}
      </div>
      
      <div className={`absolute bottom-0 left-0 right-0 p-3 ${
        isDay 
          ? 'bg-gradient-to-t from-amber-900/95 to-transparent' 
          : 'bg-gradient-to-t from-black/95 to-transparent'
      }`}>
        <p className="text-white text-sm truncate drop-shadow" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '8px' }}>
          {asset.name}
        </p>
        <p className={`text-xs mt-1 ${isDay ? 'text-amber-200' : 'text-slate-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
          📍 {asset.position.x}, {asset.position.y}, {asset.position.z}
        </p>
      </div>

      {isAiLookup && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded shadow-lg">
          🔍 AI
        </div>
      )}
    </div>
  );
}

function FeatureCard({ icon, title, description, color, isDay }: { icon: string; title: string; description: string; color: string; isDay: boolean }) {
  const dayBg: Record<string, string> = { sky: 'bg-sky-100 border-sky-400', purple: 'bg-purple-100 border-purple-400', emerald: 'bg-emerald-100 border-emerald-400' };
  const nightBg: Record<string, string> = { sky: 'bg-sky-900/50 border-sky-700', purple: 'bg-purple-900/50 border-purple-700', emerald: 'bg-emerald-900/50 border-emerald-700' };
  const dayText: Record<string, string> = { sky: 'text-sky-800', purple: 'text-purple-800', emerald: 'text-emerald-800' };
  const nightText: Record<string, string> = { sky: 'text-sky-300', purple: 'text-purple-300', emerald: 'text-emerald-300' };
  
  return (
    <div className={`p-6 text-center rounded-lg border-4 shadow-xl hover:scale-105 transition-all ${isDay ? dayBg[color] : nightBg[color]}`}>
      <div className="text-5xl mb-4 drop-shadow-lg">{icon}</div>
      <h3 className={`mb-3 ${isDay ? dayText[color] : nightText[color]}`} style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '11px' }}>
        {title}
      </h3>
      <p className={isDay ? 'text-gray-700' : 'text-gray-300'} style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
        {description}
      </p>
    </div>
  );
}

function StatCard({ label, value, icon, color, isDay }: { label: string; value: string; icon: string; color: string; isDay: boolean }) {
  const dayBg: Record<string, string> = { purple: 'bg-purple-100 border-purple-400', emerald: 'bg-emerald-100 border-emerald-400', red: 'bg-red-100 border-red-400', sky: 'bg-sky-100 border-sky-400', orange: 'bg-orange-100 border-orange-400' };
  const nightBg: Record<string, string> = { purple: 'bg-purple-900/50 border-purple-700', emerald: 'bg-emerald-900/50 border-emerald-700', red: 'bg-red-900/50 border-red-700', sky: 'bg-sky-900/50 border-sky-700', orange: 'bg-orange-900/50 border-orange-700' };
  const dayText: Record<string, string> = { purple: 'text-purple-700', emerald: 'text-emerald-700', red: 'text-red-700', sky: 'text-sky-700', orange: 'text-orange-700' };
  const nightText: Record<string, string> = { purple: 'text-purple-400', emerald: 'text-emerald-400', red: 'text-red-400', sky: 'text-sky-400', orange: 'text-orange-400' };
  
  return (
    <div className={`p-4 text-center rounded-lg border-4 shadow-lg ${isDay ? dayBg[color] : nightBg[color]}`}>
      <div className="text-3xl mb-2 drop-shadow">{icon}</div>
      <p className={`text-2xl font-bold ${isDay ? dayText[color] : nightText[color]}`} style={{ fontFamily: "'VT323', monospace" }}>
        {value}
      </p>
      <p className={`text-sm ${isDay ? 'text-gray-600' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
        {label}
      </p>
    </div>
  );
}
