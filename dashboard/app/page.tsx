'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentWorld } from '@/lib/api';
import type { CurrentWorldResponse } from '@/lib/types';
import { WorldCard } from '@/components/WorldCard';
import { InfrastructurePanel } from '@/components/InfrastructurePanel';
import { WorkflowProgress } from '@/components/WorkflowProgress';

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
          // Don't show error if it's just "no world deployed" or timeout
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
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary bg-clip-text text-transparent">
          World Forge
        </h1>
        <p className="text-xl text-text-secondary max-w-2xl mx-auto">
          Create ANY Minecraft world you can imagine using natural language.
          <span className="block mt-2 text-accent-primary font-medium">
            Pink banana world? Ferrari land? Anything goes.
          </span>
        </p>
      </div>

      {/* Infrastructure Control Panel */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-6 flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-accent-primary animate-pulse" />
          Infrastructure Control
        </h2>
        <InfrastructurePanel />
      </section>

      {/* Live Workflow Progress */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Deployment Progress
        </h2>
        <WorkflowProgress />
      </section>

      {/* Current World Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-text-primary">
            Active World Configuration
          </h2>
          <Link
            href="/create"
            className="px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-lg font-medium text-surface hover:opacity-90 transition-opacity glow-diamond"
          >
            Create New World
          </Link>
        </div>

        {loading && (
          <div className="bg-surface-raised border border-surface-border rounded-xl p-12 text-center">
            <div className="w-12 h-12 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Loading current world...</p>
          </div>
        )}

        {error && (
          <div className="bg-surface-raised border border-accent-error/30 rounded-xl p-8 text-center">
            <p className="text-accent-error mb-4">{error}</p>
            <p className="text-text-secondary text-sm">
              Make sure the coordinator API is running on localhost:3001
            </p>
          </div>
        )}

        {!loading && !error && !currentWorld && (
          <div className="bg-surface-raised border border-surface-border rounded-xl p-8 text-center">
            <span className="text-4xl mb-4 block">🌍</span>
            <p className="text-text-secondary">No world currently deployed</p>
            <Link
              href="/create"
              className="inline-block mt-4 px-6 py-3 bg-accent-primary rounded-lg font-medium text-surface hover:opacity-90 transition-opacity"
            >
              Create Your First World
            </Link>
          </div>
        )}

        {currentWorld && (
          <div className="grid lg:grid-cols-2 gap-8">
            <WorldCard
              worldSpec={currentWorld.spec}
              status="deployed"
              deployedAt={currentWorld.deployedAt}
              commitSha={currentWorld.commitSha}
              commitUrl={currentWorld.commitUrl}
            />
            
            {/* World Details */}
            <div className="bg-surface-raised border border-surface-border rounded-xl p-6 space-y-6">
              <h3 className="text-lg font-semibold text-text-primary">Server Configuration</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <InfoCard
                  label="Max Players"
                  value={currentWorld.spec.server?.maxPlayers?.toString() || '20'}
                />
                <InfoCard
                  label="View Distance"
                  value={`${currentWorld.spec.server?.viewDistance || 10} chunks`}
                />
                <InfoCard
                  label="Level Type"
                  value={currentWorld.spec.generation.levelType || 'default'}
                />
                <InfoCard
                  label="Seed"
                  value={currentWorld.spec.generation.seed || 'Random'}
                />
              </div>

              {currentWorld.spec.server?.motd && (
                <div className="pt-4 border-t border-surface-border">
                  <span className="text-xs text-text-muted block mb-2">MOTD</span>
                  <p className="text-text-primary font-mono text-sm bg-surface rounded-lg p-3">
                    {currentWorld.spec.server.motd}
                  </p>
                </div>
              )}

              {/* Structures */}
              {currentWorld.spec.generation.structures && (
                <div className="pt-4 border-t border-surface-border">
                  <span className="text-xs text-text-muted block mb-3">Enabled Structures</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(currentWorld.spec.generation.structures)
                      .filter(([, enabled]) => enabled)
                      .map(([structure]) => (
                        <span
                          key={structure}
                          className="text-xs px-2 py-1 rounded bg-accent-success/20 text-accent-success capitalize"
                        >
                          {structure.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="grid md:grid-cols-3 gap-6">
        <ActionCard
          href="/create"
          icon="✨"
          title="Create New World"
          description="Describe ANY world idea - pink banana land, Ferrari world, anything!"
        />
        <ActionCard
          href="/worlds"
          icon="📜"
          title="View All Worlds"
          description="Browse history of all world creation requests"
        />
        <ActionCard
          href="https://github.com/ColeGendreau/Minecraft-1.0"
          external
          icon="🔧"
          title="GitHub Repo"
          description="View the infrastructure and deployment code"
        />
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface/50 rounded-lg p-3">
      <span className="text-xs text-text-muted block">{label}</span>
      <span className="text-text-primary font-medium capitalize">{value}</span>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
  external,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  external?: boolean;
}) {
  const Component = external ? 'a' : Link;
  const props = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <Component
      href={href}
      {...props}
      className="bg-surface-raised border border-surface-border rounded-xl p-6 hover:border-accent-primary/30 hover:bg-surface-overlay transition-all duration-300 group"
    >
      <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform">
        {icon}
      </span>
      <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-accent-primary transition-colors">
        {title}
      </h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </Component>
  );
}
