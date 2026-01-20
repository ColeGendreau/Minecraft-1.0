'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getAssetsStatus, getAssets, nukeAllAssets, checkHealth } from '@/lib/api';
import type { Asset } from '@/lib/api';
import { InfrastructurePanel } from '@/components/InfrastructurePanel';

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showNukeConfirm, setShowNukeConfirm] = useState(false);
  const [nukeLoading, setNukeLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Check if API is healthy
      await checkHealth();
      // Check if AI is available
      const [status, assetsData] = await Promise.all([
        getAssetsStatus(),
        getAssets()
      ]);
      setAiAvailable(status.aiImageGeneration.available);
      setAssets(assetsData.assets);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        if (!err.message.includes('timed out')) {
          setError(err.message);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleNuke = async () => {
    setShowNukeConfirm(false);
    setNukeLoading(true);
    try {
      await nukeAllAssets();
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to nuke assets');
    } finally {
      setNukeLoading(false);
    }
  };

  return (
    <main className="content-wrapper max-w-7xl mx-auto px-6 py-8">
      {/* Nuke Confirmation Modal */}
      {showNukeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="mc-panel-stone p-8 max-w-md">
            <div className="text-center">
              <div className="text-6xl mb-4">☢️</div>
              <h2 
                className="text-xl text-red-700 mb-4"
                style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}
              >
                NUKE ALL ASSETS?
              </h2>
              <p className="text-amber-800 mb-6" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                This will DELETE all {assets.length} assets from the Minecraft world. 
                The area will be cleared and reset.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowNukeConfirm(false)}
                  className="mc-button-stone"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleNuke}
                  className="mc-button-stone !bg-red-700 !border-red-900"
                >
                  ☢️ CONFIRM NUKE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section - Bright Minecraft Style */}
      <div className="text-center mb-12">
        {/* Main Title - Minecraft logo style */}
        <div className="relative inline-block">
          <h1 
            className="text-4xl md:text-5xl font-bold mb-4 text-shadow-mc"
            style={{ 
              fontFamily: "'Press Start 2P', cursive", 
              lineHeight: '1.4',
              color: '#3D2817',
              WebkitTextStroke: '2px #1A0A00',
            }}
          >
            WORLD FORGE
          </h1>
          
          {/* Decorative pickaxe */}
          <span className="absolute -right-12 top-0 text-4xl animate-float">⛏️</span>
        </div>
        
        {/* Subtitle */}
        <p className="text-xl max-w-2xl mx-auto mb-3" style={{ fontFamily: "'VT323', monospace", fontSize: '26px', color: '#2D1810', textShadow: '1px 1px 0 rgba(255,255,255,0.5)' }}>
          Build pixel art assets in Minecraft from images or AI prompts - LIVE!
        </p>
        
        <p className="text-lg" style={{ fontFamily: "'VT323', monospace", fontSize: '22px', color: '#1a5c1a', textShadow: '1px 1px 0 rgba(255,255,255,0.4)' }}>
          ⚡ Company logos? Game characters? AI-generated art? Watch them build in real-time! ⚡
        </p>

        {/* Decorative blocks row */}
        <div className="flex justify-center gap-3 mt-6">
          {['🟫', '🟩', '💎', '⬜', '🟨', '🟩', '🟫'].map((block, i) => (
            <span 
              key={i} 
              className="text-2xl animate-float drop-shadow-lg"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              {block}
            </span>
          ))}
        </div>
      </div>

      {/* Infrastructure Control Panel */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚙️</span>
          <h2 
            className="text-amber-900 font-bold tracking-wide"
            style={{ fontFamily: "'VT323', monospace", fontSize: '24px', textShadow: '1px 1px 0 rgba(255,255,255,0.4)' }}
          >
            SERVER CONTROL
          </h2>
        </div>
        <InfrastructurePanel />
      </section>

      {/* Assets Section - PRIMARY ACTION */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            <h2 
              className="text-amber-900 text-shadow-mc-light"
              style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}
            >
              PIXEL ART ASSETS
            </h2>
            {assets.length > 0 && (
              <span className="px-2 py-1 bg-amber-200 text-amber-800 rounded text-sm border-2 border-amber-400">
                {assets.length} built
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Link href="/assets/create" className="mc-button-grass">
              + NEW ASSET
            </Link>
            {assets.length > 0 && (
              <button
                onClick={() => setShowNukeConfirm(true)}
                disabled={nukeLoading}
                className="mc-button-stone !bg-red-700 !border-red-900 hover:!bg-red-600"
              >
                {nukeLoading ? '☢️...' : '☢️ NUKE'}
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="mc-card p-12 text-center">
            <div className="text-4xl mb-4 animate-float">⏳</div>
            <p className="text-gray-600" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
              Loading...
            </p>
          </div>
        )}

        {error && (
          <div className="mc-panel-stone p-8 text-center">
            <div className="text-4xl mb-4">💀</div>
            <p className="text-red-700 mb-2" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
              {error}
            </p>
            <p className="text-gray-500 text-sm">
              Make sure the server is running!
            </p>
          </div>
        )}

        {!loading && !error && assets.length === 0 && (
          <div className="mc-card p-8 text-center border-4 border-dashed border-amber-400">
            <div className="text-6xl mb-6 animate-float">🖼️</div>
            <p className="text-amber-800 text-xl mb-2" style={{ fontFamily: "'VT323', monospace" }}>
              No assets yet - build your first one!
            </p>
            <p className="text-gray-500 mb-6" style={{ fontFamily: "'VT323', monospace" }}>
              Upload an image URL or use AI to generate one - then watch it build block by block.
            </p>
            <Link href="/assets/create" className="mc-button-grass inline-block">
              🎨 CREATE YOUR FIRST ASSET
            </Link>
          </div>
        )}

        {!loading && !error && assets.length > 0 && (
          <div className="mc-card p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-amber-700" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                You have {assets.length} asset{assets.length !== 1 ? 's' : ''} built in Minecraft
              </p>
              <Link href="/assets" className="text-amber-600 hover:text-amber-800" style={{ fontFamily: "'VT323', monospace" }}>
                View all →
              </Link>
            </div>
            
            {/* Preview of recent assets */}
            <div className="grid grid-cols-4 gap-3">
              {assets.slice(0, 4).map((asset) => (
                <div key={asset.id} className="aspect-square bg-amber-100 rounded border-2 border-amber-300 overflow-hidden">
                  {(asset.generatedImageUrl || asset.imageUrl) ? (
                    <img 
                      src={asset.generatedImageUrl || asset.imageUrl || ''} 
                      alt={asset.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl text-amber-400">
                      🖼️
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex justify-center gap-4">
              <Link href="/assets/create" className="mc-button-grass">
                🎨 CREATE MORE
              </Link>
              <Link href="/assets" className="mc-button-stone">
                📋 MANAGE ASSETS
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Quick Actions - Crafting Table Style */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📦</span>
          <h2 
            className="text-amber-900 text-shadow-mc-light"
            style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}
          >
            QUICK ACTIONS
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <ActionCard
            href="/assets/create"
            icon="🎨"
            title="CREATE ASSET"
            description="Build pixel art from images or AI-generated art"
            bgColor="bg-gradient-to-br from-green-100 to-green-200"
            borderColor="border-green-400"
          />
          <ActionCard
            href="/assets"
            icon="📋"
            title="MY ASSETS"
            description="View, duplicate, or delete your built assets"
            bgColor="bg-gradient-to-br from-amber-100 to-amber-200"
            borderColor="border-amber-400"
          />
          <ActionCard
            href="https://github.com/ColeGendreau/Minecraft-1.0"
            external
            icon="🔧"
            title="GITHUB"
            description="View the source code and infrastructure"
            bgColor="bg-gradient-to-br from-blue-100 to-blue-200"
            borderColor="border-blue-400"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 text-center">
        <p className="text-amber-700 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
          Made with 💎 by Cole Gendreau
        </p>
      </footer>
    </main>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
  bgColor,
  borderColor,
  external,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  bgColor: string;
  borderColor: string;
  external?: boolean;
}) {
  const Component = external ? 'a' : Link;
  const props = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <Component
      href={href}
      {...props}
      className={`
        group relative p-6 rounded border-4 ${bgColor} ${borderColor}
        transition-all duration-200 hover:scale-105 hover:-translate-y-1
        hover:shadow-lg
      `}
      style={{
        boxShadow: 'inset 2px 2px 0 rgba(255,255,255,0.5), inset -2px -2px 0 rgba(0,0,0,0.1), 4px 4px 0 rgba(0,0,0,0.2)'
      }}
    >
      <span className="text-4xl block mb-4 group-hover:animate-float">
        {icon}
      </span>
      <h3 
        className="text-amber-900 mb-2"
        style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}
      >
        {title}
      </h3>
      <p className="text-amber-700 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
        {description}
      </p>
    </Component>
  );
}
