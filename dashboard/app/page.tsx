'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getAssetsStatus, getAssets, checkHealth, getInfrastructureStatus } from '@/lib/api';
import type { Asset, InfrastructureStatusResponse } from '@/lib/api';

export default function HomePage() {
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
      // Server might be offline
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
    <main className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-200">
      {/* Clouds */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
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
        ))}
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
                color: '#3D2817',
                textShadow: '4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 4px 0 #1a0a00',
                letterSpacing: '2px'
              }}
            >
              WORLD FORGE
            </h1>
            <p 
              className="text-2xl text-emerald-800"
              style={{ fontFamily: "'VT323', monospace", textShadow: '1px 1px 0 rgba(255,255,255,0.5)' }}
            >
              ⚡ Build pixel art in Minecraft — watch it construct live! ⚡
            </p>
          </div>

          {/* Server Status Card */}
          <div className="inline-block mc-card p-6 mb-8 bg-amber-50/90 backdrop-blur border-4 border-amber-600 shadow-xl">
            <div className="flex items-center justify-center gap-4">
              <div className={`w-5 h-5 rounded-full ${serverOnline ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-red-500'}`} />
              <span 
                className={`text-2xl font-bold ${serverOnline ? 'text-emerald-700' : 'text-red-700'}`}
                style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}
              >
                {serverOnline ? '🎮 SERVER ONLINE' : '💤 SERVER OFFLINE'}
              </span>
            </div>
            {serverAddress && serverOnline && (
              <div className="mt-4 p-3 bg-emerald-100 rounded-lg border-2 border-emerald-400">
                <p className="text-emerald-600 text-sm mb-1" style={{ fontFamily: "'VT323', monospace" }}>
                  Server Address:
                </p>
                <code className="text-emerald-800 text-xl font-bold">{serverAddress}</code>
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
            <div className="mc-card max-w-xl mx-auto p-6 bg-white/90 backdrop-blur border-4 border-sky-400 shadow-xl">
              <h3 
                className="text-lg text-sky-700 mb-4"
                style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '12px' }}
              >
                🎮 HOW TO JOIN
              </h3>
              <ol className="text-left text-gray-700 space-y-2" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
                <li>1. Open <span className="font-bold text-emerald-700">Minecraft Java Edition</span></li>
                <li>2. Click <span className="font-bold">Multiplayer</span> → <span className="font-bold">Add Server</span></li>
                <li>3. Paste: <code className="text-emerald-700 bg-emerald-100 px-2 py-1 rounded font-bold">{serverAddress}</code></li>
                <li>4. Join and explore your pixel art! 🖼️</li>
              </ol>
            </div>
          )}
        </div>
      </section>

      {/* Grass Hill Divider */}
      <div className="relative h-16">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full">
          <path d="M0,120 Q300,60 600,80 T1200,60 L1200,120 Z" fill="#4ade80" />
          <path d="M0,120 Q200,80 500,90 T1200,70 L1200,120 Z" fill="#22c55e" />
        </svg>
      </div>

      {/* Asset Gallery Section */}
      <section className="bg-gradient-to-b from-green-500 to-green-600 py-16 relative">
        {/* Grass texture */}
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
                <p className="text-green-100 mt-1" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
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
            <div className="mc-card p-12 text-center border-4 border-dashed border-green-300 bg-green-50/90 backdrop-blur">
              <div className="text-8xl mb-6 animate-float drop-shadow-lg">🎨</div>
              <h3 
                className="text-xl text-green-800 mb-4"
                style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}
              >
                NO ASSETS YET
              </h3>
              <p className="text-green-700 mb-6 text-xl" style={{ fontFamily: "'VT323', monospace" }}>
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
                  <AssetCard key={asset.id} asset={asset} />
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
      <div className="h-8 bg-gradient-to-b from-amber-600 to-amber-700" />

      {/* Features Section */}
      <section className="bg-gradient-to-b from-amber-700 to-amber-800 py-16 relative">
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Crect fill='%23000' x='0' y='0' width='4' height='4'/%3E%3C/svg%3E")`,
            backgroundSize: '8px 8px'
          }}
        />
        <div className="max-w-6xl mx-auto px-6 relative">
          <h2 
            className="text-center text-2xl text-amber-100 mb-12 drop-shadow-lg"
            style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '16px', textShadow: '2px 2px 0 #78350f' }}
          >
            ⚡ HOW IT WORKS
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon="📷"
              title="IMAGE URL"
              description="Paste any PNG or JPG URL. Logos, sprites, icons — we convert them to Minecraft blocks."
              color="sky"
            />
            <FeatureCard
              icon="🔍"
              title="AI LOOKUP"
              description="Describe what you want. GPT-4o finds a real image and builds it automatically."
              color="purple"
            />
            <FeatureCard
              icon="⚡"
              title="LIVE BUILD"
              description="Watch blocks appear in real-time via RCON. No server restart needed!"
              color="emerald"
            />
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      {infraStatus && (
        <section className="bg-amber-800 py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Assets Built" value={assets.length.toString()} icon="🖼️" color="purple" />
              <StatCard label="Server Status" value={serverOnline ? 'ONLINE' : 'OFFLINE'} icon="🎮" color={serverOnline ? 'emerald' : 'red'} />
              <StatCard label="K8s Pods" value={infraStatus.metrics?.pods?.toString() ?? '-'} icon="📦" color="sky" />
              <StatCard label="K8s Nodes" value={infraStatus.metrics?.nodes?.toString() ?? '-'} icon="🖥️" color="orange" />
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-stone-800 py-8 text-center">
        <p className="text-stone-400" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
          Made with 💎 by Cole Gendreau
        </p>
        <div className="flex justify-center gap-6 mt-4">
          <Link 
            href="https://github.com/ColeGendreau/Minecraft-1.0" 
            target="_blank"
            className="text-stone-400 hover:text-white transition-colors"
          >
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

function AssetCard({ asset }: { asset: Asset }) {
  const imageUrl = asset.generatedImageUrl || asset.imageUrl;
  const isAiLookup = !!asset.prompt;

  return (
    <div className="group relative bg-white rounded-lg overflow-hidden shadow-xl border-4 border-amber-400 transition-transform hover:scale-105 hover:-translate-y-1">
      {/* Image */}
      <div className="aspect-square bg-amber-50 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={asset.name}
            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-amber-300">
            🖼️
          </div>
        )}
      </div>
      
      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-900/95 to-transparent p-3">
        <p 
          className="text-white text-sm truncate drop-shadow"
          style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '8px' }}
        >
          {asset.name}
        </p>
        <p className="text-amber-200 text-xs mt-1" style={{ fontFamily: "'VT323', monospace" }}>
          📍 {asset.position.x}, {asset.position.y}, {asset.position.z}
        </p>
      </div>

      {/* AI badge */}
      {isAiLookup && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded shadow-lg">
          🔍 AI
        </div>
      )}
    </div>
  );
}

