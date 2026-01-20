'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getWorlds, deleteWorld, createWorld } from '@/lib/api';
import type { WorldListItem } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';

export default function WorldPage() {
  const [worlds, setWorlds] = useState<WorldListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rebuildingId, setRebuildingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchWorlds = async () => {
    try {
      const response = await getWorlds();
      setWorlds(response.worlds);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load worlds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorlds();
  }, []);

  // Auto-refresh when there's a building world
  useEffect(() => {
    const hasBuilding = worlds.some(w => 
      ['pending', 'planned', 'building'].includes(w.status)
    );
    
    if (!hasBuilding) return;
    
    const interval = setInterval(fetchWorlds, 5000);
    return () => clearInterval(interval);
  }, [worlds]);

  // Get the current deployed world
  const currentWorld = worlds.find(w => w.status === 'deployed');
  
  // Get any world currently being built
  const buildingWorld = worlds.find(w => 
    ['pending', 'planned', 'building'].includes(w.status)
  );
  
  // Get history (past deployed worlds, failed worlds, etc - excluding current and building)
  const historyWorlds = worlds.filter(w => 
    w.id !== currentWorld?.id && 
    w.id !== buildingWorld?.id &&
    w.status !== 'pending' && 
    w.status !== 'planned' && 
    w.status !== 'building'
  );

  const handleRebuild = async (world: WorldListItem) => {
    if (!world.displayName) return;
    
    if (!confirm(`Rebuild "${world.displayName}"? This will replace the current world.`)) {
      return;
    }
    
    setRebuildingId(world.id);
    try {
      // Get the original description from the world details
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/worlds/${world.id}`);
      const details = await response.json();
      
      if (details.request?.description) {
        await createWorld({ description: details.request.description });
        await fetchWorlds();
      } else {
        alert('Could not find original world description');
      }
    } catch (err) {
      alert(`Failed to rebuild: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRebuildingId(null);
    }
  };

  const handleDelete = async (id: string, worldName: string) => {
    if (!confirm(`Delete "${worldName || 'this world'}" from history? This cannot be undone.`)) {
      return;
    }
    
    setDeletingId(id);
    try {
      await deleteWorld(id);
      await fetchWorlds();
    } catch (err) {
      alert(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Loading world status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mc-panel-oak p-8 text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <p className="text-text-secondary">Make sure the coordinator API is running.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Current World</h1>
          <p className="text-text-muted mt-1">Your active Minecraft world</p>
        </div>
        <Link
          href="/create"
          className="mc-btn-primary px-6 py-3 text-lg font-bold"
        >
          ⚒️ Forge New World
        </Link>
      </div>

      {/* Building World Alert */}
      {buildingWorld && (
        <div className="mc-panel-oak border-2 border-yellow-500/50 p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-400 text-lg">
                🔨 New World Building...
              </h3>
              <p className="text-text-secondary mt-1">
                {buildingWorld.displayName || 'Custom World'}
              </p>
              <p className="text-sm text-text-muted mt-1">
                This will replace the current world when complete
              </p>
            </div>
            <StatusBadge status={buildingWorld.status} />
          </div>
        </div>
      )}

      {/* Current World */}
      {currentWorld ? (
        <div className="mc-panel-stone p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-text-primary">
                  {currentWorld.displayName || currentWorld.worldName || 'Active World'}
                </h2>
                <StatusBadge status="deployed" />
              </div>
              <p className="text-sm text-text-muted font-mono">{currentWorld.id}</p>
            </div>
          </div>

          <Link
            href={`/worlds/${currentWorld.id}`}
            className="inline-flex items-center gap-2 text-accent-primary hover:text-accent-primary/80 transition-colors"
          >
            View full details →
          </Link>
        </div>
      ) : (
        <div className="mc-panel-oak p-8 text-center mb-8">
          <p className="text-text-secondary text-lg mb-4">
            No world currently deployed
          </p>
          <Link
            href="/create"
            className="mc-btn-primary px-6 py-3 font-bold inline-block"
          >
            Create Your First World
          </Link>
        </div>
      )}

      {/* History */}
      {historyWorlds.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            World History
          </h2>
          <div className="space-y-3">
            {historyWorlds.map((world) => (
              <div
                key={world.id}
                className="mc-panel-oak p-4 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-text-primary truncate">
                      {world.displayName || world.worldName || 'Unnamed World'}
                    </h3>
                    <StatusBadge status={world.status} size="sm" />
                  </div>
                  <p className="text-sm text-text-muted">
                    {new Date(world.requestedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {world.status === 'deployed' || world.status === 'failed' ? (
                    <button
                      onClick={() => handleRebuild(world)}
                      disabled={rebuildingId === world.id || !!buildingWorld}
                      className="px-3 py-1.5 bg-accent-primary/20 text-accent-primary rounded text-sm font-medium hover:bg-accent-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={buildingWorld ? 'Wait for current build to finish' : 'Rebuild this world'}
                    >
                      {rebuildingId === world.id ? '...' : '🔄 Rebuild'}
                    </button>
                  ) : null}
                  <button
                    onClick={() => handleDelete(world.id, world.displayName || world.worldName || 'this world')}
                    disabled={deletingId === world.id}
                    className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    {deletingId === world.id ? '...' : '🗑️'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no history */}
      {!currentWorld && !buildingWorld && historyWorlds.length === 0 && (
        <div className="text-center py-12">
          <p className="text-6xl mb-4">🌍</p>
          <p className="text-text-muted">
            Your world history will appear here
          </p>
        </div>
      )}
    </div>
  );
}
