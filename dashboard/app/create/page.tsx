'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createWorld } from '@/lib/api';

// Example world ideas to inspire users
const INSPIRATION_IDEAS = [
  "A pink banana themed world where everything is made of giant bananas and the sky is cotton candy pink",
  "Ferrari world - a racing paradise with checkered flag patterns, red clay, and trophy monuments everywhere",
  "Barbie dreamland with pink castles, glamorous gardens, and sparkly everything",
  "Candy land with chocolate rivers, lollipop forests, and gumdrop mountains",
  "Moon base with low gravity feeling, crater landscapes, and futuristic domes",
  "Army boot camp world with obstacle courses, military bunkers, and camo terrain",
  "Giant Michael Jordan statue world - basketball courts everywhere with towering MJ monuments",
  "Underwater Atlantis with coral palaces, sunken treasures, and bioluminescent caves",
  "Steampunk industrial world with brass towers, gear mountains, and clockwork forests",
  "Zen meditation world with peaceful gardens, koi ponds, and cherry blossom groves",
];

export default function CreateWorldPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await createWorld({
        description: description.trim(),
        // Let AI decide everything based on the description
      });

      // Redirect to the request detail page
      router.push(`/worlds/${response.id}`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create world');
      }
      setLoading(false);
    }
  };

  const applyInspiration = (idea: string) => {
    setDescription(idea);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
          Create Any World
        </h1>
        <p className="text-xl text-text-secondary max-w-2xl mx-auto">
          Describe <span className="text-accent-primary font-semibold">anything</span> you can imagine.
          Pink banana world? Ferrari land? Giant statues of Michael Jordan?
          <span className="block mt-2 text-text-muted">
            The AI will interpret your vision and create the closest possible configuration.
          </span>
        </p>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Description Input - No restrictions! */}
        <div className="space-y-3">
          <label htmlFor="description" className="block text-lg font-medium text-text-primary">
            What kind of world do you want?
          </label>
          <textarea
            id="description"
            rows={6}
            placeholder="Let your imagination run wild... Describe ANY world you can dream up!"
            className="w-full bg-surface-raised border-2 border-surface-border rounded-xl p-5 text-lg text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoFocus
          />
          <p className="text-sm text-text-muted">
            Be as creative, abstract, or specific as you want. There are no wrong answers.
          </p>
        </div>

        {/* Inspiration Ideas */}
        <div className="bg-surface-raised/50 border border-surface-border rounded-xl p-6">
          <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-4">
            Need inspiration? Try one of these:
          </h3>
          <div className="flex flex-wrap gap-2">
            {INSPIRATION_IDEAS.map((idea, index) => (
              <button
                key={index}
                type="button"
                onClick={() => applyInspiration(idea)}
                className="px-3 py-1.5 text-sm bg-surface border border-surface-border rounded-full text-text-secondary hover:text-accent-primary hover:border-accent-primary/50 transition-colors text-left"
              >
                {idea.split(' ').slice(0, 4).join(' ')}...
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-accent-error/10 border border-accent-error/30 rounded-xl p-4 text-accent-error text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !description.trim()}
          className={`
            w-full py-5 rounded-xl font-bold text-xl transition-all duration-300
            ${loading || !description.trim()
              ? 'bg-surface-overlay text-text-muted cursor-not-allowed'
              : 'bg-gradient-to-r from-accent-primary to-accent-secondary text-surface hover:opacity-90 glow-diamond transform hover:scale-[1.02]'
            }
          `}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-3">
              <span className="w-6 h-6 border-3 border-surface/30 border-t-surface rounded-full animate-spin" />
              Forging Your World...
            </span>
          ) : (
            '✨ Forge This World'
          )}
        </button>

        <p className="text-center text-sm text-text-muted">
          The AI will interpret your description and generate the best possible world configuration.
          <br />
          If something can&apos;t be done exactly, it will approximate creatively.
        </p>
      </form>

      {/* How it works */}
      <div className="mt-16 pt-12 border-t border-surface-border">
        <h2 className="text-xl font-bold text-text-primary mb-6 text-center">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <ProcessStep
            number={1}
            title="Describe Anything"
            description="Write any world idea in plain language. Abstract, branded, whimsical - all accepted."
          />
          <ProcessStep
            number={2}
            title="AI Interprets"
            description="The AI translates your vision into a structured configuration using available primitives."
          />
          <ProcessStep
            number={3}
            title="World Deployed"
            description="Your world is deployed to the Minecraft server via GitOps automation."
          />
        </div>
      </div>
    </div>
  );
}

function ProcessStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary text-surface font-bold text-xl flex items-center justify-center mx-auto mb-4">
        {number}
      </div>
      <h3 className="font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>
  );
}
