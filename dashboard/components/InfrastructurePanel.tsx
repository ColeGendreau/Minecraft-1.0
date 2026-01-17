'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getInfrastructureStatus,
  toggleInfrastructure,
  getLatestWorkflow,
  type InfrastructureStatusResponse,
  type LatestWorkflowResponse,
  type WorkflowJob,
} from '@/lib/api';
import { BlockBuildAnimation } from './BlockBuildAnimation';

// Minecraft-themed service definitions
const MINECRAFT_SERVICES = [
  { id: 'aks', name: 'Kubernetes', icon: '⛏️', description: 'AKS Cluster' },
  { id: 'acr', name: 'Registry', icon: '📦', description: 'Container images' },
  { id: 'ingress', name: 'Ingress', icon: '🚪', description: 'Traffic routing' },
  { id: 'certmanager', name: 'SSL', icon: '🔒', description: 'Certificates' },
  { id: 'minecraft', name: 'Minecraft', icon: '🎮', description: 'Game server' },
  { id: 'prometheus', name: 'Metrics', icon: '📊', description: 'Prometheus' },
  { id: 'grafana', name: 'Grafana', icon: '📈', description: 'Dashboards' },
  { id: 'loki', name: 'Logs', icon: '📋', description: 'Log collection' },
];

// Minecraft quotes for loading
const MINECRAFT_QUOTES = [
  "Mining resources...", "Punching trees...", "Crafting infrastructure...",
  "Smelting containers...", "Enchanting services...", "Building the Nether portal...",
  "Taming cloud wolves...", "Brewing deployment potions...", "Trading with Azure villagers...",
];

