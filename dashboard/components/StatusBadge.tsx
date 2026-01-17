import type { WorldRequestStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: WorldRequestStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<WorldRequestStatus, { color: string; label: string; icon: string }> = {
  pending: {
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    label: 'Pending',
    icon: '⏳',
  },
  planned: {
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    label: 'Planned',
    icon: '📋',
  },
  building: {
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    label: 'Building',
    icon: '🔨',
  },
  pr_created: {
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    label: 'PR Created',
    icon: '🔗',
  },
  deployed: {
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    label: 'Deployed',
    icon: '✓',
  },
  failed: {
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    label: 'Failed',
    icon: '✗',
  },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        ${config.color} ${sizeClasses}
      `}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}

