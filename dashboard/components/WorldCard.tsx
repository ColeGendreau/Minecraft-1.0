import Link from 'next/link';
import type { WorldSpec } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import type { WorldRequestStatus } from '@/lib/types';

interface WorldCardProps {
  worldSpec: WorldSpec;
  status?: WorldRequestStatus;
  deployedAt?: string;
  commitSha?: string;
  commitUrl?: string;
  showViewButton?: boolean;
}

export function WorldCard({
  worldSpec,
  status,
  deployedAt,
  commitSha,
  commitUrl,
  showViewButton = false,
}: WorldCardProps) {
  return (
    <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden hover:border-accent-primary/30 transition-all duration-300 group">
      {/* Header with gradient */}
      <div className="h-24 bg-gradient-to-br from-accent-primary/20 via-accent-secondary/20 to-surface-raised relative overflow-hidden">
        {/* Decorative blocks pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-2 left-4 w-8 h-8 bg-mc-grass rounded" />
          <div className="absolute top-6 left-14 w-6 h-6 bg-mc-stone rounded" />
          <div className="absolute bottom-4 right-8 w-10 h-10 bg-mc-dirt rounded" />
          <div className="absolute bottom-2 right-20 w-5 h-5 bg-mc-diamond rounded" />
        </div>
        
        {/* World name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-surface-raised/90 to-transparent">
          <h3 className="text-lg font-bold text-text-primary group-hover:text-accent-primary transition-colors">
            {worldSpec.displayName || worldSpec.worldName}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Status and metadata */}
        <div className="flex items-center justify-between">
          {status && <StatusBadge status={status} size="sm" />}
          {deployedAt && (
            <span className="text-xs text-text-muted">
              Deployed {new Date(deployedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Theme description */}
        <p className="text-sm text-text-secondary line-clamp-2">
          {worldSpec.theme}
        </p>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-surface/50 rounded-lg p-2">
            <span className="text-text-muted block">Difficulty</span>
            <span className="text-text-primary font-medium capitalize">
              {worldSpec.rules.difficulty}
            </span>
          </div>
          <div className="bg-surface/50 rounded-lg p-2">
            <span className="text-text-muted block">Game Mode</span>
            <span className="text-text-primary font-medium capitalize">
              {worldSpec.rules.gameMode}
            </span>
          </div>
        </div>

        {/* Biomes */}
        {worldSpec.generation.biomes && worldSpec.generation.biomes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {worldSpec.generation.biomes.slice(0, 3).map((biome) => (
              <span
                key={biome}
                className="text-xs px-2 py-0.5 rounded bg-surface-overlay text-text-secondary capitalize"
              >
                {biome.replace('_', ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-surface-border">
          {commitSha && (
            <a
              href={commitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-text-muted hover:text-accent-primary transition-colors"
            >
              {commitSha.slice(0, 7)}
            </a>
          )}
          {showViewButton && (
            <Link
              href={`/worlds/current`}
              className="text-sm text-accent-primary hover:text-accent-primary/80 font-medium"
            >
              View Details →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

