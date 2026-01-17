'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getWorlds } from '@/lib/api';
import type { WorldListItem, WorldRequestStatus } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';

const statusFilters: (WorldRequestStatus | 'all')[] = [
  'all',
  'pending',
  'planned',
  'building',
  'pr_created',
  'deployed',
  'failed',
];

export default function WorldsPage() {
  const [worlds, setWorlds] = useState<WorldListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<WorldRequestStatus | 'all'>('all');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchWorlds() {
      setLoading(true);
      try {
        const response = await getWorlds({
          status: statusFilter === 'all' ? undefined : statusFilter,
          limit: 50,
        });
        setWorlds(response.worlds);
        setTotal(response.pagination.total);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchWorlds();
  }, [statusFilter]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">World Requests</h1>
          <p className="text-text-secondary">
            {total} total request{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/create"
          className="px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-lg font-medium text-surface hover:opacity-90 transition-opacity"
        >
          Create New World
        </Link>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {statusFilters.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize
              ${statusFilter === status
                ? 'bg-accent-primary text-surface'
                : 'bg-surface-raised border border-surface-border text-text-secondary hover:border-accent-primary/50 hover:text-text-primary'
              }
            `}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-accent-error/10 border border-accent-error/30 rounded-xl p-6 text-center mb-8">
          <p className="text-accent-error">{error}</p>
          <p className="text-text-secondary text-sm mt-2">
            Make sure the coordinator API is running
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && worlds.length === 0 && (
        <div className="bg-surface-raised border border-surface-border rounded-xl p-12 text-center">
          <span className="text-5xl mb-4 block">🌍</span>
          <h3 className="text-xl font-semibold text-text-primary mb-2">No worlds yet</h3>
          <p className="text-text-secondary mb-6">
            {statusFilter === 'all'
              ? "You haven't created any worlds yet."
              : `No worlds with status "${statusFilter.replace('_', ' ')}"`}
          </p>
          <Link
            href="/create"
            className="inline-block px-6 py-3 bg-accent-primary rounded-lg font-medium text-surface hover:opacity-90 transition-opacity"
          >
            Create Your First World
          </Link>
        </div>
      )}

      {/* Worlds Table */}
      {!loading && worlds.length > 0 && (
        <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border bg-surface/50">
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-6 py-4">
                  World
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-6 py-4">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-6 py-4">
                  Requested By
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-6 py-4">
                  Created
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-6 py-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {worlds.map((world) => (
                <tr
                  key={world.id}
                  className="hover:bg-surface-overlay/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-text-primary">
                        {world.displayName || world.worldName || 'Unnamed World'}
                      </p>
                      <p className="text-xs text-text-muted font-mono">{world.id}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={world.status} size="sm" />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-text-secondary">{world.requestedBy}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-text-secondary text-sm">
                      {new Date(world.requestedAt).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/worlds/${world.id}`}
                        className="text-sm text-accent-primary hover:text-accent-primary/80 font-medium"
                      >
                        View
                      </Link>
                      {world.prUrl && (
                        <a
                          href={world.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-text-secondary hover:text-text-primary"
                        >
                          PR
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

