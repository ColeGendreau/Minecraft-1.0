'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getInfrastructureStatus,
  toggleInfrastructure,
  type InfrastructureStatusResponse,
} from '@/lib/api';

// Minecraft-themed service definitions
const MINECRAFT_SERVICES = [
  { id: 'aks', name: 'Kubernetes Cluster', icon: '⛏️', block: 'command_block', description: 'Azure AKS orchestration' },
  { id: 'acr', name: 'Container Registry', icon: '📦', block: 'chest', description: 'Docker image storage' },
  { id: 'ingress', name: 'Ingress Controller', icon: '🚪', block: 'iron_door', description: 'NGINX traffic routing' },
  { id: 'certmanager', name: 'SSL Certificates', icon: '🔒', block: 'enchanting_table', description: "Let's Encrypt TLS" },
  { id: 'minecraft', name: 'Minecraft Server', icon: '🎮', block: 'grass_block', description: 'Java Edition server' },
  { id: 'prometheus', name: 'Prometheus', icon: '📊', block: 'observer', description: 'Metrics collection' },
  { id: 'grafana', name: 'Grafana', icon: '📈', block: 'map', description: 'Monitoring dashboard' },
  { id: 'loki', name: 'Loki Logs', icon: '📋', block: 'book', description: 'Log aggregation' },
];

// Fun Minecraft quotes for loading states
const MINECRAFT_QUOTES = [
  "Mining resources...",
  "Punching trees...",
  "Crafting infrastructure...",
  "Smelting containers...",
  "Enchanting services...",
  "Building the Nether portal...",
  "Taming the cloud wolves...",
  "Brewing deployment potions...",
  "Trading with Azure villagers...",
  "Defeating the Ender Dragon of downtime...",
];