function FeatureCard({ icon, title, description, color }: { icon: string; title: string; description: string; color: string }) {
  const bgColors: Record<string, string> = {
    sky: 'bg-sky-100 border-sky-400',
    purple: 'bg-purple-100 border-purple-400',
    emerald: 'bg-emerald-100 border-emerald-400'
  };
  const textColors: Record<string, string> = {
    sky: 'text-sky-800',
    purple: 'text-purple-800',
    emerald: 'text-emerald-800'
  };
  
  return (
    <div className={`${bgColors[color]} p-6 text-center rounded-lg border-4 shadow-xl hover:scale-105 transition-transform`}>
      <div className="text-5xl mb-4 drop-shadow-lg">{icon}</div>
      <h3 
        className={`${textColors[color]} mb-3`}
        style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '11px' }}
      >
        {title}
      </h3>
      <p className="text-gray-700" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
        {description}
      </p>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon, 
  color
}: { 
  label: string; 
  value: string; 
  icon: string;
  color: string;
}) {
  const bgColors: Record<string, string> = {
    purple: 'bg-purple-100 border-purple-400',
    emerald: 'bg-emerald-100 border-emerald-400',
    red: 'bg-red-100 border-red-400',
    sky: 'bg-sky-100 border-sky-400',
    orange: 'bg-orange-100 border-orange-400'
  };
  const textColors: Record<string, string> = {
    purple: 'text-purple-700',
    emerald: 'text-emerald-700',
    red: 'text-red-700',
    sky: 'text-sky-700',
    orange: 'text-orange-700'
  };
  
  return (
    <div className={`${bgColors[color]} p-4 text-center rounded-lg border-4 shadow-lg`}>
      <div className="text-3xl mb-2 drop-shadow">{icon}</div>
      <p className={`text-2xl font-bold ${textColors[color]}`} style={{ fontFamily: "'VT323', monospace" }}>
        {value}
      </p>
      <p className="text-gray-600 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
        {label}
      </p>
    </div>
  );
}
