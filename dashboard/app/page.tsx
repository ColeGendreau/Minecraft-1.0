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
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Hero Section - Minecraft Title Screen Style */}
      <div className="text-center mb-12 relative">
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-emerald-400/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Main Title */}
        <div className="relative">
          <h1 
            className="text-4xl md:text-5xl font-bold mb-6 text-yellow-400 text-shadow-mc animate-pulse"
            style={{ fontFamily: "'Press Start 2P', cursive", lineHeight: '1.4' }}
          >
            WORLD FORGE
          </h1>
          
          {/* Subtitle with typewriter effect */}
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-4" style={{ fontFamily: "'VT323', monospace" }}>
            Create ANY Minecraft world you can imagine using natural language.
          </p>
          
          <p className="text-emerald-400 text-lg animate-pulse" style={{ fontFamily: "'VT323', monospace" }}>
            ⚡ Pink banana world? Ferrari land? Moon base? ANYTHING GOES! ⚡
          </p>
        </div>

        {/* Decorative blocks */}
        <div className="flex justify-center gap-4 mt-8">
          {['🟫', '🟩', '💎', '🟨', '🟫'].map((block, i) => (
            <span 
              key={i} 
              className="text-3xl animate-float"
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              {block}
            </span>
          ))}
        </div>
      </div>

      {/* Infrastructure Control Panel */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">⚙️</span>
          <h2 
            className="text-xl text-white text-shadow-mc-light"
            style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}
          >
            INFRASTRUCTURE
          </h2>
        </div>
        <InfrastructurePanel />
      </section>

      {/* Current World Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌍</span>
            <h2 
              className="text-xl text-white text-shadow-mc-light"
              style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}
            >
              ACTIVE WORLD
            </h2>
          </div>
          
          <Link href="/create" className="mc-button mc-button-grass">
            + NEW WORLD
          </Link>
        </div>

        {loading && (
          <div className="mc-card-dark p-12 text-center rounded-lg">
            <div className="text-4xl mb-4 animate-float">⏳</div>
            <p className="text-gray-400" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
              Loading world data...
            </p>
          </div>
        )}

        {error && (
          <div className="mc-panel-obsidian p-8 text-center rounded-lg">
            <div className="text-4xl mb-4">💀</div>
            <p className="text-red-400 mb-2" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
              {error}
            </p>
            <p className="text-gray-500 text-sm">
              The End? Make sure the server is running!
            </p>
          </div>
        )}

        {!loading && !error && !currentWorld && (
          <div className="mc-card-dark p-12 text-center rounded-lg border-2 border-dashed border-gray-600">
            <div className="text-6xl mb-6 animate-float">🌱</div>
            <p className="text-gray-300 text-xl mb-2" style={{ fontFamily: "'VT323', monospace" }}>
              No world currently deployed
            </p>
            <p className="text-gray-500 mb-6" style={{ fontFamily: "'VT323', monospace" }}>
              The void awaits your creation...
            </p>
            <Link href="/create" className="mc-button mc-button-grass inline-block">
              🏗️ BUILD YOUR FIRST WORLD
            </Link>
          </div>
        )}

        {currentWorld && (
          <div className="mc-card-dark p-6 rounded-lg">
            <div className="flex items-start gap-6">
              <div className="text-6xl animate-float">🌍</div>
              <div className="flex-1">
                <h3 className="text-2xl text-emerald-400 font-bold mb-2" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '12px' }}>
                  {currentWorld.spec.displayName || currentWorld.spec.worldName}
                </h3>
                <p className="text-gray-400 mb-4" style={{ fontFamily: "'VT323', monospace" }}>
                  {currentWorld.spec.theme}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded text-sm">
                    {currentWorld.spec.rules.gameMode}
                  </span>
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm">
                    {currentWorld.spec.rules.difficulty}
                  </span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
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
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">📦</span>
          <h2 
            className="text-xl text-white text-shadow-mc-light"
            style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}
          >
            QUICK ACTIONS
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <ActionCard
            href="/create"
            icon="⚒️"
            title="CRAFT WORLD"
            description="Describe ANY world idea and watch AI bring it to life"
            color="emerald"
          />
          <ActionCard
            href="/worlds"
            icon="📜"
            title="WORLD LIST"
            description="Browse all your world creation requests"
            color="amber"
          />
          <ActionCard
            href="https://github.com/ColeGendreau/Minecraft-1.0"
            external
            icon="🔧"
            title="GITHUB"
            description="View the source code and infrastructure"
            color="purple"
          />
        </div>
      </section>

      {/* Footer Easter Egg */}
      <footer className="mt-16 text-center">
        <p className="text-gray-600 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
          Made with 💎 by Cole Gendreau
        </p>
        <p className="text-gray-700 text-xs mt-2" style={{ fontFamily: "'VT323', monospace" }}>
          Tip: Try clicking things... there might be secrets 🥚
        </p>
      </footer>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
  color,
  external,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  color: 'emerald' | 'amber' | 'purple';
  external?: boolean;
}) {
  const Component = external ? 'a' : Link;
  const props = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  const colorClasses = {
    emerald: 'hover:border-emerald-500/50 hover:shadow-emerald-500/20',
    amber: 'hover:border-amber-500/50 hover:shadow-amber-500/20',
    purple: 'hover:border-purple-500/50 hover:shadow-purple-500/20',
  };

  const glowClasses = {
    emerald: 'group-hover:bg-emerald-500/10',
    amber: 'group-hover:bg-amber-500/10',
    purple: 'group-hover:bg-purple-500/10',
  };

  return (
    <Component
      href={href}
      {...props}
      className={`
        group relative mc-card-dark p-6 rounded-lg border-2 border-gray-700
        transition-all duration-300 hover:scale-105 hover:-translate-y-1
        hover:shadow-lg ${colorClasses[color]}
      `}
    >
      {/* Hover glow */}
      <div className={`absolute inset-0 rounded-lg transition-colors ${glowClasses[color]}`} />
      
      <div className="relative">
        <span className="text-4xl block mb-4 group-hover:animate-float transition-transform">
          {icon}
        </span>
        <h3 
          className="text-white mb-2 text-shadow-mc-light"
          style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}
        >
          {title}
        </h3>
        <p className="text-gray-400 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
          {description}
        </p>
      </div>
    </Component>
  );
}