export function InfrastructurePanel() {
  const [status, setStatus] = useState<InfrastructureStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deployProgress, setDeployProgress] = useState<string[]>([]);
  const [currentQuote, setCurrentQuote] = useState(MINECRAFT_QUOTES[0]);
  const [showSecretCreeper, setShowSecretCreeper] = useState(false);

  // Rotate quotes during loading
  useEffect(() => {
    if (toggling) {
      const interval = setInterval(() => {
        setCurrentQuote(MINECRAFT_QUOTES[Math.floor(Math.random() * MINECRAFT_QUOTES.length)]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [toggling]);

  const fetchStatus = useCallback(async () => {
    try {
      const statusData = await getInfrastructureStatus();
      setStatus(statusData);
      setError(null);
    } catch (err) {
      // Set default OFF state when API fails
      setStatus(null);
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleToggle = async () => {
    if (toggling) return;

    const isCurrentlyRunning = status?.isRunning ?? false;
    const targetState = isCurrentlyRunning ? 'OFF' : 'ON';
    
    const confirmMessage = isCurrentlyRunning
      ? '💥 DESTROY all infrastructure?\n\nThis will delete:\n• Kubernetes cluster\n• Minecraft server\n• All monitoring\n\nYou will stop being billed.'
      : '🚀 DEPLOY Minecraft infrastructure?\n\nThis will create:\n• AKS Kubernetes cluster\n• Minecraft Java server\n• Grafana + Prometheus monitoring\n\nEstimated cost: ~$3-5/day';

    if (!confirm(confirmMessage)) return;

    setToggling(true);
    setDeployProgress([]);

    // Simulate progress updates
    const progressSteps = isCurrentlyRunning
      ? ['Stopping Minecraft server...', 'Draining pods...', 'Destroying cluster...', 'Cleaning up resources...']
      : ['Initializing Terraform...', 'Creating AKS cluster...', 'Deploying ingress...', 'Starting Minecraft...', 'Configuring monitoring...'];

    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        setDeployProgress(prev => [...prev, progressSteps[stepIndex]]);
        stepIndex++;
      }
    }, 2000);

    try {
      const result = await toggleInfrastructure(targetState);
      clearInterval(progressInterval);
      setDeployProgress(prev => [...prev, '✅ Workflow triggered!']);
      
      setTimeout(() => {
        alert(`${result.message}\n\n⏱️ Estimated time: ${result.estimatedTime}\n\n🔗 Monitor progress:\n${result.workflowUrl}`);
        window.open(result.workflowUrl, '_blank');
      }, 500);
      
      await fetchStatus();
    } catch (err) {
      clearInterval(progressInterval);
      // Fallback to GitHub Actions
      setDeployProgress(prev => [...prev, '⚠️ API unavailable, opening GitHub...']);
      setTimeout(() => {
        window.open('https://github.com/ColeGendreau/Minecraft-1.0/actions/workflows/terraform.yaml', '_blank');
      }, 1000);
    } finally {
      setTimeout(() => {
        setToggling(false);
        setDeployProgress([]);
      }, 3000);
    }
  };

  // Easter egg: Click title 5 times for creeper
  const [titleClicks, setTitleClicks] = useState(0);
  const handleTitleClick = () => {
    setTitleClicks(prev => prev + 1);
    if (titleClicks >= 4) {
      setShowSecretCreeper(true);
      setTimeout(() => setShowSecretCreeper(false), 3000);
      setTitleClicks(0);
    }
  };

  const isRunning = status?.isRunning ?? false;

  return (
    <div className="space-y-6">
      {/* Secret Creeper Easter Egg */}
      {showSecretCreeper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-pulse">
          <div className="text-center">
            <div className="text-9xl mb-4 animate-bounce">💥</div>
            <div className="text-4xl font-bold text-green-500 font-mono">Ssssssss... BOOM!</div>
            <div className="text-green-400 mt-2">Creeper says hi! 🟩⬛🟩</div>
          </div>
        </div>
      )}

      {/* Main Control Panel */}
      <div className={`
        relative overflow-hidden rounded-2xl border-4 transition-all duration-700
        ${isRunning 
          ? 'bg-gradient-to-br from-emerald-900/40 via-green-900/30 to-cyan-900/40 border-emerald-500/60 shadow-[0_0_60px_-15px_rgba(16,185,129,0.5)]' 
          : 'bg-gradient-to-br from-gray-900/60 via-slate-900/50 to-zinc-900/60 border-zinc-700/50'
        }
      `}>
        {/* Animated Minecraft-style background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23ffffff' d='M0 0h16v16H0zM16 16h16v16H16z'/%3E%3C/svg%3E")`,
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        {/* Torch decorations when running */}
        {isRunning && (
          <>
            <div className="absolute top-4 left-4 text-3xl animate-pulse">🔥</div>
            <div className="absolute top-4 right-4 text-3xl animate-pulse" style={{ animationDelay: '0.5s' }}>🔥</div>
          </>
        )}

        <div className="relative p-8">
          {/* Header with Status */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-6">
              {/* Big Status Indicator - Redstone Lamp Style */}
              <div 
                className={`
                  relative w-20 h-20 rounded-xl flex items-center justify-center cursor-pointer
                  transition-all duration-500 transform hover:scale-105
                  ${isRunning 
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-[0_0_40px_rgba(251,191,36,0.6)] animate-pulse' 
                    : 'bg-gradient-to-br from-zinc-700 to-zinc-800 shadow-inner'
                  }
                `}
                style={{
                  boxShadow: isRunning 
                    ? '0 0 40px rgba(251,191,36,0.6), inset 0 2px 10px rgba(255,255,255,0.3)' 
                    : 'inset 0 4px 10px rgba(0,0,0,0.5)'
                }}
              >
                <span className="text-4xl">{isRunning ? '⚡' : '💤'}</span>
                {/* Redstone glow effect */}
                {isRunning && (
                  <div className="absolute inset-0 rounded-xl bg-yellow-400/30 animate-ping" />
                )}
              </div>

              <div>
                <h2 
                  className="text-3xl font-bold text-text-primary cursor-pointer select-none font-mono tracking-wider"
                  onClick={handleTitleClick}
                >
                  {isRunning ? '🟢 SERVER ONLINE' : '🔴 SERVER OFFLINE'}
                </h2>
                <p className="text-text-secondary mt-1 font-mono">
                  {isRunning 
                    ? '⛏️ All systems operational' 
                    : '💰 No infrastructure costs'
                  }
                </p>
                {status?.lastUpdated && (
                  <p className="text-xs text-text-muted mt-1">
                    Last check: {new Date(status.lastUpdated).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>

            {/* Big Toggle Button - Lever Style */}
            <button
              onClick={handleToggle}
              disabled={toggling || loading}
              className={`
                relative px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300
                transform hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                font-mono tracking-wide
                ${toggling ? 'animate-pulse' : ''}
                ${isRunning
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-[0_4px_20px_rgba(220,38,38,0.4)]'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white shadow-[0_4px_20px_rgba(16,185,129,0.4)]'
                }
              `}
            >
              {toggling ? (
                <span className="flex items-center gap-3">
                  <span className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  {currentQuote}
                </span>
              ) : isRunning ? (
                <span className="flex items-center gap-2">
                  <span className="text-2xl">🛑</span>
                  DESTROY
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="text-2xl">🚀</span>
                  DEPLOY
                </span>
              )}
            </button>
          </div>

          {/* Deployment Progress */}
          {toggling && deployProgress.length > 0 && (
            <div className="mb-8 p-4 bg-black/40 rounded-xl border border-emerald-500/30 font-mono text-sm">
              <div className="flex items-center gap-2 mb-3 text-emerald-400">
                <span className="animate-pulse">▶</span>
                <span>Deployment Progress</span>
              </div>
              <div className="space-y-1">
                {deployProgress.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-text-secondary">
                    <span className="text-emerald-500">{step.startsWith('✅') ? '✅' : step.startsWith('⚠️') ? '⚠️' : '▸'}</span>
                    <span>{step}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-emerald-400 animate-pulse">
                  <span>▸</span>
                  <span>_</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats when Running */}
          {isRunning && status?.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatBlock icon="🖥️" label="Nodes" value={status.metrics.nodes} color="cyan" />
              <StatBlock icon="📦" label="Pods" value={status.metrics.pods} color="purple" />
              <StatBlock icon="⚡" label="CPU" value={`${status.metrics.cpuUsage}%`} color="yellow" />
              <StatBlock icon="💾" label="Memory" value={`${status.metrics.memoryUsage}%`} color="pink" />
            </div>
          )}

          {/* Service Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {MINECRAFT_SERVICES.map((service, index) => (
              <ServiceBlock 
                key={service.id} 
                service={service} 
                isRunning={isRunning}
                delay={index * 100}
              />
            ))}
          </div>

          {/* Quick Links when Running */}
          {isRunning && status?.metrics && (
            <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-white/10">
              <QuickLink href={status.metrics.grafanaUrl} icon="📈" label="Grafana" />
              <QuickLink href={`https://github.com/ColeGendreau/Minecraft-1.0/actions`} icon="🔧" label="GitHub Actions" />
              <CopyButton value={status.metrics.minecraftAddress} icon="🎮" label="Copy Server IP" />
            </div>
          )}

          {/* Cost Estimate Footer */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-sm font-mono">
            <span className="text-text-muted">
              💰 {isRunning ? '~$3-5/day while running' : '$0/day when stopped'}
            </span>
            <span className="text-emerald-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {loading ? 'Checking...' : error ? 'API Unavailable' : 'Live'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBlock({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  const colorClasses: Record<string, string> = {
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
    pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
  };

  return (
    <div className={`
      bg-gradient-to-br ${colorClasses[color]} 
      border rounded-xl p-4 text-center backdrop-blur-sm
    `}>
      <span className="text-2xl block mb-1">{icon}</span>
      <span className="text-2xl font-bold text-text-primary block font-mono">{value}</span>
      <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
    </div>
  );
}

function ServiceBlock({ service, isRunning, delay }: { service: typeof MINECRAFT_SERVICES[0]; isRunning: boolean; delay: number }) {
  return (
    <div 
      className={`
        relative overflow-hidden rounded-lg border-2 p-3 transition-all duration-500
        transform hover:scale-105 hover:-translate-y-1
        ${isRunning 
          ? 'bg-gradient-to-br from-emerald-900/30 to-green-900/20 border-emerald-500/40 shadow-lg shadow-emerald-500/10' 
          : 'bg-zinc-900/50 border-zinc-700/30 opacity-50'
        }
      `}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Glow effect when running */}
      {isRunning && (
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent" />
      )}
      
      <div className="relative flex items-center gap-3">
        {/* Status indicator */}
        <div className={`
          w-2 h-2 rounded-full
          ${isRunning ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-zinc-600'}
        `} />
        
        {/* Icon */}
        <span className="text-2xl">{service.icon}</span>
        
        <div className="min-w-0">
          <h4 className="font-medium text-text-primary text-sm truncate">
            {service.name}
          </h4>
          <p className="text-xs text-text-muted truncate">
            {service.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-text-secondary hover:text-emerald-400 transition-all border border-white/10 hover:border-emerald-500/30"
    >
      <span>{icon}</span>
      <span className="font-mono">{label}</span>
    </a>
  );
}

function CopyButton({ value, icon, label }: { value: string; icon: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-text-secondary hover:text-emerald-400 transition-all border border-white/10 hover:border-emerald-500/30"
    >
      <span>{copied ? '✅' : icon}</span>
      <span className="font-mono">{copied ? 'Copied!' : label}</span>
    </button>
  );
}
