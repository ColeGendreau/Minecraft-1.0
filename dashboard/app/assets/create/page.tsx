'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createAsset, getAssetsStatus } from '@/lib/api';
import type { AssetStatusResponse } from '@/lib/api';

type CreationMode = 'image' | 'prompt';

export default function CreateAssetPage() {
  const router = useRouter();
  const [status, setStatus] = useState<AssetStatusResponse | null>(null);
  const [mode, setMode] = useState<CreationMode>('image');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buildProgress, setBuildProgress] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [scale, setScale] = useState(2);
  const [depth, setDepth] = useState(1);
  const [facing, setFacing] = useState<'north' | 'south' | 'east' | 'west'>('south');

  useEffect(() => {
    getAssetsStatus()
      .then(setStatus)
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setBuildProgress('🔄 Starting...');

    try {
      if (mode === 'image' && !imageUrl) {
        throw new Error('Please enter an image URL');
      }
      if (mode === 'prompt' && !prompt) {
        throw new Error('Please enter a prompt');
      }

      setBuildProgress(mode === 'prompt' 
        ? '🔍 AI is finding the best image...'
        : '📥 Fetching image...');

      const result = await createAsset({
        name: name || undefined,
        imageUrl: mode === 'image' ? imageUrl : undefined,
        prompt: mode === 'prompt' ? prompt : undefined,
        scale,
        depth,
        facing,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create asset');
      }

      setBuildProgress('✅ Asset created! Redirecting...');
      
      setTimeout(() => {
        router.push('/');
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create asset');
      setLoading(false);
      setBuildProgress(null);
    }
  };

  const aiAvailable = status?.aiImageGeneration.available ?? false;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-200">
      {/* Clouds */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float opacity-60"
            style={{
              left: `${(i * 22) % 100}%`,
              top: `${5 + (i * 5) % 12}%`,
              animationDelay: `${i * 0.6}s`,
              animationDuration: `${4 + (i % 2)}s`
            }}
          >
            <div className="flex gap-1">
              <div className="w-10 h-6 bg-white rounded-lg" />
              <div className="w-14 h-8 bg-white rounded-lg -mt-1" />
              <div className="w-8 h-5 bg-white rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 relative">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-amber-700 hover:text-amber-900 transition-colors mb-4 inline-block font-bold bg-white/50 px-3 py-1 rounded">
            ← Back to Gallery
          </Link>
          <h1 
            className="text-2xl text-amber-900 drop-shadow"
            style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '16px' }}
          >
            🎨 CREATE ASSET
          </h1>
          <p className="text-amber-800 mt-2" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
            Build pixel art in Minecraft from an image or AI lookup
          </p>
        </div>

        {/* Mode Selector */}
        <div className="mc-card p-4 mb-6 bg-white/90 backdrop-blur border-4 border-amber-400 shadow-xl">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('image')}
              className={`flex-1 py-4 px-4 rounded-lg transition-all font-bold border-4 ${
                mode === 'image'
                  ? 'bg-emerald-500 text-white border-emerald-700 shadow-lg'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200'
              }`}
              style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}
            >
              📷 Image URL
            </button>
            <button
              type="button"
              onClick={() => setMode('prompt')}
              disabled={!aiAvailable}
              className={`flex-1 py-4 px-4 rounded-lg transition-all font-bold border-4 ${
                mode === 'prompt'
                  ? 'bg-purple-500 text-white border-purple-700 shadow-lg'
                  : aiAvailable
                    ? 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200'
                    : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
              }`}
              style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}
            >
              🔍 AI Lookup {!aiAvailable && '(offline)'}
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="mc-card p-4 bg-white/90 backdrop-blur border-4 border-amber-400 shadow-xl">
            <label className="block text-amber-800 mb-2 font-bold" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
              Asset Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Cool Logo"
              className="w-full px-4 py-3 rounded-lg bg-amber-50 border-2 border-amber-300 text-amber-900 placeholder-amber-400 focus:outline-none focus:border-amber-500"
              style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}
            />
          </div>

          {/* Image URL or Prompt */}
          {mode === 'image' ? (
            <div className="mc-card p-4 bg-white/90 backdrop-blur border-4 border-emerald-400 shadow-xl">
              <label className="block text-emerald-800 mb-2 font-bold" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                Image URL *
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                required
                className="w-full px-4 py-3 rounded-lg bg-emerald-50 border-2 border-emerald-300 text-emerald-900 placeholder-emerald-400 focus:outline-none focus:border-emerald-500"
                style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}
              />
              <p className="text-emerald-600 text-sm mt-2" style={{ fontFamily: "'VT323', monospace" }}>
                PNG or JPG images work best. Transparent backgrounds supported!
              </p>
              <p className="text-emerald-700 text-xs mt-1 font-bold" style={{ fontFamily: "'VT323', monospace" }}>
                📍 Built in the front zone (Z=50)
              </p>
              
              {imageUrl && (
                <div className="mt-4 p-4 bg-emerald-50 rounded-lg border-2 border-emerald-300">
                  <p className="text-emerald-700 text-sm mb-2 font-bold" style={{ fontFamily: "'VT323', monospace" }}>
                    Preview:
                  </p>
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-lg border-2 border-emerald-400 shadow"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="mc-card p-4 bg-white/90 backdrop-blur border-4 border-purple-400 shadow-xl">
              <label className="block text-purple-800 mb-2 font-bold" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                🔍 AI Image Lookup *
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Apple logo, Nike swoosh, Mario sprite..."
                required
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-purple-50 border-2 border-purple-300 text-purple-900 placeholder-purple-400 focus:outline-none focus:border-purple-500"
                style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}
              />
              <p className="text-purple-600 text-sm mt-2" style={{ fontFamily: "'VT323', monospace" }}>
                Describe what you want (e.g., &quot;Microsoft logo&quot;, &quot;Pikachu sprite&quot;). AI will find a real image!
              </p>
              <p className="text-purple-700 text-xs mt-1 font-bold" style={{ fontFamily: "'VT323', monospace" }}>
                📍 Built in the back zone (Z=-50)
              </p>
            </div>
          )}

          {/* Advanced Options */}
          <div className="mc-card p-4 bg-white/90 backdrop-blur border-4 border-sky-400 shadow-xl">
            <details>
              <summary className="text-sky-800 cursor-pointer mb-4 font-bold" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                ⚙️ Advanced Options
              </summary>
              
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-sky-700 mb-1 font-bold" style={{ fontFamily: "'VT323', monospace" }}>
                    Scale: {scale}x (blocks per pixel)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    value={scale}
                    onChange={(e) => setScale(parseInt(e.target.value))}
                    className="w-full accent-sky-500"
                  />
                  <div className="flex justify-between text-xs text-sky-600">
                    <span>1x (small)</span>
                    <span>4x (huge)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sky-700 mb-1 font-bold" style={{ fontFamily: "'VT323', monospace" }}>
                    Depth: {depth} blocks
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={depth}
                    onChange={(e) => setDepth(parseInt(e.target.value))}
                    className="w-full accent-sky-500"
                  />
                  <div className="flex justify-between text-xs text-sky-600">
                    <span>1 (flat)</span>
                    <span>5 (thick)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sky-700 mb-1 font-bold" style={{ fontFamily: "'VT323', monospace" }}>
                    Facing Direction
                  </label>
                  <select
                    value={facing}
                    onChange={(e) => setFacing(e.target.value as typeof facing)}
                    className="w-full px-4 py-2 rounded-lg bg-sky-50 border-2 border-sky-300 text-sky-900"
                    style={{ fontFamily: "'VT323', monospace" }}
                  >
                    <option value="south">South (default)</option>
                    <option value="north">North</option>
                    <option value="east">East</option>
                    <option value="west">West</option>
                  </select>
                </div>
              </div>
            </details>
          </div>

          {/* Error */}
          {error && (
            <div className="mc-card p-4 text-center bg-red-50 border-4 border-red-400 shadow-xl">
              <p className="text-red-700 font-bold" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                ❌ {error}
              </p>
            </div>
          )}

          {/* Progress */}
          {buildProgress && (
            <div className="mc-card p-4 text-center bg-emerald-50 border-4 border-emerald-400 shadow-xl">
              <p className="text-emerald-700 font-bold" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
                {buildProgress}
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full mc-button-grass py-4 text-lg shadow-xl ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-transform'}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⚙️</span>
                Building...
              </span>
            ) : (
              <span>🏗️ BUILD IN MINECRAFT</span>
            )}
          </button>
        </form>

        {/* Tips */}
        <div className="mt-8 mc-card p-4 bg-sky-50/90 backdrop-blur border-4 border-sky-400 shadow-xl">
          <h3 className="text-sky-800 font-bold mb-3" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
            💡 Tips for great assets:
          </h3>
          <ul className="text-sky-700 space-y-1" style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}>
            <li>• <strong>Image URL:</strong> Use images with clear, distinct shapes</li>
            <li>• <strong>AI Lookup:</strong> Be specific! &quot;Nintendo logo&quot; beats &quot;game&quot;</li>
            <li>• Logos, icons, and sprites work great for pixel art!</li>
            <li>• Transparent backgrounds are preserved</li>
            <li>• Larger scale = more detail but bigger build</li>
            <li>• Watch the build happen live in Minecraft! 👀</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
