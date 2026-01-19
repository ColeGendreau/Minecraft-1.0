'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getInfrastructureStatus,
  toggleInfrastructure,
  getLatestWorkflow,
  type InfrastructureStatusResponse,
  type LatestWorkflowResponse,
  type WorkflowJob,
  type WorkflowStep,
} from '@/lib/api';

// Minecraft quotes for loading states
const DEPLOY_QUOTES = [
  "Mining resources...", "Punching trees...", "Crafting infrastructure...",
  "Smelting containers...", "Enchanting services...", "Building the Nether portal...",
  "Taming cloud wolves...", "Brewing deployment potions...", "Trading with Azure villagers...",
];

const DESTROY_QUOTES = [
  "Detonating TNT...", "Releasing the Wither...", "Draining the ocean...",
  "Breaking bedrock...", "Despawning entities...", "Closing the portal...",
];

export function InfrastructurePanel() {
  const [status, setStatus] = useState<InfrastructureStatusResponse | null>(null);
  const [workflow, setWorkflow] = useState<LatestWorkflowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuote, setCurrentQuote] = useState(DEPLOY_QUOTES[0]);
  const [showSecretCreeper, setShowSecretCreeper] = useState(false);
  const [titleClicks, setTitleClicks] = useState(0);
  const [showAdminTools, setShowAdminTools] = useState(false);

  // Determine if we're deploying or destroying based on workflow
  const isDestroyOperation = workflow?.latestRun?.name?.toLowerCase().includes('destroy') ||
    workflow?.latestRun?.jobs?.some(j => 
      j.steps?.some(s => s.name?.toLowerCase().includes('destroy') && s.status === 'in_progress')
    ) || false;

  // Rotate quotes during active workflow
  useEffect(() => {
    if (workflow?.hasActiveRun || toggling) {
      const quotes = isDestroyOperation ? DESTROY_QUOTES : DEPLOY_QUOTES;
      const interval = setInterval(() => {
        setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [workflow?.hasActiveRun, toggling, isDestroyOperation]);

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
        setTimeout(fetchData, 2000);
      }
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

      {/* Main Panel */}
      <div className={`
        relative overflow-hidden rounded-xl border-4 transition-all duration-500
        ${hasActiveWorkflow 
          ? 'border-yellow-500/60 bg-gradient-to-br from-yellow-900/20 to-orange-900/20' 
          : isRunning 
            ? 'border-emerald-500/60 bg-gradient-to-br from-emerald-900/20 to-green-900/20' 
            : 'border-zinc-700/50 bg-gradient-to-br from-zinc-900/50 to-slate-900/50'
        }
      `}>
        {/* Decorative torches */}
        {isRunning && !hasActiveWorkflow && (
          <>
            <div className="absolute top-4 left-4 text-3xl animate-pulse">🔥</div>
            <div className="absolute top-4 right-4 text-3xl animate-pulse" style={{ animationDelay: '0.5s' }}>🔥</div>
          </>
        )}

        <div className="relative p-6">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              {/* Status Indicator */}
              <div className={`
                w-16 h-16 rounded-xl flex items-center justify-center text-4xl
                transition-all duration-300
                ${hasActiveWorkflow 
                  ? 'bg-yellow-500/20 animate-pulse' 
                  : isRunning 
                    ? 'bg-emerald-500/20' 
                    : 'bg-zinc-700/50'
                }
              `} style={{
                boxShadow: hasActiveWorkflow 
                  ? '0 0 30px rgba(234,179,8,0.4)' 
                  : isRunning 
                    ? '0 0 30px rgba(16,185,129,0.4)' 
                    : 'none',
              }}>
                {hasActiveWorkflow ? '⚙️' : isRunning ? '⚡' : '💤'}
              </div>

              <div>
                <h2 
                  className="cursor-pointer select-none"
                  onClick={handleTitleClick}
                  style={{ 
                    fontFamily: "'Press Start 2P', cursive", 
                    fontSize: '14px', 
                    color: hasActiveWorkflow ? '#facc15' : isRunning ? '#4ade80' : '#ef4444' 
                  }}
                >
                  {hasActiveWorkflow 
                    ? (isDestroyOperation ? 'DESTROYING...' : 'DEPLOYING...') 
                    : isRunning 
                      ? 'SERVER ONLINE' 
                      : 'SERVER OFFLINE'
                  }
                </h2>
                <p className="text-gray-400 mt-1" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                  {hasActiveWorkflow ? currentQuote : isRunning ? '⛏️ All systems operational' : '💰 No infrastructure costs'}
                </p>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleToggle}
              disabled={toggling || loading || hasActiveWorkflow}
              className={`
                px-6 py-3 rounded-lg font-bold transition-all duration-300
                transform hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                ${hasActiveWorkflow 
                  ? 'bg-gray-600 text-gray-300' 
                  : isRunning 
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/30' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                }
              `}
              style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}
            >
              {toggling || hasActiveWorkflow ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  IN PROGRESS
                </span>
              ) : isRunning ? (
                <span className="flex items-center gap-2">🛑 DESTROY</span>
              ) : (
                <span className="flex items-center gap-2">🚀 DEPLOY</span>
              )}
            </button>
          </div>

          {/* Active Workflow Progress */}
          {hasActiveWorkflow && latestRun && (
            <WorkflowProgressPanel 
              jobs={latestRun.jobs} 
              runUrl={latestRun.url}
              isDestroyOperation={isDestroyOperation}
            />
          )}

          {/* Server Info (when running and no active workflow) */}
          {isRunning && !hasActiveWorkflow && status?.metrics && (
            <ServerInfoPanel metrics={status.metrics} />
          )}

          {/* Last Run Summary (when not running and no active workflow) */}
          {!hasActiveWorkflow && latestRun && (
            <LastRunSummary run={latestRun} />
          )}

          {/* Admin Tools - Expandable */}
          <div className="mt-6">
            <button
              onClick={() => setShowAdminTools(!showAdminTools)}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-400 transition-colors text-sm"
              style={{ fontFamily: "'VT323', monospace" }}
            >
              <span className={`transition-transform ${showAdminTools ? 'rotate-90' : ''}`}>▶</span>
              <span>🔧 Admin Tools</span>
            </button>
            
            {showAdminTools && (
              <div className="mt-3 p-4 bg-black/30 rounded-lg border border-gray-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <a
                    href="https://github.com/ColeGendreau/Minecraft-1.0/actions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <span className="text-xl">🔧</span>
                    <div>
                      <p className="text-white text-sm font-medium" style={{ fontFamily: "'VT323', monospace" }}>GitHub Actions</p>
                      <p className="text-gray-500 text-xs">Re-run workflows, view all logs</p>
                    </div>
                  </a>
                  <a
                    href="https://github.com/ColeGendreau/Minecraft-1.0/actions/workflows/deploy.yaml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <span className="text-xl">🚀</span>
                    <div>
                      <p className="text-white text-sm font-medium" style={{ fontFamily: "'VT323', monospace" }}>Deploy Workflow</p>
                      <p className="text-gray-500 text-xs">Minecraft & monitoring deploy</p>
                    </div>
                  </a>
                  <a
                    href="https://github.com/ColeGendreau/Minecraft-1.0/actions/workflows/terraform.yaml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <span className="text-xl">🏗️</span>
                    <div>
                      <p className="text-white text-sm font-medium" style={{ fontFamily: "'VT323', monospace" }}>Terraform Workflow</p>
                      <p className="text-gray-500 text-xs">Infrastructure create/destroy</p>
                    </div>
                  </a>
                  <a
                    href="https://portal.azure.com/#view/HubsExtension/BrowseResourceGroups"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <span className="text-xl">☁️</span>
                    <div>
                      <p className="text-white text-sm font-medium" style={{ fontFamily: "'VT323', monospace" }}>Azure Portal</p>
                      <p className="text-gray-500 text-xs">View resources directly</p>
                    </div>
                  </a>
                </div>
                <p className="mt-3 text-xs text-gray-600" style={{ fontFamily: "'VT323', monospace" }}>
                  💡 Tip: If deploy fails, click GitHub Actions → failed run → Re-run all jobs
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-sm" style={{ fontFamily: "'VT323', monospace" }}>
            <span className="text-gray-500">
              💰 {isRunning ? '~$3-5/day while running' : '$0/day when stopped'}
            </span>
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                hasActiveWorkflow ? 'bg-yellow-500' : loading ? 'bg-yellow-500' : error ? 'bg-red-500' : 'bg-emerald-500'
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

// Workflow Progress Panel - Only shows relevant steps
function WorkflowProgressPanel({ 
  jobs, 
  runUrl, 
  isDestroyOperation 
}: { 
  jobs?: WorkflowJob[]; 
  runUrl: string;
  isDestroyOperation: boolean;
}) {
  if (!jobs || jobs.length === 0) {
    return (
      <div className="mb-6 p-4 bg-black/30 rounded-lg">
        <p className="text-gray-400 text-center" style={{ fontFamily: "'VT323', monospace" }}>
          Waiting for workflow to start...
        </p>
      </div>
    );
  }

  // Calculate overall progress
  let completedSteps = 0;
  let totalSteps = 0;
  
  for (const job of jobs) {
    for (const step of job.steps) {
      // Filter steps based on operation type
      const isDestroyStep = step.name?.toLowerCase().includes('destroy') || step.name?.toLowerCase().includes('cleanup');
      const isProvisionStep = step.name?.toLowerCase().includes('provision') || step.name?.toLowerCase().includes('apply');
      
      // Skip irrelevant steps in count
      if (isDestroyOperation && isProvisionStep && !isDestroyStep) continue;
      if (!isDestroyOperation && isDestroyStep && !isProvisionStep) continue;
      
      totalSteps++;
      if (step.status === 'completed') completedSteps++;
    }
  }
  
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="mb-6 p-4 bg-black/30 rounded-lg">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px', color: isDestroyOperation ? '#ef4444' : '#4ade80' }}>
          {isDestroyOperation ? '💥 TERRAFORM DESTROY' : '🔨 TERRAFORM APPLY'}
        </h3>
        <a 
          href={runUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-xs underline"
        >
          View full logs →
        </a>
      </div>

      {/* Visual Progress Bar */}
      <div className="mb-4">
        <div className="h-4 bg-black/50 rounded-full overflow-hidden border border-gray-700">
          <div 
            className="h-full transition-all duration-500 flex items-center justify-center"
            style={{
              width: `${progress}%`,
              background: isDestroyOperation 
                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                : 'linear-gradient(90deg, #10b981, #059669)',
            }}
          >
            <span className="text-xs font-bold text-white drop-shadow">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Steps List - Filtered by operation type */}
      {jobs.map((job) => (
        <div key={job.name} className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">
              {job.status === 'completed' 
                ? (job.conclusion === 'success' ? '✅' : '❌')
                : job.status === 'in_progress' 
                  ? '⏳' 
                  : '⏸️'
              }
            </span>
            <span className="text-white font-medium" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
              {job.name}
            </span>
          </div>
          
          <div className="ml-6 space-y-1">
            {job.steps
              .filter(step => {
                // Filter steps based on operation type
                const isDestroyStep = step.name?.toLowerCase().includes('destroy') || step.name?.toLowerCase().includes('cleanup');
                const isProvisionStep = step.name?.toLowerCase().includes('provision');
                
                // Always show generic steps (checkout, setup, etc.)
                if (!isDestroyStep && !isProvisionStep) return true;
                
                // Show only relevant steps for current operation
                if (isDestroyOperation) return isDestroyStep || !isProvisionStep;
                return isProvisionStep || !isDestroyStep;
              })
              .map((step, i) => (
                <StepRow key={i} step={step} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StepRow({ step }: { step: WorkflowStep }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-2 h-2 rounded-full ${
        step.status === 'completed'
          ? (step.conclusion === 'success' ? 'bg-emerald-500' : step.conclusion === 'skipped' ? 'bg-gray-500' : 'bg-red-500')
          : step.status === 'in_progress'
            ? 'bg-yellow-500 animate-pulse'
            : 'bg-gray-600'
      }`} />
      <span className={`${
        step.status === 'in_progress' ? 'text-yellow-400 font-medium' : 
        step.status === 'completed' && step.conclusion === 'success' ? 'text-gray-400' : 
        step.status === 'completed' && step.conclusion === 'skipped' ? 'text-gray-600' :
        step.status === 'completed' && step.conclusion === 'failure' ? 'text-red-400' :
        'text-gray-500'
      }`} style={{ fontFamily: "'VT323', monospace" }}>
        {step.name}
        {step.status === 'in_progress' && <span className="ml-2 animate-pulse">⏳</span>}
      </span>
    </div>
  );
}

// Server Info Panel - Shows Minecraft connection details
function ServerInfoPanel({ metrics }: { metrics: InfrastructureStatusResponse['metrics'] }) {
  const [copied, setCopied] = useState(false);

  const copyServerIP = () => {
    if (metrics?.minecraftAddress) {
      navigator.clipboard.writeText(metrics.minecraftAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!metrics) return null;

  return (
    <div className="mb-6 p-4 bg-emerald-900/20 rounded-lg border border-emerald-500/30">
      <h3 className="mb-4" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px', color: '#4ade80' }}>
        🎮 MINECRAFT SERVER
      </h3>

      {/* Connection Box */}
      <div className="bg-black/40 rounded-lg p-4 mb-4">
        <p className="text-gray-400 text-sm mb-2" style={{ fontFamily: "'VT323', monospace" }}>
          Server Address:
        </p>
        <div className="flex items-center gap-3">
          <code className="text-xl text-emerald-400 font-mono bg-black/50 px-3 py-2 rounded flex-grow">
            {metrics.minecraftAddress || 'Loading...'}
          </code>
          <button
            onClick={copyServerIP}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
            style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '8px' }}
          >
            {copied ? '✅ COPIED!' : '📋 COPY'}
          </button>
        </div>
      </div>

      {/* How to Join */}
      <div className="bg-black/30 rounded-lg p-4 mb-4">
        <h4 className="text-white mb-3" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '8px' }}>
          📖 HOW TO JOIN:
        </h4>
        <ol className="space-y-2 text-gray-300" style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">1.</span>
            <span>Open Minecraft Java Edition (1.21.3)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">2.</span>
            <span>Click <span className="text-white">Multiplayer</span> → <span className="text-white">Add Server</span></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">3.</span>
            <span>Paste the server address above</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">4.</span>
            <span>Click <span className="text-white">Done</span> and <span className="text-white">Join Server</span></span>
          </li>
        </ol>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-3">
        {metrics.grafanaUrl && (
          <a
            href={metrics.grafanaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded transition-colors"
            style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '8px' }}
          >
            📈 GRAFANA
          </a>
        )}
        <a
          href="https://github.com/ColeGendreau/Minecraft-1.0/actions"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
          style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '8px' }}
        >
          🔧 GITHUB
        </a>
      </div>
    </div>
  );
}

// Last Run Summary
function LastRunSummary({ run }: { run: LatestWorkflowResponse['latestRun'] }) {
  if (!run) return null;

  const isSuccess = run.conclusion === 'success';
  const isFailed = run.conclusion === 'failure';

  return (
    <div className={`mb-6 p-4 rounded-lg border ${
      isSuccess 
        ? 'bg-emerald-900/20 border-emerald-500/30' 
        : isFailed
          ? 'bg-red-900/20 border-red-500/30'
          : 'bg-gray-900/20 border-gray-500/30'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">
            {isSuccess ? '✅' : isFailed ? '❌' : '⏸️'}
          </span>
          <div>
            <p className="text-white" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
              Last run: {run.conclusion?.toUpperCase() || 'UNKNOWN'}
            </p>
            <p className="text-gray-500 text-xs">
              {new Date(run.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <a 
          href={run.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
          style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '8px' }}
        >
          VIEW LOGS
        </a>
      </div>
    </div>
  );
}
