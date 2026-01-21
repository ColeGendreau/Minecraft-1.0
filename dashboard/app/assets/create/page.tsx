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
      // Validate
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
      
      // Wait a moment then redirect
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
    <main className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-emerald-400 hover:text-emerald-300 transition-colors mb-4 inline-block">
            ← Back to Gallery
          </Link>
          <h1 
            className="text-2xl text-white"
            style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '16px' }}
          >
            🎨 CREATE ASSET
          </h1>
          <p className="text-gray-400 mt-2" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
            Build pixel art in Minecraft from an image or AI lookup
          </p>
        </div>

        {/* Mode Selector */}
        <div className="mc-panel-stone p-4 mb-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('image')}
              className={`flex-1 py-4 px-4 rounded transition-all ${
                mode === 'image'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-stone-700 text-gray-400 hover:bg-stone-600'
              }`}
              style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}
            >
              📷 Image URL
            </button>
            <button
              type="button"
              onClick={() => setMode('prompt')}
              disabled={!aiAvailable}
              className={`flex-1 py-4 px-4 rounded transition-all ${
                mode === 'prompt'
                  ? 'bg-purple-700 text-white'
                  : aiAvailable
                    ? 'bg-stone-700 text-gray-400 hover:bg-stone-600'
                    : 'bg-stone-800 text-gray-600 cursor-not-allowed'
              }`}
              style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}
            >
              🔍 AI Lookup {!aiAvailable && '(offline)'}
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name (optional) */}
          <div className="mc-panel-stone p-4">
            <label className="block text-gray-300 mb-2" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
              Asset Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Cool Logo"
              className="w-full px-4 py-3 rounded bg-stone-800 border-2 border-stone-600 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}
            />
          </div>

          {/* Image URL or Prompt */}
          {mode === 'image' ? (
            <div className="mc-panel-stone p-4">
              <label className="block text-gray-300 mb-2" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                Image URL *
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                required
                className="w-full px-4 py-3 rounded bg-stone-800 border-2 border-stone-600 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}
              />
              <p className="text-gray-500 text-sm mt-2" style={{ fontFamily: "'VT323', monospace" }}>
                PNG or JPG images work best. Transparent backgrounds are supported!
              </p>
              <p className="text-emerald-600 text-xs mt-1" style={{ fontFamily: "'VT323', monospace" }}>
                📍 Built in the front zone (Z=50)
              </p>
              
              {/* Image Preview */}
              {imageUrl && (
                <div className="mt-4 p-4 bg-black/30 rounded">
                  <p className="text-gray-400 text-sm mb-2" style={{ fontFamily: "'VT323', monospace" }}>
                    Preview:
                  </p>
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded border-2 border-stone-600"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="mc-panel-stone p-4 border-purple-800">
              <label className="block text-purple-300 mb-2" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                🔍 AI Image Lookup *
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Apple logo, Nike swoosh, Mario sprite..."
                required
                rows={3}
                className="w-full px-4 py-3 rounded bg-stone-800 border-2 border-purple-800 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}
              />
              <p className="text-purple-400 text-sm mt-2" style={{ fontFamily: "'VT323', monospace" }}>
                Describe what you want (e.g., &quot;Microsoft logo&quot;, &quot;Pikachu sprite&quot;). AI will find a real image!
              </p>
              <p className="text-purple-600 text-xs mt-1" style={{ fontFamily: "'VT323', monospace" }}>
                📍 Built in the back zone (Z=-50)
              </p>
            </div>
          )}

          {/* Advanced Options */}
          <div className="mc-panel-stone p-4">
            <details>
              <summary className="text-gray-300 cursor-pointer mb-4" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                ⚙️ Advanced Options
              </summary>
              
              <div className="space-y-4 pt-2">
                {/* Scale */}
                <div>
                  <label className="block text-gray-400 mb-1" style={{ fontFamily: "'VT323', monospace" }}>
                    Scale: {scale}x (blocks per pixel)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    value={scale}
                    onChange={(e) => setScale(parseInt(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1x (small)</span>
                    <span>4x (huge)</span>
                  </div>
                </div>

                {/* Depth */}
                <div>
                  <label className="block text-gray-400 mb-1" style={{ fontFamily: "'VT323', monospace" }}>
                    Depth: {depth} blocks
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={depth}
                    onChange={(e) => setDepth(parseInt(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1 (flat)</span>
                    <span>5 (thick)</span>
                  </div>
                </div>

                {/* Facing */}
                <div>
                  <label className="block text-gray-400 mb-1" style={{ fontFamily: "'VT323', monospace" }}>
                    Facing Direction
                  </label>
                  <select
                    value={facing}
                    onChange={(e) => setFacing(e.target.value as typeof facing)}
                    className="w-full px-4 py-2 rounded bg-stone-800 border-2 border-stone-600 text-white"
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

          {/* Error Display */}
          {error && (
            <div className="mc-panel-stone p-4 text-center border-2 border-red-800">
              <p className="text-red-400" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                ❌ {error}
              </p>
            </div>
          )}

          {/* Progress Display */}
          {buildProgress && (
            <div className="mc-panel-stone p-4 text-center border-2 border-emerald-700">
              <p className="text-emerald-400" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
                {buildProgress}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full mc-button-grass py-4 text-lg ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        <div className="mt-8 mc-panel-stone p-4">
          <h3 className="text-emerald-400 font-bold mb-3" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
            💡 Tips for great assets:
          </h3>
          <ul className="text-gray-400 space-y-1" style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}>
            <li>• <strong className="text-gray-200">Image URL:</strong> Use images with clear, distinct shapes</li>
            <li>• <strong className="text-gray-200">AI Lookup:</strong> Be specific! &quot;Nintendo logo&quot; works better than &quot;game&quot;</li>
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
