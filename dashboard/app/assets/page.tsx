'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getAssets, getAssetsStatus, deleteAsset, duplicateAsset, nukeAllAssets } from '@/lib/api';
import type { Asset, AssetStatusResponse } from '@/lib/api';

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [status, setStatus] = useState<AssetStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showNukeConfirm, setShowNukeConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [assetsData, statusData] = await Promise.all([
        getAssets(),
        getAssetsStatus()
      ]);
      setAssets(assetsData.assets);
      setStatus(statusData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Delete "${asset.name}"? This will clear it from the Minecraft world.`)) return;
    
    setActionLoading(asset.id);
    try {
      await deleteAsset(asset.id);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete asset');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (asset: Asset) => {
    setActionLoading(`dup-${asset.id}`);
    try {
      await duplicateAsset(asset.id);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to duplicate asset');
    } finally {
      setActionLoading(null);
    }
  };

  const handleNuke = async () => {
    setShowNukeConfirm(false);
    setActionLoading('nuke');
    try {
      const result = await nukeAllAssets();
      alert(`☢️ Nuked ${result.deletedCount} assets!`);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to nuke assets');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <main className="content-wrapper max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-amber-600 hover:text-amber-800 transition-colors">
            ← Back
          </Link>
          <div>
            <h1 
              className="text-2xl text-amber-900"
              style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '18px' }}
            >
              🎨 ASSETS
            </h1>
            <p className="text-amber-700 mt-1" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
              Build pixel art in your world from images or AI prompts
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/assets/create" className="mc-button-grass">
            + NEW ASSET
          </Link>
          
          {assets.length > 0 && (
            <button
              onClick={() => setShowNukeConfirm(true)}
              disabled={actionLoading === 'nuke'}
              className="mc-button-stone !bg-red-700 !border-red-900 hover:!bg-red-600"
            >
              {actionLoading === 'nuke' ? '☢️ NUKING...' : '☢️ NUKE ALL'}
            </button>
          )}
        </div>
      </div>

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
                The area will be cleared and reset to vanilla terrain.
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

      {/* AI Status */}
      {status && (
        <div className={`mc-card p-4 mb-6 ${status.aiImageGeneration.available ? 'border-green-400' : 'border-amber-400'}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {status.aiImageGeneration.available ? '🔍' : '📷'}
            </span>
            <div>
              <p className="text-amber-800 font-medium" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                {status.aiImageGeneration.available 
                  ? '✨ AI Image Lookup ENABLED'
                  : '📷 Image URL Mode Only'}
              </p>
              <p className="text-amber-600 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
                {status.aiImageGeneration.note}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="mc-card p-12 text-center">
          <div className="text-4xl mb-4 animate-float">⏳</div>
          <p className="text-gray-600" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
            Loading assets...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mc-panel-stone p-8 text-center">
          <div className="text-4xl mb-4">💀</div>
          <p className="text-red-700 mb-2" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
            {error}
          </p>
          <button onClick={fetchData} className="mc-button-stone mt-4">
            TRY AGAIN
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && assets.length === 0 && (
        <div className="mc-card p-12 text-center border-4 border-dashed border-amber-400">
          <div className="text-6xl mb-6 animate-float">🖼️</div>
          <p className="text-amber-800 text-xl mb-2" style={{ fontFamily: "'VT323', monospace" }}>
            No assets yet!
          </p>
          <p className="text-gray-500 mb-6" style={{ fontFamily: "'VT323', monospace" }}>
            Create your first pixel art asset from an image or AI prompt.
          </p>
          <Link href="/assets/create" className="mc-button-grass inline-block">
            🎨 CREATE YOUR FIRST ASSET
          </Link>
        </div>
      )}

      {/* Assets Grid */}
      {!loading && !error && assets.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onDelete={() => handleDelete(asset)}
              onDuplicate={() => handleDuplicate(asset)}
              isDeleting={actionLoading === asset.id}
              isDuplicating={actionLoading === `dup-${asset.id}`}
            />
          ))}
        </div>
      )}

      {/* Stats */}
      {!loading && assets.length > 0 && (
        <div className="mt-8 text-center text-amber-600" style={{ fontFamily: "'VT323', monospace" }}>
          {assets.length} asset{assets.length !== 1 ? 's' : ''} in world
        </div>
      )}
    </main>
  );
}

function AssetCard({
  asset,
  onDelete,
  onDuplicate,
  isDeleting,
  isDuplicating,
}: {
  asset: Asset;
  onDelete: () => void;
  onDuplicate: () => void;
  isDeleting: boolean;
  isDuplicating: boolean;
}) {
  const imageUrl = asset.generatedImageUrl || asset.imageUrl;
  const isAiGenerated = !!asset.prompt;

  return (
    <div className="mc-panel-oak p-4 relative group">
      {/* Image Preview */}
      <div className="aspect-square bg-amber-100 rounded mb-3 overflow-hidden border-2 border-amber-300">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={asset.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.png';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-amber-400">
            🖼️
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mb-3">
        <h3 
          className="text-amber-900 font-bold truncate"
          style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}
        >
          {asset.name}
        </h3>
        
        {asset.prompt && (
          <p className="text-amber-600 text-sm truncate mt-1" style={{ fontFamily: "'VT323', monospace" }}>
            🤖 &quot;{asset.prompt}&quot;
          </p>
        )}

        <div className="flex items-center gap-2 mt-2 text-xs text-amber-500" style={{ fontFamily: "'VT323', monospace" }}>
          <span>📍 {asset.position.x}, {asset.position.y}, {asset.position.z}</span>
          <span>•</span>
          <span>{asset.dimensions.width}×{asset.dimensions.height}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onDuplicate}
          disabled={isDuplicating}
          className="flex-1 mc-button-stone text-xs py-1"
        >
          {isDuplicating ? '...' : '📋 Copy'}
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="flex-1 mc-button-stone text-xs py-1 !bg-red-700 !border-red-900"
        >
          {isDeleting ? '...' : '🗑️ Delete'}
        </button>
      </div>

      {/* Badge */}
      {isAiGenerated && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded">
          🔍 AI
        </div>
      )}
    </div>
  );
}

