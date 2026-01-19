'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentWorld } from '@/lib/api';
import type { CurrentWorldResponse } from '@/lib/types';
import { InfrastructurePanel } from '@/components/InfrastructurePanel';

export default function HomePage() {
  const [currentWorld, setCurrentWorld] = useState<CurrentWorldResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCurrentWorld() {
      try {
        const world = await getCurrentWorld();
        setCurrentWorld(world);
      } catch (err) {
        if (err instanceof Error) {
          if (!err.message.includes('No world') && !err.message.includes('timed out')) {
            setError(err.message);
          }
        }
      } finally {
        setLoading(false);
      }
    }

    fetchCurrentWorld();
  }, []);

  return (
    <main className="content-wrapper max-w-7xl mx-auto px-6 py-8">
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
          Create ANY Minecraft world you can imagine using natural language.
        </p>
        
        <p className="text-lg" style={{ fontFamily: "'VT323', monospace", fontSize: '22px', color: '#1a5c1a', textShadow: '1px 1px 0 rgba(255,255,255,0.4)' }}>
          ⚡ Underwater kingdom? Floating steampunk city? Candy forest? ANYTHING GOES! ⚡
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

      {/* Current World Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌍</span>
            <h2 
              className="text-amber-900 text-shadow-mc-light"
              style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}
            >
              ACTIVE WORLD
            </h2>
          </div>
          
          <Link href="/create" className="mc-button-grass">
            + NEW WORLD
          </Link>
        </div>

        {loading && (
          <div className="mc-card p-12 text-center">
            <div className="text-4xl mb-4 animate-float">⏳</div>
            <p className="text-gray-600" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
              Loading world data...
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

        {!loading && !error && !currentWorld && (
          <div className="mc-card p-12 text-center border-4 border-dashed border-amber-400">
            <div className="text-6xl mb-6 animate-float">🌱</div>
            <p className="text-amber-800 text-xl mb-2" style={{ fontFamily: "'VT323', monospace" }}>
              No world currently deployed
            </p>
            <p className="text-gray-500 mb-6" style={{ fontFamily: "'VT323', monospace" }}>
              The void awaits your creation...
            </p>
            <Link href="/create" className="mc-button-grass inline-block">
              🏗️ BUILD YOUR FIRST WORLD
            </Link>
          </div>
        )}

        {currentWorld && (
          <div className="mc-panel-oak p-6">
            <div className="flex items-start gap-6">
              <div className="text-6xl animate-float">🌍</div>
              <div className="flex-1">
                <h3 className="text-xl text-amber-900 font-bold mb-2" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '12px' }}>
                  {currentWorld.spec.displayName || currentWorld.spec.worldName}
                </h3>
                <p className="text-amber-700 mb-4" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                  {currentWorld.spec.theme}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-green-200 text-green-800 rounded text-sm border-2 border-green-400">
                    {currentWorld.spec.rules.gameMode}
                  </span>
                  <span className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded text-sm border-2 border-yellow-400">
                    {currentWorld.spec.rules.difficulty}
                  </span>
                  <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded text-sm border-2 border-blue-400">
                    {currentWorld.spec.generation.levelType}
                  </span>
                </div>
              </div>
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
            href="/create"
            icon="⚒️"
            title="CRAFT WORLD"
            description="Describe ANY world idea and watch AI bring it to life"
            bgColor="bg-gradient-to-br from-green-100 to-green-200"
            borderColor="border-green-400"
          />
          <ActionCard
            href="/worlds"
            icon="📜"
            title="WORLD LIST"
            description="Browse all your world creation requests"
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
