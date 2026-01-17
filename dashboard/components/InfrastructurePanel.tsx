'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getInfrastructureStatus,
  toggleInfrastructure,
  type InfrastructureStatusResponse,
} from '@/lib/api';
import { BlockBuildAnimation, MiniBlockProgress } from './BlockBuildAnimation';

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
  const [deployProgress, setDeployProgress] = useState(0);
  const [currentQuote, setCurrentQuote] = useState(MINECRAFT_QUOTES[0]);
  const [showSecretCreeper, setShowSecretCreeper] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);

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
    setIsDestroying(isCurrentlyRunning);
    setDeployProgress(0);

    // Animate progress over ~30 seconds (simulated)
    const progressInterval = setInterval(() => {
      setDeployProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        // Random increments between 3-8%
        return Math.min(prev + Math.random() * 5 + 3, 95);
      });
    }, 1500);

    try {
      const result = await toggleInfrastructure(targetState);
      clearInterval(progressInterval);
      setDeployProgress(100);
      
      setTimeout(() => {
        alert(`${result.message}\n\n⏱️ Estimated time: ${result.estimatedTime}\n\n🔗 Monitor progress:\n${result.workflowUrl}`);
        window.open(result.workflowUrl, '_blank');
      }, 1000);
      
      await fetchStatus();
    } catch (err) {
      clearInterval(progressInterval);
      // Fallback to GitHub Actions
      setDeployProgress(100);
      setTimeout(() => {
        window.open('https://github.com/ColeGendreau/Minecraft-1.0/actions/workflows/terraform.yaml', '_blank');
      }, 1000);
    } finally {
      setTimeout(() => {
        setToggling(false);
        setDeployProgress(0);
        setIsDestroying(false);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="text-center animate-pulse">
            <div className="text-[150px] mb-4 animate-bounce">💥</div>
            <div 
              className="text-4xl font-bold text-green-500"
              style={{ fontFamily: "'Press Start 2P', cursive" }}
            >
              Ssssssss... BOOM!
            </div>
            <div className="text-green-400 mt-4 text-2xl">
              🟩⬛🟩<br/>
              ⬛🟩⬛<br/>
              🟩🟩🟩
            </div>
            <div className="text-gray-500 mt-4">Creeper says hi!</div>
          </div>
        </div>
      )}

      {/* Main Control Panel */}
      <div className={`
        relative overflow-hidden mc-card-dark rounded-xl border-4 transition-all duration-700
        ${isRunning 
          ? 'border-emerald-500/60 shadow-[0_0_60px_-15px_rgba(16,185,129,0.5)]' 
          : 'border-zinc-700/50'
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
            <div className="absolute top-4 left-4 text-3xl animate-torch">🔥</div>
            <div className="absolute top-4 right-4 text-3xl animate-torch" style={{ animationDelay: '0.25s' }}>🔥</div>
          </>
        )}

        <div className="relative p-8">
          {/* Header with Status */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-6">
              {/* Big Status Indicator - Redstone Lamp Style */}
              <div 
                className={`
                  relative w-24 h-24 rounded-xl flex items-center justify-center cursor-pointer
                  transition-all duration-500 transform hover:scale-105
                  ${isRunning 
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500' 
                    : 'bg-gradient-to-br from-zinc-700 to-zinc-800'
                  }
                `}
                style={{
                  boxShadow: isRunning 
                    ? '0 0 50px rgba(251,191,36,0.7), inset 0 2px 10px rgba(255,255,255,0.4), inset 0 -4px 10px rgba(0,0,0,0.3)' 
                    : 'inset 0 4px 10px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(255,255,255,0.1)',
                  border: '4px solid',
                  borderColor: isRunning ? '#f59e0b #92400e #92400e #f59e0b' : '#52525b #27272a #27272a #52525b',
                }}
              >
                <span className="text-5xl">{isRunning ? '⚡' : '💤'}</span>
                {/* Redstone glow effect */}
                {isRunning && (
                  <div className="absolute inset-0 rounded-xl bg-yellow-400/40 animate-ping" style={{ animationDuration: '2s' }} />
                )}
              </div>

              <div>
                <h2 
                  className="text-2xl lg:text-3xl font-bold cursor-pointer select-none text-shadow-mc"
                  onClick={handleTitleClick}
                  style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '16px', color: isRunning ? '#4ade80' : '#ef4444' }}
                >
                  {isRunning ? 'SERVER ONLINE' : 'SERVER OFFLINE'}
                </h2>
                <p className="text-gray-400 mt-2" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
                  {isRunning 
                    ? '⛏️ All systems operational' 
                    : '💰 No infrastructure costs'
                  }
                </p>
                {status?.lastUpdated && (
                  <p className="text-xs text-gray-600 mt-1" style={{ fontFamily: "'VT323', monospace" }}>
                    Last check: {new Date(status.lastUpdated).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>

            {/* Big Toggle Button - Stone Button Style */}
            <button
              onClick={handleToggle}
              disabled={toggling || loading}
              className={`
                relative px-8 py-4 font-bold text-lg transition-all duration-300
                transform hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                ${toggling ? '' : ''}
                ${isRunning ? 'mc-button-redstone' : 'mc-button-grass'}
              `}
              style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '12px' }}
            >
              {toggling ? (
                <span className="flex items-center gap-3">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="hidden sm:inline">{currentQuote}</span>
                  <span className="sm:hidden">Working...</span>
                </span>
              ) : isRunning ? (
                <span className="flex items-center gap-2">
                  <span className="text-xl">🛑</span>
                  DESTROY
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="text-xl">🚀</span>
                  DEPLOY
                </span>
              )}
            </button>
          </div>

          {/* Block Building Animation when deploying */}
          {toggling && (
            <div className="mb-8">
              <BlockBuildAnimation 
                isBuilding={!isDestroying} 
                isDestroying={isDestroying}
                progress={deployProgress}
              />
            </div>
          )}

          {/* Mini Block Progress (always visible when not toggling) */}
          {!toggling && (
            <div className="mb-6 p-4 bg-black/30 rounded-lg">
              <p className="text-xs text-gray-500 mb-2" style={{ fontFamily: "'VT323', monospace" }}>
                AZURE SERVICES
              </p>
              <MiniBlockProgress progress={isRunning ? 100 : 0} isDestroying={false} />
            </div>
          )}

          {/* Quick Stats when Running */}
          {isRunning && status?.metrics && !toggling && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatBlock icon="🖥️" label="Nodes" value={status.metrics.nodes} color="cyan" />
              <StatBlock icon="📦" label="Pods" value={status.metrics.pods} color="purple" />
              <StatBlock icon="⚡" label="CPU" value={`${status.metrics.cpuUsage}%`} color="yellow" />
              <StatBlock icon="💾" label="Memory" value={`${status.metrics.memoryUsage}%`} color="pink" />
            </div>
          )}

          {/* Service Grid */}
          {!toggling && (
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
          )}

          {/* Quick Links when Running */}
          {isRunning && status?.metrics && !toggling && (
            <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-white/10">
              <QuickLink href={status.metrics.grafanaUrl} icon="📈" label="Grafana" />
              <QuickLink href={`https://github.com/ColeGendreau/Minecraft-1.0/actions`} icon="🔧" label="GitHub Actions" />
              <CopyButton value={status.metrics.minecraftAddress} icon="🎮" label="Copy Server IP" />
            </div>
          )}

          {/* Cost Estimate Footer */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-sm" style={{ fontFamily: "'VT323', monospace" }}>
            <span className="text-gray-500">
              💰 {isRunning ? '~$3-5/day while running' : '$0/day when stopped'}
            </span>
            <span className="text-emerald-500 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500' : error ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`} />
              {loading ? 'Checking...' : error ? 'API Unavailable' : 'Live Status'}
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
      border-2 rounded-lg p-4 text-center backdrop-blur-sm mc-slot
    `}>
      <span className="text-2xl block mb-1">{icon}</span>
      <span className="text-2xl font-bold text-white block" style={{ fontFamily: "'VT323', monospace" }}>{value}</span>
      <span className="text-xs text-gray-400 uppercase tracking-wider" style={{ fontFamily: "'VT323', monospace" }}>{label}</span>
    </div>
  );
}

function ServiceBlock({ service, isRunning, delay }: { service: typeof MINECRAFT_SERVICES[0]; isRunning: boolean; delay: number }) {
  return (
    <div 
      className={`
        relative overflow-hidden rounded-lg p-3 transition-all duration-500
        transform hover:scale-105 hover:-translate-y-1 cursor-pointer
        ${isRunning 
          ? 'mc-slot bg-emerald-900/30' 
          : 'mc-slot opacity-50'
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
          w-3 h-3 rounded-full
          ${isRunning ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-zinc-600'}
        `} />
        
        {/* Icon */}
        <span className="text-2xl">{service.icon}</span>
        
        <div className="min-w-0">
          <h4 className="font-medium text-white text-sm truncate" style={{ fontFamily: "'VT323', monospace" }}>
            {service.name}
          </h4>
          <p className="text-xs text-gray-500 truncate" style={{ fontFamily: "'VT323', monospace" }}>
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
      className="mc-button inline-flex items-center gap-2 text-xs"
      style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '8px' }}
    >
      <span>{icon}</span>
      <span>{label}</span>
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
      className="mc-button inline-flex items-center gap-2 text-xs"
      style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '8px' }}
    >
      <span>{copied ? '✅' : icon}</span>
      <span>{copied ? 'COPIED!' : label}</span>
    </button>
  );
}
