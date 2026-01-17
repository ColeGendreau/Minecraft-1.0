'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getInfrastructureStatus,
  toggleInfrastructure,
  getInfrastructureCost,
  type InfrastructureStatusResponse,
  type InfrastructureCostResponse,
} from '@/lib/api';

// Service icons mapping
const serviceIcons: Record<string, string> = {
  cloud: '☁️',
  kubernetes: '⚙️',
  container: '📦',
  globe: '🌐',
  route: '🔀',
  lock: '🔒',
  game: '🎮',
  chart: '📊',
  dashboard: '📈',
  logs: '📋',
};

// Category colors
const categoryColors: Record<string, string> = {
  infrastructure: 'from-blue-500 to-cyan-500',
  kubernetes: 'from-purple-500 to-pink-500',
  application: 'from-green-500 to-emerald-500',
  monitoring: 'from-orange-500 to-amber-500',
};

export function InfrastructurePanel() {
  const [status, setStatus] = useState<InfrastructureStatusResponse | null>(null);
  const [cost, setCost] = useState<InfrastructureCostResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const [statusData, costData] = await Promise.all([
        getInfrastructureStatus(),
        getInfrastructureCost(),
      ]);
      setStatus(statusData);
      setCost(costData);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleToggle = async () => {
    if (!status || toggling) return;

    const targetState = status.isRunning ? 'OFF' : 'ON';
    const confirmMessage = status.isRunning
      ? 'This will DESTROY all infrastructure and stop billing. Continue?'
      : 'This will provision all Azure infrastructure (~$3-5/day). Continue?';

    if (!confirm(confirmMessage)) return;

    setToggling(true);
    try {
      const result = await toggleInfrastructure(targetState);
      alert(`${result.message}\n\nEstimated time: ${result.estimatedTime}\n\nMonitor progress at:\n${result.workflowUrl}`);
      // Refresh status
      await fetchStatus();
    } catch (err) {
      if (err instanceof Error) {
        alert(`Failed to toggle infrastructure: ${err.message}`);
      }
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface-raised border border-surface-border rounded-xl p-8">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !status) {
    // Show offline/error state with deploy button
    return (
      <div className="bg-surface-raised border border-surface-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-surface-overlay">
              💤
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">
                Infrastructure OFF
              </h2>
              <p className="text-text-secondary">
                {error ? 'API unavailable - server may be starting up' : 'No infrastructure deployed'}
              </p>
            </div>
          </div>
          <button
            onClick={() => window.open('https://github.com/ColeGendreau/Minecraft-1.0/actions', '_blank')}
            className="px-8 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-accent-success to-accent-primary hover:opacity-90 text-surface glow-emerald transition-all duration-300"
          >
            🚀 View Deploy Actions
          </button>
        </div>
        <p className="text-text-muted text-sm mt-4 text-center">
          To deploy the Minecraft infrastructure, set INFRASTRUCTURE_STATE to ON in the GitHub repo
        </p>
      </div>
    );
  }

  const runningServices = status.services.filter(s => s.status === 'running').length;
  const totalServices = status.services.length;

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <div className={`
        relative overflow-hidden rounded-xl border-2 transition-all duration-500
        ${status.isRunning 
          ? 'bg-gradient-to-br from-accent-success/10 to-surface-raised border-accent-success/50' 
          : 'bg-gradient-to-br from-surface-overlay to-surface-raised border-surface-border'
        }
      `}>
        {/* Animated background pattern when running */}
        {status.isRunning && (
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-grid-pattern bg-grid animate-pulse" />
          </div>
        )}

        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Big status indicator */}
              <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center text-3xl
                transition-all duration-500
                ${status.isRunning 
                  ? 'bg-accent-success/20 animate-pulse shadow-lg shadow-accent-success/20' 
                  : 'bg-surface-overlay'
                }
              `}>
                {status.isRunning ? '⚡' : '💤'}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">
                  Infrastructure {status.state}
                </h2>
                <p className="text-text-secondary">
                  {status.isRunning 
                    ? `${runningServices}/${totalServices} services running` 
                    : 'All services stopped - No billing'
                  }
                </p>
              </div>
            </div>

            {/* Toggle Button */}
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`
                px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300
                ${toggling ? 'opacity-50 cursor-not-allowed' : ''}
                ${status.isRunning
                  ? 'bg-accent-error hover:bg-accent-error/80 text-white'
                  : 'bg-gradient-to-r from-accent-success to-accent-primary hover:opacity-90 text-surface glow-emerald'
                }
              `}
            >
              {toggling ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : status.isRunning ? (
                '🛑 Destroy All'
              ) : (
                '🚀 Deploy All'
              )}
            </button>
          </div>

          {/* Metrics when running */}
          {status.isRunning && status.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard 
                label="Nodes" 
                value={status.metrics.nodes.toString()} 
                icon="🖥️" 
              />
              <MetricCard 
                label="Pods" 
                value={status.metrics.pods.toString()} 
                icon="📦" 
              />
              <MetricCard 
                label="CPU" 
                value={`${status.metrics.cpuUsage}%`} 
                icon="⚡" 
              />
              <MetricCard 
                label="Memory" 
                value={`${status.metrics.memoryUsage}%`} 
                icon="💾" 
              />
            </div>
          )}

          {/* Quick Links when running */}
          {status.isRunning && status.metrics && (
            <div className="flex flex-wrap gap-3">
              <QuickLink 
                href={status.metrics.grafanaUrl} 
                label="Open Grafana" 
                icon="📈" 
              />
              <QuickLink 
                href={status.gitHub.workflowUrl} 
                label="GitHub Actions" 
                icon="🔧" 
              />
              <CopyButton 
                value={status.metrics.minecraftAddress} 
                label="Copy Server IP" 
              />
            </div>
          )}

          {/* Cost info */}
          {cost && (
            <div className="mt-6 pt-6 border-t border-surface-border/50 flex items-center justify-between text-sm">
              <span className="text-text-muted">
                Estimated cost: {status.isRunning ? cost.daily.running : cost.daily.stopped}/day
              </span>
              <span className="text-text-muted">
                Last updated: {new Date(status.lastUpdated).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {status.services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-surface/50 rounded-lg p-4 text-center">
      <span className="text-2xl mb-1 block">{icon}</span>
      <span className="text-2xl font-bold text-text-primary block">{value}</span>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}

function ServiceCard({ service }: { service: { id: string; name: string; description: string; category: string; icon: string; status: string } }) {
  const isRunning = service.status === 'running';
  const icon = serviceIcons[service.icon] || '🔷';
  const gradientClass = categoryColors[service.category] || 'from-gray-500 to-gray-600';

  return (
    <div className={`
      relative overflow-hidden rounded-lg border transition-all duration-300
      ${isRunning 
        ? 'bg-surface-raised border-surface-border hover:border-accent-primary/30' 
        : 'bg-surface border-surface-border/50 opacity-60'
      }
    `}>
      {/* Gradient accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientClass} ${isRunning ? 'opacity-100' : 'opacity-30'}`} />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {/* Status dot */}
          <span className={`
            w-2 h-2 rounded-full
            ${isRunning ? 'bg-accent-success animate-pulse' : 'bg-text-muted'}
          `} />
          <span className="text-lg">{icon}</span>
        </div>
        <h4 className="font-medium text-text-primary text-sm leading-tight">
          {service.name}
        </h4>
        <p className="text-xs text-text-muted mt-1 line-clamp-1">
          {service.description}
        </p>
      </div>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 bg-surface rounded-lg text-sm text-text-secondary hover:text-accent-primary hover:bg-surface-overlay transition-colors"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </a>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-4 py-2 bg-surface rounded-lg text-sm text-text-secondary hover:text-accent-primary hover:bg-surface-overlay transition-colors"
    >
      <span>{copied ? '✓' : '📋'}</span>
      <span>{copied ? 'Copied!' : label}</span>
    </button>
  );
}

