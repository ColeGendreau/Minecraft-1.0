'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getAssets, getAssetsStatus, deleteAsset, duplicateAsset, nukeAllAssets } from '@/lib/api';
import type { Asset, AssetStatusResponse } from '@/lib/api';
import { useTheme } from '@/lib/theme-context';

export default function AssetsPage() {
  const { isDay } = useTheme();
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
    <main className={`min-h-screen transition-colors duration-500 ${
      isDay 
        ? 'bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-200' 
        : 'bg-gradient-to-b from-slate-900 via-purple-900/30 to-slate-800'
    }`}>
      {/* Sky decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {isDay ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="absolute animate-float opacity-60" style={{ left: `${(i * 20) % 100}%`, top: `${5 + (i * 6) % 15}%`, animationDelay: `${i * 0.7}s`, animationDuration: `${4 + (i % 3)}s` }}>
              <div className="flex gap-1">
                <div className="w-10 h-6 bg-white rounded-lg" />
                <div className="w-14 h-8 bg-white rounded-lg -mt-1" />
                <div className="w-8 h-5 bg-white rounded-lg" />
              </div>
            </div>
          ))
        ) : (
          [...Array(20)].map((_, i) => (
            <div key={i} className="absolute animate-pulse" style={{ left: `${(i * 5) % 100}%`, top: `${(i * 5) % 50}%`, animationDelay: `${i * 0.1}s` }}>
              <span className="text-white text-xs">✦</span>
            </div>
          ))
        )}
      </div>

      {/* Nuke Modal */}
      {showNukeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`p-8 max-w-md rounded-lg border-4 shadow-2xl ${isDay ? 'bg-white border-red-500' : 'bg-slate-800 border-red-700'}`}>
            <div className="text-center">
              <div className="text-6xl mb-4">☢️</div>
              <h2 className="text-xl text-red-500 mb-4" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}>
                NUKE ALL ASSETS?
              </h2>
              <p className={`mb-6 ${isDay ? 'text-gray-700' : 'text-gray-300'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                This will DELETE all {assets.length} assets from the Minecraft world.
              </p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => setShowNukeConfirm(false)} className="mc-button-stone">CANCEL</button>
                <button onClick={handleNuke} className="mc-button-stone !bg-red-600 !border-red-800">☢️ CONFIRM</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-8 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className={`font-bold px-3 py-1 rounded transition-colors ${isDay ? 'text-amber-700 hover:text-amber-900 bg-white/50' : 'text-slate-300 hover:text-white bg-slate-800/50'}`}>
              ← Back
            </Link>
            <div>
              <h1 className={isDay ? 'text-2xl text-amber-900' : 'text-2xl text-white'} style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '16px' }}>
                🖼️ ASSET GALLERY
              </h1>
              <p className={`mt-1 ${isDay ? 'text-amber-800' : 'text-slate-400'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                All pixel art built in the Minecraft world
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/assets/create" className="mc-button-grass shadow-lg">+ NEW ASSET</Link>
            {assets.length > 0 && (
              <button onClick={() => setShowNukeConfirm(true)} disabled={actionLoading === 'nuke'} className="mc-button-stone !bg-red-600 !border-red-800 hover:!bg-red-700 shadow-lg">
                {actionLoading === 'nuke' ? '☢️...' : '☢️ NUKE'}
              </button>
            )}
          </div>
        </div>

        {/* AI Status */}
        {status && (
          <div className={`p-4 mb-6 rounded-lg border-4 shadow-lg ${
            status.aiImageGeneration.available 
              ? (isDay ? 'bg-white/90 border-emerald-400' : 'bg-slate-800/90 border-emerald-700')
              : (isDay ? 'bg-white/90 border-amber-400' : 'bg-slate-800/90 border-amber-700')
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{status.aiImageGeneration.available ? '🔍' : '📷'}</span>
            <div>
              <p className={`font-bold ${isDay ? 'text-gray-800' : 'text-white'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                {status.aiImageGeneration.available ? '✨ Image Search ENABLED' : '📷 Image URL Mode Only'}
              </p>
              <p className={`text-sm ${isDay ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
                {status.aiImageGeneration.note}
              </p>
            </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className={`p-12 text-center rounded-lg border-4 shadow-xl ${isDay ? 'bg-white/90 border-amber-400' : 'bg-slate-800/90 border-slate-600'}`}>
            <div className="text-4xl mb-4 animate-bounce">⛏️</div>
            <p className={`text-xl ${isDay ? 'text-amber-800' : 'text-slate-300'}`} style={{ fontFamily: "'VT323', monospace" }}>Mining assets...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className={`p-8 text-center rounded-lg border-4 shadow-xl ${isDay ? 'bg-red-50 border-red-400' : 'bg-red-900/30 border-red-700'}`}>
            <div className="text-4xl mb-4">💀</div>
            <p className="text-red-500 mb-2 text-xl" style={{ fontFamily: "'VT323', monospace" }}>{error}</p>
            <button onClick={fetchData} className="mc-button-stone mt-4">TRY AGAIN</button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && assets.length === 0 && (
          <div className={`p-12 text-center rounded-lg border-4 border-dashed shadow-xl ${isDay ? 'bg-emerald-50/90 border-emerald-400' : 'bg-emerald-900/30 border-emerald-700'}`}>
            <div className="text-8xl mb-6 animate-float">🎨</div>
            <h3 className={`text-xl mb-4 ${isDay ? 'text-emerald-800' : 'text-emerald-300'}`} style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}>
              NO ASSETS YET
            </h3>
            <p className={`mb-6 text-xl ${isDay ? 'text-emerald-700' : 'text-emerald-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
              Create your first pixel art asset!
            </p>
            <Link href="/assets/create" className="mc-button-grass inline-block shadow-xl">🎨 CREATE FIRST ASSET</Link>
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
                isDay={isDay}
              />
            ))}
          </div>
        )}

        {/* Stats */}
        {!loading && assets.length > 0 && (
          <div className={`mt-8 text-center font-bold ${isDay ? 'text-amber-800' : 'text-slate-400'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
            🖼️ {assets.length} asset{assets.length !== 1 ? 's' : ''} in world
          </div>
        )}
      </div>
    </main>
  );
}

function AssetCard({
  asset, onDelete, onDuplicate, isDeleting, isDuplicating, isDay
}: {
  asset: Asset; onDelete: () => void; onDuplicate: () => void;
  isDeleting: boolean; isDuplicating: boolean; isDay: boolean;
}) {
  const imageUrl = asset.generatedImageUrl || asset.imageUrl;
  const isAiGenerated = !!asset.prompt;

  return (
    <div className={`p-4 relative group rounded-lg border-4 shadow-xl hover:scale-105 transition-transform ${
      isDay ? 'bg-white/95 border-amber-400' : 'bg-slate-800/95 border-slate-600'
    }`}>
      {/* Image */}
      <div className={`aspect-square rounded-lg mb-3 overflow-hidden border-2 ${isDay ? 'bg-amber-50 border-amber-300' : 'bg-slate-700 border-slate-600'}`}>
        {imageUrl ? (
          <img src={imageUrl} alt={asset.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }} />
        ) : (
          <div className={`w-full h-full flex items-center justify-center text-4xl ${isDay ? 'text-amber-300' : 'text-slate-600'}`}>🖼️</div>
        )}
      </div>

      {/* Info */}
      <div className="mb-3">
        <h3 className={`font-bold truncate ${isDay ? 'text-amber-900' : 'text-white'}`} style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '9px' }}>
          {asset.name}
        </h3>
        {asset.prompt && (
                <p className="text-purple-500 text-sm truncate mt-1" style={{ fontFamily: "'VT323', monospace" }}>
            🔎 &quot;{asset.prompt}&quot;
          </p>
        )}
        <div className={`flex items-center gap-2 mt-2 text-xs ${isDay ? 'text-amber-700' : 'text-slate-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
          <span>📍 {asset.position.x}, {asset.position.y}, {asset.position.z}</span>
          <span>•</span>
          <span>{asset.dimensions.width}×{asset.dimensions.height}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={onDuplicate} disabled={isDuplicating} className="flex-1 mc-button-stone text-xs py-2">
          {isDuplicating ? '...' : '📋 Copy'}
        </button>
        <button onClick={onDelete} disabled={isDeleting} className="flex-1 mc-button-stone text-xs py-2 !bg-red-600 !border-red-800">
          {isDeleting ? '...' : '🗑️ Delete'}
        </button>
      </div>

      {/* Badge */}
      {isAiGenerated && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded shadow-lg">🔎</div>
      )}
    </div>
  );
}
