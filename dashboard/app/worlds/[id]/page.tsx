'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getWorldDetails, retryWorld } from '@/lib/api';
import type { WorldDetailResponse } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';

export default function WorldDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [world, setWorld] = useState<WorldDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const fetchWorld = useCallback(async () => {
    try {
      const data = await getWorldDetails(id);
      setWorld(data);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWorld();
    
    // Auto-refresh for pending/building states
    const interval = setInterval(() => {
      if (world && ['pending', 'planned', 'building'].includes(world.status)) {
        fetchWorld();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchWorld, world]);

  const handleRetry = async () => {
    if (!world || retrying) return;
    
    setRetrying(true);
    try {
      await retryWorld(id);
      await fetchWorld();
    } catch (err) {
      if (err instanceof Error) {
        alert(`Failed to retry: ${err.message}`);
      }
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Loading world details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !world) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-surface-raised border border-accent-error/30 rounded-xl p-8 text-center">
          <p className="text-accent-error text-lg mb-4">{error || 'World not found'}</p>
          <Link
            href="/worlds"
            className="text-accent-primary hover:text-accent-primary/80"
          >
            ← Back to all worlds
          </Link>
        </div>
      </div>
    );
  }

  const isProcessing = ['pending', 'planned', 'building'].includes(world.status);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/worlds"
            className="text-sm text-text-muted hover:text-accent-primary mb-2 inline-block"
          >
            ← Back to all worlds
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">
            {world.worldSpec?.displayName || world.worldSpec?.worldName || 'World Request'}
          </h1>
          <p className="text-text-muted font-mono text-sm mt-1">{world.id}</p>
        </div>
        <StatusBadge status={world.status} />
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="bg-surface-raised border border-accent-primary/30 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
            <div>
              <h3 className="font-semibold text-text-primary">
                {world.status === 'pending' && 'AI is interpreting your vision...'}
                {world.status === 'planned' && 'WorldSpec generated, building artifacts...'}
                {world.status === 'building' && 'Creating world configuration...'}
              </h3>
              <p className="text-sm text-text-secondary">This usually takes 1-2 minutes</p>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {world.status === 'failed' && world.error && (
        <div className="bg-accent-error/10 border border-accent-error/30 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-accent-error mb-2">World Creation Failed</h3>
          <p className="text-text-secondary mb-4">{world.error.message}</p>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="px-4 py-2 bg-accent-error rounded-lg text-white font-medium hover:bg-accent-error/80 transition-colors disabled:opacity-50"
          >
            {retrying ? 'Retrying...' : 'Retry Request'}
          </button>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Original Request */}
        <div className="bg-surface-raised border border-surface-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Original Request</h2>
          <div className="bg-surface rounded-lg p-4 mb-4">
            <p className="text-text-primary whitespace-pre-wrap">{world.request.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted block">Requested by</span>
              <span className="text-text-primary">{world.requestedBy}</span>
            </div>
            <div>
              <span className="text-text-muted block">Created</span>
              <span className="text-text-primary">
                {new Date(world.requestedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Status & Links */}
        <div className="bg-surface-raised border border-surface-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Status & Links</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-surface-border">
              <span className="text-text-muted">Status</span>
              <StatusBadge status={world.status} size="sm" />
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-surface-border">
              <span className="text-text-muted">Last Updated</span>
              <span className="text-text-primary text-sm">
                {new Date(world.updatedAt).toLocaleString()}
              </span>
            </div>

            {world.prUrl && (
              <div className="flex justify-between items-center py-3 border-b border-surface-border">
                <span className="text-text-muted">Pull Request</span>
                <a
                  href={world.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-primary hover:text-accent-primary/80 text-sm"
                >
                  View PR →
                </a>
              </div>
            )}

            {world.commitSha && (
              <div className="flex justify-between items-center py-3">
                <span className="text-text-muted">Commit</span>
                <span className="text-text-primary font-mono text-sm">
                  {world.commitSha.slice(0, 12)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generated WorldSpec */}
      {world.worldSpec && (
        <div className="mt-8 bg-surface-raised border border-surface-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Generated WorldSpec
            <span className="text-sm font-normal text-text-muted ml-2">
              (AI interpretation of your request)
            </span>
          </h2>

          {/* Key properties */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <PropertyCard
              label="World Name"
              value={world.worldSpec.worldName}
            />
            <PropertyCard
              label="Difficulty"
              value={world.worldSpec.rules.difficulty}
            />
            <PropertyCard
              label="Game Mode"
              value={world.worldSpec.rules.gameMode}
            />
            <PropertyCard
              label="Level Type"
              value={world.worldSpec.generation.levelType || 'default'}
            />
            <PropertyCard
              label="Generation Strategy"
              value={world.worldSpec.generation.strategy}
            />
            <PropertyCard
              label="Max Players"
              value={world.worldSpec.server?.maxPlayers?.toString() || '20'}
            />
          </div>

          {/* Theme */}
          <div className="mb-6">
            <span className="text-xs text-text-muted uppercase tracking-wide block mb-2">
              AI Interpretation (Theme)
            </span>
            <p className="text-text-primary bg-surface rounded-lg p-4">
              {world.worldSpec.theme}
            </p>
          </div>

          {/* Biomes */}
          {world.worldSpec.generation.biomes && world.worldSpec.generation.biomes.length > 0 && (
            <div className="mb-6">
              <span className="text-xs text-text-muted uppercase tracking-wide block mb-2">
                Selected Biomes
              </span>
              <div className="flex flex-wrap gap-2">
                {world.worldSpec.generation.biomes.map((biome) => (
                  <span
                    key={biome}
                    className="px-3 py-1 bg-accent-primary/20 text-accent-primary rounded-full text-sm capitalize"
                  >
                    {biome.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Full JSON (collapsible) */}
          <details className="mt-6">
            <summary className="cursor-pointer text-text-muted hover:text-accent-primary transition-colors">
              View Raw JSON
            </summary>
            <pre className="mt-4 bg-surface rounded-lg p-4 text-xs overflow-x-auto text-text-secondary">
              {JSON.stringify(world.worldSpec, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function PropertyCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface rounded-lg p-3">
      <span className="text-xs text-text-muted block">{label}</span>
      <span className="text-text-primary font-medium capitalize">{value}</span>
    </div>
  );
}

