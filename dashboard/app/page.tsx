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
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900 via-emerald-800 to-stone-900">
          {/* Pixel grid overlay */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'%3E%3Crect fill='%23000' x='0' y='0' width='8' height='8'/%3E%3C/svg%3E")`,
              backgroundSize: '16px 16px'
            }}
          />
          {/* Floating blocks animation */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-float opacity-20"
                style={{
                  left: `${(i * 8.33) % 100}%`,
                  top: `${(i * 17) % 80}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${3 + (i % 3)}s`
                }}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-sm transform rotate-12" />
              </div>
            ))}
          </div>
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-16 text-center">
          {/* Logo */}
          <div className="mb-6">
            <h1 
              className="text-5xl md:text-7xl font-bold text-white mb-4"
              style={{ 
                fontFamily: "'Press Start 2P', cursive",
                textShadow: '4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                letterSpacing: '2px'
              }}
            >
              WORLD FORGE
            </h1>
            <p 
              className="text-2xl text-emerald-300"
              style={{ fontFamily: "'VT323', monospace" }}
            >
              Build pixel art in Minecraft — live!
            </p>
          </div>

          {/* Server Status Card */}
          <div className="inline-block mc-panel-stone p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${serverOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
              <span 
                className="text-xl text-white"
                style={{ fontFamily: "'VT323', monospace" }}
              >
                {serverOnline ? 'SERVER ONLINE' : 'SERVER OFFLINE'}
              </span>
            </div>
            {serverAddress && serverOnline && (
              <div className="mt-4 p-3 bg-black/30 rounded">
                <p className="text-gray-400 text-sm mb-1" style={{ fontFamily: "'VT323', monospace" }}>
                  Server Address:
                </p>
                <code className="text-emerald-400 text-lg font-mono">{serverAddress}</code>
              </div>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Link href="/assets/create" className="mc-button-grass text-lg px-8 py-4">
              🎨 CREATE PIXEL ART
            </Link>
            <Link href="/admin" className="mc-button-stone text-lg px-8 py-4">
              ⚙️ ADMIN PANEL
            </Link>
          </div>

          {/* How to Join */}
          {serverOnline && serverAddress && (
            <div className="mc-card max-w-xl mx-auto p-6 bg-stone-800/80 backdrop-blur">
              <h3 
                className="text-lg text-emerald-400 mb-4"
                style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '12px' }}
              >
                🎮 HOW TO JOIN
              </h3>
              <ol className="text-left text-gray-300 space-y-2" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                <li>1. Open <span className="text-white">Minecraft Java Edition</span></li>
                <li>2. Click <span className="text-white">Multiplayer</span> → <span className="text-white">Add Server</span></li>
                <li>3. Paste: <code className="text-emerald-400 bg-black/30 px-2 py-1 rounded">{serverAddress}</code></li>
                <li>4. Join and explore your pixel art!</li>
              </ol>
            </div>
          )}
        </div>
      </section>

      {/* Asset Gallery Section */}
      <section className="bg-gradient-to-b from-stone-900 to-stone-800 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <span className="text-4xl">🖼️</span>
              <div>
                <h2 
                  className="text-2xl text-white"
                  style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '16px' }}
                >
                  PIXEL ART GALLERY
                </h2>
                <p className="text-gray-400 mt-1" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                  Assets built in the Minecraft world
                </p>
              </div>
            </div>
            <Link href="/assets/create" className="mc-button-grass">
              + NEW ASSET
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4 animate-bounce">⛏️</div>
              <p className="text-gray-400" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
                Mining data...
              </p>
            </div>
          ) : assets.length === 0 ? (
            <div className="mc-card p-12 text-center border-4 border-dashed border-stone-600">
              <div className="text-8xl mb-6 animate-float">🎨</div>
              <h3 
                className="text-xl text-white mb-4"
                style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}
              >
                NO ASSETS YET
              </h3>
              <p className="text-gray-400 mb-6" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
                Create your first pixel art masterpiece!
              </p>
              <Link href="/assets/create" className="mc-button-grass inline-block">
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
                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                    style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}
                  >
                    View all {assets.length} assets →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-stone-800 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 
            className="text-center text-2xl text-white mb-12"
            style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '16px' }}
          >
            ⚡ FEATURES
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon="📷"
              title="IMAGE URL"
              description="Paste any PNG or JPG URL. Logos, sprites, icons — we convert them to Minecraft blocks."
            />
            <FeatureCard
              icon="🔍"
              title="AI LOOKUP"
              description="Describe what you want. GPT-4o finds a real image and builds it automatically."
            />
            <FeatureCard
              icon="⚡"
              title="LIVE BUILD"
              description="Watch blocks appear in real-time via RCON. No server restart needed!"
            />
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      {infraStatus && (
        <section className="bg-gradient-to-b from-stone-800 to-stone-900 py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Assets Built" value={assets.length.toString()} icon="🖼️" />
              <StatCard label="Server Status" value={serverOnline ? 'ONLINE' : 'OFFLINE'} icon="🎮" color={serverOnline ? 'emerald' : 'red'} />
              <StatCard label="K8s Pods" value={infraStatus.metrics?.pods?.toString() ?? '-'} icon="📦" />
              <StatCard label="K8s Nodes" value={infraStatus.metrics?.nodes?.toString() ?? '-'} icon="🖥️" />
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-stone-900 py-8 text-center">
        <p className="text-gray-500" style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}>
          Made with 💎 by Cole Gendreau
        </p>
        <div className="flex justify-center gap-6 mt-4">
          <Link 
            href="https://github.com/ColeGendreau/Minecraft-1.0" 
            target="_blank"
            className="text-gray-400 hover:text-white transition-colors"
          >
            GitHub
          </Link>
          <Link href="/admin" className="text-gray-400 hover:text-white transition-colors">
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
    <div className="group relative mc-panel-oak overflow-hidden transition-transform hover:scale-105 hover:-translate-y-1">
      {/* Image */}
      <div className="aspect-square bg-stone-900 overflow-hidden">
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
          <div className="w-full h-full flex items-center justify-center text-4xl text-stone-700">
            🖼️
          </div>
        )}
      </div>
      
      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
        <p 
          className="text-white text-sm truncate"
          style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '8px' }}
        >
          {asset.name}
        </p>
        <p className="text-gray-400 text-xs mt-1" style={{ fontFamily: "'VT323', monospace" }}>
          📍 {asset.position.x}, {asset.position.y}, {asset.position.z}
        </p>
      </div>

      {/* AI badge */}
      {isAiLookup && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded">
          🔍 AI
        </div>
      )}
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="mc-panel-stone p-6 text-center hover:scale-105 transition-transform">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 
        className="text-white mb-3"
        style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '11px' }}
      >
        {title}
      </h3>
      <p className="text-gray-400" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
        {description}
      </p>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon, 
  color = 'emerald' 
}: { 
  label: string; 
  value: string; 
  icon: string;
  color?: 'emerald' | 'red';
}) {
  const colorClass = color === 'emerald' ? 'text-emerald-400' : 'text-red-400';
  
  return (
    <div className="mc-card p-4 text-center bg-stone-800/50">
      <div className="text-3xl mb-2">{icon}</div>
      <p className={`text-2xl font-bold ${colorClass}`} style={{ fontFamily: "'VT323', monospace" }}>
        {value}
      </p>
      <p className="text-gray-500 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
        {label}
      </p>
    </div>
  );
}