export function InfrastructurePanel() {
  const [status, setStatus] = useState<InfrastructureStatusResponse | null>(null);
  const [workflow, setWorkflow] = useState<LatestWorkflowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuote, setCurrentQuote] = useState(MINECRAFT_QUOTES[0]);
  const [showSecretCreeper, setShowSecretCreeper] = useState(false);
  const [titleClicks, setTitleClicks] = useState(0);

  // Rotate quotes during loading
  useEffect(() => {
    if (workflow?.hasActiveRun || toggling) {
      const interval = setInterval(() => {
        setCurrentQuote(MINECRAFT_QUOTES[Math.floor(Math.random() * MINECRAFT_QUOTES.length)]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [workflow?.hasActiveRun, toggling]);

  // Fetch status and workflow info
  const fetchData = useCallback(async () => {
    try {
      const [statusData, workflowData] = await Promise.all([
        getInfrastructureStatus().catch(() => null),
        getLatestWorkflow().catch(() => null),
      ]);
      
      if (statusData) setStatus(statusData);
      if (workflowData) setWorkflow(workflowData);
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
    fetchData();
    // Poll more frequently when workflow is active
    const interval = setInterval(fetchData, workflow?.hasActiveRun ? 5000 : 15000);
    return () => clearInterval(interval);
  }, [fetchData, workflow?.hasActiveRun]);

  const handleToggle = async () => {
    if (toggling || workflow?.hasActiveRun) return;

    const isCurrentlyRunning = status?.isRunning ?? false;
    const targetState = isCurrentlyRunning ? 'OFF' : 'ON';
    
    const confirmMessage = isCurrentlyRunning
      ? '💥 DESTROY all infrastructure?\n\nThis will delete:\n• Kubernetes cluster\n• Minecraft server\n• All monitoring\n\nYou will stop being billed.'
      : '🚀 DEPLOY Minecraft infrastructure?\n\nThis will create:\n• AKS Kubernetes cluster\n• Minecraft Java server\n• Grafana + Prometheus monitoring\n\nEstimated cost: ~$3-5/day';

    if (!confirm(confirmMessage)) return;

    setToggling(true);
    try {
      const result = await toggleInfrastructure(targetState);
      
      if (result.success) {
        // Start polling for workflow status
        setTimeout(fetchData, 2000);
      }
      
      // Show result
      alert(`${result.message}\n\n⏱️ Estimated time: ${result.estimatedTime}\n\n🔗 Monitor progress:\n${result.workflowUrl}`);
    } catch (err) {
      if (err instanceof Error) {
        alert(`Failed: ${err.message}\n\nYou can manually trigger from GitHub Actions.`);
      }
    } finally {
      setToggling(false);
    }
  };

  // Easter egg
  const handleTitleClick = () => {
    setTitleClicks(prev => prev + 1);
    if (titleClicks >= 4) {
      setShowSecretCreeper(true);
      setTimeout(() => setShowSecretCreeper(false), 3000);
      setTitleClicks(0);
    }
  };

  const isRunning = status?.state === 'ON';
  const hasActiveWorkflow = workflow?.hasActiveRun ?? false;
  const latestRun = workflow?.latestRun;

  // Calculate progress from workflow steps
  const workflowProgress = calculateWorkflowProgress(latestRun?.jobs);

  return (
    <div className="space-y-6">
      {/* Secret Creeper Easter Egg */}
      {showSecretCreeper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="text-center animate-pulse">
            <div className="text-[150px] mb-4 animate-bounce">💥</div>
            <div className="text-4xl font-bold text-green-500" style={{ fontFamily: "'Press Start 2P', cursive" }}>
              Ssssssss... BOOM!
            </div>
            <div className="text-green-400 mt-4 text-2xl">🟩⬛🟩<br/>⬛🟩⬛<br/>🟩🟩🟩</div>
          </div>
        </div>
      )}

      {/* Main Control Panel */}
      <div className={`
        relative overflow-hidden mc-card-dark rounded-xl border-4 transition-all duration-700
        ${isRunning ? 'border-emerald-500/60 shadow-[0_0_60px_-15px_rgba(16,185,129,0.5)]' : 'border-zinc-700/50'}
        ${hasActiveWorkflow ? 'border-yellow-500/60 shadow-[0_0_60px_-15px_rgba(234,179,8,0.5)]' : ''}
      `}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23ffffff' d='M0 0h16v16H0zM16 16h16v16H16z'/%3E%3C/svg%3E")`,
            backgroundSize: '32px 32px',
          }} />
        </div>

        {/* Torches when running */}
        {isRunning && (
          <>
            <div className="absolute top-4 left-4 text-3xl animate-torch">🔥</div>
            <div className="absolute top-4 right-4 text-3xl animate-torch" style={{ animationDelay: '0.25s' }}>🔥</div>
          </>
        )}

        <div className="relative p-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-6">
              {/* Status Indicator */}
              <div className={`
                relative w-24 h-24 rounded-xl flex items-center justify-center transition-all duration-500
                ${hasActiveWorkflow 
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse' 
                  : isRunning 
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500' 
                    : 'bg-gradient-to-br from-zinc-700 to-zinc-800'
                }
              `} style={{
                boxShadow: hasActiveWorkflow 
                  ? '0 0 50px rgba(234,179,8,0.7)' 
                  : isRunning 
                    ? '0 0 50px rgba(251,191,36,0.7)' 
                    : 'inset 0 4px 10px rgba(0,0,0,0.5)',
                border: '4px solid',
                borderColor: isRunning ? '#f59e0b #92400e #92400e #f59e0b' : '#52525b #27272a #27272a #52525b',
              }}>
                <span className="text-5xl">
                  {hasActiveWorkflow ? '⚙️' : isRunning ? '⚡' : '💤'}
                </span>
                {(isRunning || hasActiveWorkflow) && (
                  <div className="absolute inset-0 rounded-xl bg-yellow-400/40 animate-ping" style={{ animationDuration: '2s' }} />
                )}
              </div>

              <div>
                <h2 
                  className="text-2xl font-bold cursor-pointer select-none text-shadow-mc"
                  onClick={handleTitleClick}
                  style={{ 
                    fontFamily: "'Press Start 2P', cursive", 
                    fontSize: '16px', 
                    color: hasActiveWorkflow ? '#facc15' : isRunning ? '#4ade80' : '#ef4444' 
                  }}
                >
                  {hasActiveWorkflow 
                    ? 'DEPLOYING...' 
                    : isRunning 
                      ? 'SERVER ONLINE' 
                      : 'SERVER OFFLINE'
                  }
                </h2>
                <p className="text-gray-400 mt-2" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
                  {hasActiveWorkflow 
                    ? currentQuote
                    : isRunning 
                      ? '⛏️ All systems operational' 
                      : '💰 No infrastructure costs'
                  }
                </p>
                {/* GitHub Status */}
                <p className="text-xs text-gray-600 mt-1" style={{ fontFamily: "'VT323', monospace" }}>
                  State: {status?.state || 'UNKNOWN'} | 
                  Last check: {status?.lastUpdated ? new Date(status.lastUpdated).toLocaleTimeString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* Toggle Button */}
            <button
              onClick={handleToggle}
              disabled={toggling || loading || hasActiveWorkflow}
              className={`
                relative px-8 py-4 font-bold text-lg transition-all duration-300
                transform hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                ${hasActiveWorkflow 
                  ? 'mc-button' 
                  : isRunning 
                    ? 'mc-button-redstone' 
                    : 'mc-button-grass'
                }
              `}
              style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '12px' }}
            >
              {toggling || hasActiveWorkflow ? (
                <span className="flex items-center gap-3">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {hasActiveWorkflow ? 'IN PROGRESS...' : 'STARTING...'}
                </span>
              ) : isRunning ? (
                <span className="flex items-center gap-2">
                  <span className="text-xl">🛑</span> DESTROY
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="text-xl">🚀</span> DEPLOY
                </span>
              )}
            </button>
          </div>

          {/* Active Workflow Progress */}
          {hasActiveWorkflow && latestRun && (
            <div className="mb-8">
              <BlockBuildAnimation 
                isBuilding={true}
                isDestroying={latestRun.name?.includes('Destroy') || false}
                progress={workflowProgress}
              />
              
              {/* Workflow Steps */}
              <WorkflowProgress jobs={latestRun.jobs} runUrl={latestRun.url} />
            </div>
          )}

          {/* Last Workflow Result (when not active) */}
          {!hasActiveWorkflow && latestRun && (
            <div className={`mb-6 p-4 rounded-lg border-2 ${
              latestRun.conclusion === 'success' 
                ? 'bg-emerald-900/20 border-emerald-500/30' 
                : latestRun.conclusion === 'failure'
                  ? 'bg-red-900/20 border-red-500/30'
                  : 'bg-gray-900/20 border-gray-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {latestRun.conclusion === 'success' ? '✅' : latestRun.conclusion === 'failure' ? '❌' : '⏸️'}
                  </span>
                  <div>
                    <p className="text-white font-medium" style={{ fontFamily: "'VT323', monospace" }}>
                      Last run: {latestRun.conclusion?.toUpperCase() || 'UNKNOWN'}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {new Date(latestRun.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <a 
                  href={latestRun.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mc-button text-xs"
                  style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '8px' }}
                >
                  VIEW LOGS
                </a>
              </div>
            </div>
          )}

          {/* Services Grid */}
          {!hasActiveWorkflow && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {MINECRAFT_SERVICES.map((service, index) => (
                <ServiceBlock key={service.id} service={service} isRunning={isRunning} delay={index * 50} />
              ))}
            </div>
          )}

          {/* Quick Links when Running */}
          {isRunning && status?.metrics && !hasActiveWorkflow && (
            <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-white/10">
              <QuickLink href={status.metrics.grafanaUrl} icon="📈" label="Grafana" />
              <QuickLink href={status.gitHub.workflowUrl} icon="🔧" label="GitHub Actions" />
              <CopyButton value={status.metrics.minecraftAddress} icon="🎮" label="Copy Server IP" />
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-sm" style={{ fontFamily: "'VT323', monospace" }}>
            <span className="text-gray-500">
              💰 {isRunning ? '~$3-5/day while running' : '$0/day when stopped'}
            </span>
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                hasActiveWorkflow ? 'bg-yellow-500 animate-pulse' :
                loading ? 'bg-yellow-500' : 
                error ? 'bg-red-500' : 
                'bg-emerald-500'
              } animate-pulse`} />
              <span className="text-gray-500">
                {hasActiveWorkflow ? 'Workflow Running' : loading ? 'Checking...' : error ? 'API Error' : 'Live'}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Calculate progress percentage from workflow jobs/steps
function calculateWorkflowProgress(jobs?: WorkflowJob[]): number {
  if (!jobs || jobs.length === 0) return 0;
  
  let completedSteps = 0;
  let totalSteps = 0;
  
  for (const job of jobs) {
    for (const step of job.steps) {
      totalSteps++;
      if (step.status === 'completed') completedSteps++;
    }
  }
  
  return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
}

// Workflow progress component
function WorkflowProgress({ jobs, runUrl }: { jobs?: WorkflowJob[]; runUrl: string }) {
  if (!jobs || jobs.length === 0) {
    return (
      <div className="mt-4 p-4 bg-black/30 rounded-lg">
        <p className="text-gray-400 text-center" style={{ fontFamily: "'VT323', monospace" }}>
          Waiting for workflow to start...
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-black/30 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-yellow-400 font-bold" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}>
          TERRAFORM PROGRESS
        </h3>
        <a 
          href={runUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-xs underline"
        >
          View in GitHub →
        </a>
      </div>
      
      {jobs.map((job) => (
        <div key={job.name} className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">
              {job.status === 'completed' 
                ? (job.conclusion === 'success' ? '✅' : '❌')
                : job.status === 'in_progress' 
                  ? '⏳' 
                  : '⏸️'
              }
            </span>
            <span className="text-white font-medium" style={{ fontFamily: "'VT323', monospace" }}>
              {job.name}
            </span>
          </div>
          
          <div className="ml-6 space-y-1">
            {job.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${
                  step.status === 'completed'
                    ? (step.conclusion === 'success' ? 'bg-emerald-500' : 'bg-red-500')
                    : step.status === 'in_progress'
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-gray-600'
                }`} />
                <span className={`${
                  step.status === 'in_progress' ? 'text-yellow-400' : 
                  step.status === 'completed' ? 'text-gray-400' : 
                  'text-gray-600'
                }`} style={{ fontFamily: "'VT323', monospace" }}>
                  {step.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ServiceBlock({ service, isRunning, delay }: { 
  service: typeof MINECRAFT_SERVICES[0]; 
  isRunning: boolean; 
  delay: number;
}) {
  return (
    <div 
      className={`
        relative overflow-hidden rounded-lg p-3 transition-all duration-500
        transform hover:scale-105 cursor-pointer
        ${isRunning ? 'mc-slot bg-emerald-900/30' : 'mc-slot opacity-50'}
      `}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {isRunning && <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent" />}
      <div className="relative flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${
          isRunning ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-zinc-600'
        }`} />
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
