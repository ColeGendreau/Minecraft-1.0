'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTheme } from '@/lib/theme-context';
import { 
  getInfrastructureStatus, 
  getInfrastructureCost,
  getInfrastructureLogs,
  toggleInfrastructure,
  getLatestWorkflow,
  nukeAllAssets,
  getAssets,
  checkHealth,
  getMonitoringData,
  type InfrastructureStatusResponse,
  type InfrastructureCostResponse,
  type InfrastructureLogsResponse,
  type InfrastructureTransition,
  type LatestWorkflowResponse,
  type WorkflowJob,
  type WorkflowStep,
  type Asset,
  type MonitoringResponse,
  type PodInfo,
  type NodeInfo
} from '@/lib/api';

export default function AdminPage() {
  const { isDay } = useTheme();
  const [loading, setLoading] = useState(true);
  const [infraStatus, setInfraStatus] = useState<InfrastructureStatusResponse | null>(null);
  const [infraCost, setInfraCost] = useState<InfrastructureCostResponse | null>(null);
  const [infraLogs, setInfraLogs] = useState<InfrastructureLogsResponse | null>(null);
  const [workflow, setWorkflow] = useState<LatestWorkflowResponse | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [monitoring, setMonitoring] = useState<MonitoringResponse | null>(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showNukeConfirm, setShowNukeConfirm] = useState(false);
  const [showAzureLogs, setShowAzureLogs] = useState(true);
  const [showMonitoring, setShowMonitoring] = useState(true);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all');

  const fetchData = useCallback(async () => {
    try {
      await checkHealth();
      setApiOnline(true);
      
      const [statusData, costData, logsData, workflowData, assetsData, monitoringData] = await Promise.all([
        getInfrastructureStatus().catch(() => null),
        getInfrastructureCost().catch(() => null),
        getInfrastructureLogs().catch(() => null),
        getLatestWorkflow().catch(() => null),
        getAssets().catch(() => ({ assets: [] })),
        getMonitoringData().catch(() => null)
      ]);
      
      setInfraStatus(statusData);
      setInfraCost(costData);
      setInfraLogs(logsData);
      setWorkflow(workflowData);
      setAssets(assetsData.assets);
      setMonitoring(monitoringData);
    } catch {
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll more frequently during transitions (every 5s) vs normal (every 30s)
    const pollInterval = infraStatus?.isTransitioning || workflow?.hasActiveRun ? 5000 : 30000;
    const interval = setInterval(fetchData, pollInterval);
    return () => clearInterval(interval);
  }, [fetchData, infraStatus?.isTransitioning, workflow?.hasActiveRun]);

  const handleToggleInfra = async (targetState: 'ON' | 'OFF') => {
    setActionLoading('toggle');
    try {
      await toggleInfrastructure(targetState);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle infrastructure');
    } finally {
      setActionLoading(null);
    }
  };

  const handleNuke = async () => {
    setShowNukeConfirm(false);
    setActionLoading('nuke');
    try {
      const result = await nukeAllAssets();
      alert(`☢️ Nuked ${result.deletedCount} assets!`);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to nuke assets');
    } finally {
      setActionLoading(null);
    }
  };

  const isRunning = infraStatus?.isRunning ?? false;

  return (
    <main className={`min-h-screen transition-colors duration-500 ${
      isDay 
        ? 'bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-200' 
        : 'bg-gradient-to-b from-slate-900 via-purple-900/30 to-slate-800'
    }`}>
      {/* Sky decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {isDay ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="absolute animate-float opacity-60" style={{ left: `${(i * 25) % 100}%`, top: `${3 + (i * 5) % 15}%`, animationDelay: `${i}s`, animationDuration: `${5 + (i % 2)}s` }}>
              <div className="flex gap-1">
                <div className="w-10 h-6 bg-white rounded-lg" />
                <div className="w-14 h-8 bg-white rounded-lg -mt-1" />
                <div className="w-8 h-5 bg-white rounded-lg" />
              </div>
            </div>
          ))
        ) : (
          [...Array(20)].map((_, i) => (
            <div key={i} className="absolute animate-pulse" style={{ left: `${(i * 5) % 100}%`, top: `${(i * 5) % 50}%`, animationDelay: `${i * 0.1}s` }}>
              <span className="text-white text-xs">✦</span>
            </div>
          ))
        )}
      </div>

      {/* Nuke Modal */}
      {showNukeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`p-8 max-w-md rounded-lg border-4 shadow-2xl ${isDay ? 'bg-white border-red-500' : 'bg-slate-800 border-red-700'}`}>
            <div className="text-center">
              <div className="text-6xl mb-4">☢️</div>
              <h2 className="text-xl text-red-500 mb-4" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}>
                NUKE ALL ASSETS?
              </h2>
              <p className={`mb-6 ${isDay ? 'text-gray-700' : 'text-gray-300'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                This will DELETE all {assets.length} assets from the Minecraft world.
              </p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => setShowNukeConfirm(false)} className="mc-button-stone">CANCEL</button>
                <button onClick={handleNuke} className="mc-button-stone !bg-red-600 !border-red-800">☢️ CONFIRM</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className={`relative border-b-4 shadow-lg transition-colors duration-500 ${
        isDay ? 'bg-amber-100/80 backdrop-blur border-amber-400' : 'bg-slate-800/80 backdrop-blur border-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className={`font-bold transition-colors ${isDay ? 'text-amber-700 hover:text-amber-900' : 'text-slate-300 hover:text-white'}`}>
                ← Back
              </Link>
              <div>
                <h1 className={`text-xl ${isDay ? 'text-amber-900' : 'text-white'}`} style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}>
                  ⚙️ ADMIN PANEL
                </h1>
                <p className={`mt-1 ${isDay ? 'text-amber-700' : 'text-slate-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
                  Infrastructure & monitoring
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${
              apiOnline 
                ? (isDay ? 'bg-emerald-100 border-emerald-400' : 'bg-emerald-900/50 border-emerald-700') 
                : 'bg-red-100 border-red-400'
            }`}>
              <div className={`w-3 h-3 rounded-full ${apiOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={`text-sm font-bold ${apiOnline ? (isDay ? 'text-emerald-700' : 'text-emerald-400') : 'text-red-700'}`} style={{ fontFamily: "'VT323', monospace" }}>
                API {apiOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 relative">
        {loading ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">⛏️</div>
            <p className={`text-xl ${isDay ? 'text-amber-800' : 'text-slate-300'}`} style={{ fontFamily: "'VT323', monospace" }}>Loading...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Server Control */}
            <section>
              <SectionHeader icon="⚙️" title="SERVER CONTROL" isDay={isDay} />
              <div className="mc-panel-dirt p-6 rounded-lg text-white">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded flex items-center justify-center text-4xl ${
                      infraStatus?.isTransitioning 
                        ? (infraStatus.operationalState === 'deploying' ? 'bg-green-500/30 animate-pulse' : 'bg-red-500/30 animate-pulse')
                        : isRunning 
                          ? 'bg-green-500/30' 
                          : 'bg-gray-500/30'
                    }`}>
                      {infraStatus?.isTransitioning 
                        ? (infraStatus.operationalState === 'deploying' ? '🚀' : '🔥') 
                        : isRunning ? '⚡' : '💤'}
                    </div>
                    <div>
                      <h3 className="text-white text-shadow-mc" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}>
                        {infraStatus?.isTransitioning 
                          ? (infraStatus.operationalState === 'deploying' ? 'DEPLOYING...' : 'DESTROYING...')
                          : isRunning ? 'SERVER ONLINE' : 'SERVER OFFLINE'}
                      </h3>
                      <p className="text-green-200 mt-1" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                        {infraStatus?.isTransitioning 
                          ? `${infraStatus.operationalState === 'deploying' ? 'Creating' : 'Removing'} infrastructure (~${infraStatus.transition?.estimatedMinutes || 10} min)`
                          : isRunning 
                            ? 'All systems operational' 
                            : 'Infrastructure stopped'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleInfra(isRunning ? 'OFF' : 'ON')}
                    disabled={actionLoading === 'toggle' || infraStatus?.isTransitioning}
                    className={`
                      px-8 py-4 rounded text-white font-bold transition-all
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${infraStatus?.isTransitioning 
                        ? 'mc-button-secondary' 
                        : isRunning ? 'mc-button-red' : 'mc-button-grass'}
                    `}
                    style={{ fontFamily: "'VT323', monospace", fontSize: '20px', letterSpacing: '1px' }}
                  >
                    {actionLoading === 'toggle' || infraStatus?.isTransitioning ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        {infraStatus?.operationalState === 'deploying' ? 'DEPLOYING...' : 
                         infraStatus?.operationalState === 'destroying' ? 'DESTROYING...' : 'WORKING...'}
                      </span>
                    ) : isRunning ? '🛑 DESTROY' : '🚀 DEPLOY'}
                  </button>
                </div>

                {/* Transition Progress */}
                {infraStatus?.isTransitioning && infraStatus.transition && (
                  <TransitionProgressPanel transition={infraStatus.transition} />
                )}

                {isRunning && infraStatus?.metrics?.minecraftAddress && (
                  <div className="mc-panel-oak p-4 mb-6 rounded">
                    <h3 className="text-amber-900 mb-3 font-bold" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
                      🎮 JOIN SERVER
                    </h3>
                    <div className="flex items-center gap-3">
                      <code className="flex-grow bg-amber-100 px-4 py-2 text-amber-900 font-mono text-lg rounded border-2 border-amber-300">
                        {infraStatus.metrics.minecraftAddress}
                      </code>
                      <button 
                        onClick={() => navigator.clipboard.writeText(infraStatus.metrics?.minecraftAddress || '')} 
                        className="mc-button"
                        style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}
                      >
                        📋 COPY
                      </button>
                    </div>
                    <div className="mt-3 p-3 bg-amber-200 border-2 border-amber-400 rounded">
                      <p className="text-amber-900 font-bold" style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}>
                        📋 How to connect:
                      </p>
                      <p className="text-amber-800 mt-1" style={{ fontFamily: "'VT323', monospace", fontSize: '15px' }}>
                        Open Minecraft Java → Multiplayer → Add Server → Paste address above
                      </p>
                    </div>
                  </div>
                )}

                <h4 className="text-green-200 mb-4 font-bold tracking-wide" style={{ fontFamily: "'VT323', monospace", fontSize: '20px', letterSpacing: '2px' }}>SERVICES</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(infraStatus?.services || [
                    { id: 'kubernetes', name: 'Kubernetes Cluster', icon: 'kubernetes', status: 'unknown' },
                    { id: 'container', name: 'Container Registry', icon: 'container', status: 'unknown' },
                    { id: 'globe', name: 'Static Public IP', icon: 'globe', status: 'unknown' },
                    { id: 'route', name: 'NGINX Ingress', icon: 'route', status: 'unknown' },
                    { id: 'lock', name: 'Cert Manager', icon: 'lock', status: 'unknown' },
                    { id: 'game', name: 'Minecraft Server', icon: 'game', status: 'unknown' },
                    { id: 'chart', name: 'Prometheus', icon: 'chart', status: 'unknown' },
                    { id: 'dashboard', name: 'Grafana', icon: 'dashboard', status: 'unknown' },
                  ]).map((s) => (
                    <ServiceCard key={s.id} service={s} isDay={isDay} />
                  ))}
                </div>

                {/* Workflow Progress - shown when active */}
                {workflow?.hasActiveRun && workflow?.latestRun?.jobs && (
                  <WorkflowProgressPanel jobs={workflow.latestRun.jobs} runUrl={workflow.latestRun.url} />
                )}
              </div>

              {/* Footer with cost and status */}
              <div className="flex items-center justify-between text-sm px-2 mt-4" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                <span className="text-amber-800 font-semibold">
                  💰 {isRunning ? '~$3-5/day while running' : '$0/day when stopped'}
                </span>
                <span className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${
                    workflow?.hasActiveRun ? 'bg-yellow-500 animate-pulse' : 
                    loading ? 'bg-yellow-500' : 
                    apiOnline ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-green-700 font-semibold">
                    {workflow?.hasActiveRun ? 'Workflow Running' : loading ? 'Loading...' : apiOnline ? 'Connected' : 'Disconnected'}
                  </span>
                </span>
              </div>
            </section>

            {/* Stats */}
            <section className="grid md:grid-cols-4 gap-4">
              <StatCard icon="🖼️" label="Assets" value={assets.length.toString()} color="purple" isDay={isDay} />
              <StatCard icon="📦" label="Pods" value={infraStatus?.metrics?.pods?.toString() ?? '-'} color="sky" isDay={isDay} />
              <StatCard icon="🖥️" label="Nodes" value={infraStatus?.metrics?.nodes?.toString() ?? '-'} color="cyan" isDay={isDay} />
              <StatCard icon="💾" label="CPU" value={infraStatus?.metrics?.cpuUsage ? `${infraStatus.metrics.cpuUsage}%` : '-'} color="orange" isDay={isDay} />
            </section>

            {/* Cost Dashboard */}
            <section>
              <SectionHeader icon="💰" title="AZURE COSTS" isDay={isDay} />
              <CostDashboard costs={infraCost} isDay={isDay} />
            </section>

            {/* Quick Links */}
            <section className="grid md:grid-cols-4 gap-4">
              <MonitoringLink icon="📈" title="Grafana" href={infraStatus?.metrics?.grafanaUrl} disabled={!isRunning} isDay={isDay} />
              <MonitoringLink icon="📊" title="Prometheus" href={infraStatus?.metrics?.grafanaUrl?.replace('grafana', 'prometheus')} disabled={!isRunning} isDay={isDay} />
              <MonitoringLink icon="☁️" title="Azure Portal" href="https://portal.azure.com/#view/Microsoft_Azure_CostManagement/Menu/~/costanalysis" disabled={false} isDay={isDay} />
              <MonitoringLink icon="🔄" title="GitHub Actions" href="https://github.com/ColeGendreau/Minecraft-1.0/actions" disabled={false} isDay={isDay} />
            </section>

            {/* Cluster Monitoring - Detailed View */}
            {isRunning && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <SectionHeader icon="📊" title="CLUSTER MONITORING" isDay={isDay} />
                  <div className="flex items-center gap-2">
                    {monitoring?.kubernetes?.namespaces && monitoring.kubernetes.namespaces.length > 0 && (
                      <select
                        value={selectedNamespace}
                        onChange={(e) => setSelectedNamespace(e.target.value)}
                        className={`px-3 py-2 rounded border-2 ${
                          isDay 
                            ? 'bg-white border-slate-300 text-slate-700' 
                            : 'bg-slate-700 border-slate-600 text-slate-300'
                        }`}
                        style={{ fontFamily: "'VT323', monospace", fontSize: '14px' }}
                      >
                        <option value="all">All Namespaces</option>
                        {monitoring.kubernetes.namespaces.map(ns => (
                          <option key={ns} value={ns}>{ns}</option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => setShowMonitoring(!showMonitoring)}
                      className={`px-4 py-2 rounded border-2 transition-all ${
                        isDay 
                          ? 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700' 
                          : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'
                      }`}
                      style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}
                    >
                      {showMonitoring ? '▼ COLLAPSE' : '▶ EXPAND'}
                    </button>
                  </div>
                </div>
                
                {showMonitoring && (
                  <ClusterMonitoringPanel 
                    monitoring={monitoring} 
                    isDay={isDay} 
                    selectedNamespace={selectedNamespace}
                  />
                )}
              </section>
            )}

            {/* Workflow */}
            {workflow?.latestRun && (
              <section>
                <SectionHeader icon="🔄" title="LATEST WORKFLOW" isDay={isDay} />
                <div className={`p-6 rounded-lg border-4 shadow-xl ${isDay ? 'bg-white/90 border-purple-400' : 'bg-slate-800/90 border-purple-700'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-4 h-4 rounded-full ${
                        workflow.latestRun.conclusion === 'success' ? 'bg-emerald-500' :
                        workflow.latestRun.status === 'in_progress' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className={`font-bold ${isDay ? 'text-gray-800' : 'text-white'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>{workflow.latestRun.name}</p>
                        <p className={isDay ? 'text-gray-500' : 'text-gray-400'} style={{ fontFamily: "'VT323', monospace" }}>{workflow.latestRun.status}</p>
                      </div>
                    </div>
                    <a href={workflow.latestRun.url} target="_blank" rel="noopener noreferrer" className="mc-button-grass text-sm">View →</a>
                  </div>
                </div>
              </section>
            )}

            {/* Azure Infrastructure Logs - Terminal Style */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <SectionHeader icon="🖥️" title="AZURE INFRASTRUCTURE" isDay={isDay} />
                <button
                  onClick={() => setShowAzureLogs(!showAzureLogs)}
                  className={`px-4 py-2 rounded border-2 transition-all ${
                    isDay 
                      ? 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700' 
                      : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'
                  }`}
                  style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}
                >
                  {showAzureLogs ? '▼ COLLAPSE' : '▶ EXPAND'}
                </button>
              </div>
              
              {showAzureLogs && (
                <AzureInfrastructurePanel logs={infraLogs} />
              )}
            </section>

            {/* Danger Zone */}
            <section>
              <SectionHeader icon="⚠️" title="DANGER ZONE" isDay={isDay} />
              <div className={`p-6 rounded-lg border-4 shadow-xl ${isDay ? 'bg-red-50 border-red-400' : 'bg-red-900/30 border-red-700'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-red-500 font-bold" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}>☢️ NUKE ALL ASSETS</h4>
                    <p className={`mt-1 ${isDay ? 'text-red-600' : 'text-red-400'}`} style={{ fontFamily: "'VT323', monospace" }}>Delete all {assets.length} assets</p>
                  </div>
                  <button onClick={() => setShowNukeConfirm(true)} disabled={actionLoading === 'nuke' || assets.length === 0} className="mc-button-stone !bg-red-600 !border-red-800 disabled:opacity-50">
                    {actionLoading === 'nuke' ? '☢️...' : '☢️ NUKE'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function SectionHeader({ icon, title, isDay }: { icon: string; title: string; isDay: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-2xl drop-shadow-lg">{icon}</span>
      <h2 className={isDay ? 'text-amber-900' : 'text-white'} style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '12px' }}>{title}</h2>
    </div>
  );
}

function ServiceCard({ service, isDay }: { service: { id: string; name: string; icon: string; status: string }; isDay: boolean }) {
  const isOnline = service.status === 'running';
  const isStarting = service.status === 'starting';
  const isStopping = service.status === 'stopping';
  const isTransitioning = isStarting || isStopping;
  
  // Better emoji mapping matching the old design
  const iconMap: Record<string, string> = {
    kubernetes: '☸️',
    k8s: '☸️',
    container: '📦',
    acr: '📦',
    registry: '📦',
    globe: '🌐',
    ip: '🌐',
    route: '🚪',
    nginx: '🚪',
    ingress: '🚪',
    lock: '🔒',
    cert: '🔒',
    game: '🎮',
    mc: '🎮',
    minecraft: '🎮',
    chart: '📊',
    prom: '📊',
    prometheus: '📊',
    dashboard: '📈',
    graf: '📈',
    grafana: '📈',
  };
  
  const displayIcon = iconMap[service.icon] || iconMap[service.id] || service.icon || '⬜';
  
  // Status colors
  const statusColor = isOnline 
    ? 'bg-emerald-500 shadow-emerald-500/50' 
    : isStarting 
      ? 'bg-green-400 animate-pulse shadow-green-400/50'
      : isStopping
        ? 'bg-red-400 animate-pulse shadow-red-400/50'
        : 'bg-gray-500';
  
  return (
    <div className={`
      mc-slot p-3 text-center transition-all rounded
      ${isOnline || isTransitioning ? 'opacity-100' : 'opacity-60'}
    `}>
      <div className={`text-3xl mb-2 drop-shadow-lg ${isTransitioning ? 'animate-pulse' : ''}`}>
        {displayIcon}
      </div>
      <p className={`text-sm font-bold truncate ${isDay ? 'text-gray-800' : 'text-gray-200'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '14px' }}>
        {service.name}
      </p>
      <div className={`w-3 h-3 rounded-full mx-auto mt-2 shadow-lg ${statusColor}`} />
      {isTransitioning && (
        <p className={`text-xs mt-1 ${isStarting ? 'text-green-600' : 'text-red-600'}`} style={{ fontFamily: "'VT323', monospace" }}>
          {isStarting ? 'Starting...' : 'Stopping...'}
        </p>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, isDay }: { icon: string; label: string; value: string; color: string; isDay: boolean }) {
  const dayBg: Record<string, string> = { purple: 'bg-purple-100 border-purple-400', sky: 'bg-sky-100 border-sky-400', cyan: 'bg-cyan-100 border-cyan-400', orange: 'bg-orange-100 border-orange-400' };
  const nightBg: Record<string, string> = { purple: 'bg-purple-900/50 border-purple-700', sky: 'bg-sky-900/50 border-sky-700', cyan: 'bg-cyan-900/50 border-cyan-700', orange: 'bg-orange-900/50 border-orange-700' };
  const dayText: Record<string, string> = { purple: 'text-purple-700', sky: 'text-sky-700', cyan: 'text-cyan-700', orange: 'text-orange-700' };
  const nightText: Record<string, string> = { purple: 'text-purple-400', sky: 'text-sky-400', cyan: 'text-cyan-400', orange: 'text-orange-400' };
  
  return (
    <div className={`p-4 text-center rounded-lg border-4 shadow-lg ${isDay ? dayBg[color] : nightBg[color]}`}>
      <div className="text-3xl mb-2">{icon}</div>
      <p className={`text-2xl font-bold ${isDay ? dayText[color] : nightText[color]}`} style={{ fontFamily: "'VT323', monospace" }}>{value}</p>
      <p className={`text-sm ${isDay ? 'text-gray-600' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace" }}>{label}</p>
    </div>
  );
}

function MonitoringLink({ icon, title, href, disabled, isDay }: { icon: string; title: string; href?: string; disabled: boolean; isDay: boolean }) {
  const Comp = disabled || !href ? 'div' : 'a';
  return (
    <Comp {...(!disabled && href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {})} className={`flex items-center gap-4 p-3 rounded-lg border-2 transition-colors ${
      disabled ? (isDay ? 'bg-gray-100 border-gray-300 opacity-50' : 'bg-slate-700 border-slate-600 opacity-50') : (isDay ? 'bg-sky-50 border-sky-300 hover:bg-sky-100 cursor-pointer' : 'bg-sky-900/30 border-sky-700 hover:bg-sky-900/50 cursor-pointer')
    }`}>
      <span className="text-2xl">{icon}</span>
      <span className={`flex-1 font-bold ${isDay ? 'text-gray-800' : 'text-white'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>{title}</span>
      {!disabled && <span className={isDay ? 'text-sky-500' : 'text-sky-400'}>→</span>}
    </Comp>
  );
}

// Azure Infrastructure Terminal Panel - Command block style
function AzureInfrastructurePanel({ logs }: { logs: InfrastructureLogsResponse | null }) {
  if (!logs) {
    return (
      <div className="mc-terminal rounded-lg">
        <p className="text-gray-500 text-center py-8" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
          Loading Azure infrastructure data...
        </p>
      </div>
    );
  }

  return (
    <div className="mc-terminal rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
        <span className="text-green-400 font-bold text-lg" style={{ fontFamily: "'VT323', monospace" }}>
          AZURE INFRASTRUCTURE
        </span>
        <span className="text-gray-500 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
          {new Date(logs.timestamp).toLocaleString()}
        </span>
      </div>

      {/* Resource Groups */}
      <div className="mb-6">
        <p className="text-blue-400 font-bold mb-3" style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}>
          === Resource Groups ===
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: "'VT323', monospace" }}>
            <thead>
              <tr className="text-gray-500">
                <td className="pr-4 pb-2">Name</td>
                <td className="pr-4 pb-2">Location</td>
                <td className="pr-4 pb-2">State</td>
                <td className="pb-2">Purpose</td>
              </tr>
            </thead>
            <tbody>
              {logs.resourceGroups.map((rg, i) => (
                <tr key={i}>
                  <td className="pr-4 py-1 text-white">{rg.name}</td>
                  <td className="pr-4 py-1 text-gray-400">{rg.location}</td>
                  <td className={`pr-4 py-1 ${rg.state === 'Succeeded' ? 'text-green-400' : 'text-red-400'}`}>
                    {rg.state}
                  </td>
                  <td className="py-1 text-gray-500">{rg.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AKS Cluster */}
      <div className="mb-6">
        <p className="text-blue-400 font-bold mb-3" style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}>
          === AKS Cluster ===
        </p>
        {logs.aksCluster ? (
          <table className="text-sm" style={{ fontFamily: "'VT323', monospace" }}>
            <tbody>
              <tr>
                <td className="pr-6 py-1 text-gray-500">Name:</td>
                <td className="py-1 text-white">{logs.aksCluster.name}</td>
              </tr>
              <tr>
                <td className="pr-6 py-1 text-gray-500">Kubernetes:</td>
                <td className="py-1 text-white">v{logs.aksCluster.kubernetesVersion}</td>
              </tr>
              <tr>
                <td className="pr-6 py-1 text-gray-500">Nodes:</td>
                <td className="py-1 text-white">{logs.aksCluster.nodeCount}</td>
              </tr>
              <tr>
                <td className="pr-6 py-1 text-gray-500">State:</td>
                <td className="py-1 text-green-400">{logs.aksCluster.state}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500" style={{ fontFamily: "'VT323', monospace" }}>No AKS cluster deployed</p>
        )}
      </div>

      {/* Recent Operations */}
      <div className="mb-6">
        <p className="text-blue-400 font-bold mb-3" style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}>
          === Recent Activity ===
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: "'VT323', monospace" }}>
            <thead>
              <tr className="text-gray-500">
                <td className="pr-4 pb-2">Time</td>
                <td className="pr-4 pb-2">Operation</td>
                <td className="pb-2">Status</td>
              </tr>
            </thead>
            <tbody>
              {logs.recentOperations.slice(0, 12).map((op, i) => (
                <tr key={i}>
                  <td className="pr-4 py-1 text-gray-500">
                    {op.time ? new Date(op.time).toLocaleTimeString() : '--'}
                  </td>
                  <td className="pr-4 py-1 text-white">{op.operation}</td>
                  <td className={`py-1 ${
                    op.status === 'Succeeded' || op.status === 'success' ? 'text-green-400' :
                    op.status === 'Failed' || op.status === 'failure' ? 'text-red-400' :
                    op.status === 'Running' || op.status === 'in_progress' ? 'text-yellow-400 animate-pulse' :
                    'text-gray-500'
                  }`}>
                    {op.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workflow History */}
      {logs.activityLog.length > 0 && (
        <div className="mb-4">
          <p className="text-blue-400 font-bold mb-3" style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}>
            === Workflow History ===
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "'VT323', monospace" }}>
              <thead>
                <tr className="text-gray-500">
                  <td className="pr-4 pb-2">Time</td>
                  <td className="pr-4 pb-2">Workflow</td>
                  <td className="pr-4 pb-2">Status</td>
                  <td className="pb-2">Trigger</td>
                </tr>
              </thead>
              <tbody>
                {logs.activityLog.slice(0, 8).map((entry, i) => (
                  <tr key={i}>
                    <td className="pr-4 py-1 text-gray-500">
                      {new Date(entry.time).toLocaleDateString()}
                    </td>
                    <td className="pr-4 py-1 text-white">{entry.operation}</td>
                    <td className={`pr-4 py-1 ${
                      entry.status === 'Succeeded' ? 'text-green-400' :
                      entry.status === 'Failed' ? 'text-red-400' :
                      entry.status === 'Running' ? 'text-yellow-400 animate-pulse' :
                      'text-gray-400'
                    }`}>
                      {entry.status}
                    </td>
                    <td className="py-1 text-gray-500 truncate max-w-[200px]">{entry.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Link to GitHub Actions */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <a
          href={logs.workflowUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 transition-colors"
          style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}
        >
          View full logs on GitHub Actions →
        </a>
      </div>
    </div>
  );
}

// Workflow Progress Panel - Stone block style
function WorkflowProgressPanel({ jobs, runUrl }: { jobs: WorkflowJob[]; runUrl: string }) {
  if (jobs.length === 0) {
    return (
      <div className="mc-panel-stone p-4 mt-6 rounded">
        <p className="text-gray-300 text-center" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
          Waiting for workflow to start...
        </p>
      </div>
    );
  }

  return (
    <div className="mc-panel-stone p-4 mt-6 rounded">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-200 text-shadow-mc-light" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}>
          ⚙️ WORKFLOW PROGRESS
        </h3>
        <a 
          href={runUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-300 hover:text-blue-200 text-xs underline"
          style={{ fontFamily: "'VT323', monospace" }}
        >
          View in GitHub →
        </a>
      </div>
      
      {jobs.map((job) => (
        <div key={job.name} className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">
              {job.status === 'completed' 
                ? (job.conclusion === 'success' ? '✅' : '❌')
                : job.status === 'in_progress' ? '⏳' : '⏸️'
              }
            </span>
            <span className="text-gray-200 font-bold" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
              {job.name}
            </span>
          </div>
          <div className="ml-7 space-y-1">
            {job.steps?.slice(0, 10).map((step, i) => (
              <WorkflowStepIndicator key={i} step={step} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkflowStepIndicator({ step }: { step: WorkflowStep }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-2 h-2 rounded-full ${
        step.status === 'completed'
          ? (step.conclusion === 'success' ? 'bg-green-500' : step.conclusion === 'skipped' ? 'bg-gray-400' : 'bg-red-500')
          : step.status === 'in_progress' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500'
      }`} />
      <span className={`${
        step.status === 'completed' && step.conclusion === 'success' ? 'text-green-300' :
        step.status === 'completed' && step.conclusion === 'failure' ? 'text-red-300' :
        step.status === 'completed' && step.conclusion === 'skipped' ? 'text-gray-400' :
        step.status === 'in_progress' ? 'text-yellow-300 font-bold' : 
        'text-gray-400'
      }`} style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}>
        {step.name}
      </span>
    </div>
  );
}

// Cluster Monitoring Panel - Shows real metrics from Kubernetes and Prometheus
function ClusterMonitoringPanel({ 
  monitoring, 
  isDay, 
  selectedNamespace 
}: { 
  monitoring: MonitoringResponse | null; 
  isDay: boolean;
  selectedNamespace: string;
}) {
  if (!monitoring || !monitoring.available) {
    return (
      <div className={`p-6 rounded-lg border-4 shadow-xl ${isDay ? 'bg-white/90 border-sky-400' : 'bg-slate-800/90 border-sky-700'}`}>
        <p className={`text-center py-8 ${isDay ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
          {monitoring?.message || 'Loading monitoring data...'}
        </p>
      </div>
    );
  }

  const { kubernetes, prometheus, minecraft } = monitoring;
  
  // Filter pods by namespace
  const filteredPods = kubernetes?.pods.details.filter(
    p => selectedNamespace === 'all' || p.namespace === selectedNamespace
  ) || [];

  return (
    <div className="space-y-4">
      {/* Resource Usage Overview */}
      <div className={`p-6 rounded-lg border-4 shadow-xl ${isDay ? 'bg-white/90 border-emerald-400' : 'bg-slate-800/90 border-emerald-700'}`}>
        <h3 className={`mb-4 font-bold ${isDay ? 'text-emerald-800' : 'text-emerald-400'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
          📈 RESOURCE USAGE
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* CPU Usage */}
          <div className={`p-4 rounded-lg border-2 ${isDay ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/30 border-blue-700'}`}>
            <p className={`text-sm ${isDay ? 'text-blue-600' : 'text-blue-400'}`} style={{ fontFamily: "'VT323', monospace" }}>CPU Usage</p>
            <p className={`text-3xl font-bold ${isDay ? 'text-blue-800' : 'text-blue-300'}`} style={{ fontFamily: "'VT323', monospace" }}>
              {prometheus?.metrics?.cpu.usage ? `${Math.round(prometheus.metrics.cpu.usage)}m` : '-'}
            </p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all" 
                style={{ width: `${Math.min((prometheus?.metrics?.cpu.usage || 0) / 4000 * 100, 100)}%` }}
              />
            </div>
          </div>
          
          {/* Memory Usage */}
          <div className={`p-4 rounded-lg border-2 ${isDay ? 'bg-purple-50 border-purple-200' : 'bg-purple-900/30 border-purple-700'}`}>
            <p className={`text-sm ${isDay ? 'text-purple-600' : 'text-purple-400'}`} style={{ fontFamily: "'VT323', monospace" }}>Memory Usage</p>
            <p className={`text-3xl font-bold ${isDay ? 'text-purple-800' : 'text-purple-300'}`} style={{ fontFamily: "'VT323', monospace" }}>
              {prometheus?.metrics?.memory.usage ? `${Math.round(prometheus.metrics.memory.usage)}MB` : '-'}
            </p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 transition-all" 
                style={{ width: `${Math.min((prometheus?.metrics?.memory.usage || 0) / 8000 * 100, 100)}%` }}
              />
            </div>
          </div>
          
          {/* Network */}
          <div className={`p-4 rounded-lg border-2 ${isDay ? 'bg-cyan-50 border-cyan-200' : 'bg-cyan-900/30 border-cyan-700'}`}>
            <p className={`text-sm ${isDay ? 'text-cyan-600' : 'text-cyan-400'}`} style={{ fontFamily: "'VT323', monospace" }}>Network I/O</p>
            <p className={`text-xl font-bold ${isDay ? 'text-cyan-800' : 'text-cyan-300'}`} style={{ fontFamily: "'VT323', monospace" }}>
              ↓{formatBytes(prometheus?.metrics?.network.receiveBytesPerSec || 0)}/s
            </p>
            <p className={`text-lg ${isDay ? 'text-cyan-700' : 'text-cyan-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
              ↑{formatBytes(prometheus?.metrics?.network.transmitBytesPerSec || 0)}/s
            </p>
          </div>
          
          {/* Storage */}
          <div className={`p-4 rounded-lg border-2 ${isDay ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/30 border-amber-700'}`}>
            <p className={`text-sm ${isDay ? 'text-amber-600' : 'text-amber-400'}`} style={{ fontFamily: "'VT323', monospace" }}>Storage</p>
            <p className={`text-3xl font-bold ${isDay ? 'text-amber-800' : 'text-amber-300'}`} style={{ fontFamily: "'VT323', monospace" }}>
              {prometheus?.metrics?.storage.percentage || 0}%
            </p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 transition-all" 
                style={{ width: `${prometheus?.metrics?.storage.percentage || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Prometheus availability indicator */}
        <div className="flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full ${prometheus?.available ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className={isDay ? 'text-gray-600' : 'text-gray-400'} style={{ fontFamily: "'VT323', monospace" }}>
            Prometheus: {prometheus?.available ? 'Connected' : 'Using kubectl metrics'}
          </span>
        </div>
      </div>

      {/* Nodes Panel */}
      {kubernetes?.nodes && kubernetes.nodes.details.length > 0 && (
        <div className={`p-6 rounded-lg border-4 shadow-xl ${isDay ? 'bg-white/90 border-orange-400' : 'bg-slate-800/90 border-orange-700'}`}>
          <h3 className={`mb-4 font-bold ${isDay ? 'text-orange-800' : 'text-orange-400'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
            🖥️ NODES ({kubernetes.nodes.ready}/{kubernetes.nodes.total} Ready)
          </h3>
          
          <div className="grid gap-3">
            {kubernetes.nodes.details.map((node) => (
              <NodeCard key={node.name} node={node} isDay={isDay} />
            ))}
          </div>
        </div>
      )}

      {/* Pods Panel */}
      {kubernetes?.pods && (
        <div className={`p-6 rounded-lg border-4 shadow-xl ${isDay ? 'bg-white/90 border-sky-400' : 'bg-slate-800/90 border-sky-700'}`}>
          <h3 className={`mb-4 font-bold ${isDay ? 'text-sky-800' : 'text-sky-400'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
            📦 PODS ({kubernetes.pods.running}/{kubernetes.pods.total} Running)
            {kubernetes.pods.pending > 0 && <span className="text-yellow-500 ml-2">• {kubernetes.pods.pending} Pending</span>}
            {kubernetes.pods.failed > 0 && <span className="text-red-500 ml-2">• {kubernetes.pods.failed} Failed</span>}
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "'VT323', monospace" }}>
              <thead>
                <tr className={`${isDay ? 'text-gray-600 border-b border-gray-200' : 'text-gray-400 border-b border-gray-700'}`}>
                  <th className="text-left py-2 pr-4">Pod</th>
                  <th className="text-left py-2 pr-4">Namespace</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-left py-2 pr-4">Ready</th>
                  <th className="text-left py-2 pr-4">Restarts</th>
                  <th className="text-left py-2 pr-4">CPU</th>
                  <th className="text-left py-2 pr-4">Memory</th>
                  <th className="text-left py-2">Age</th>
                </tr>
              </thead>
              <tbody>
                {filteredPods.slice(0, 20).map((pod) => (
                  <PodRow key={`${pod.namespace}/${pod.name}`} pod={pod} isDay={isDay} />
                ))}
              </tbody>
            </table>
            {filteredPods.length > 20 && (
              <p className={`mt-2 text-center ${isDay ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
                ...and {filteredPods.length - 20} more pods
              </p>
            )}
          </div>
        </div>
      )}

      {/* Minecraft Metrics (if available) */}
      {minecraft && (
        <div className={`p-6 rounded-lg border-4 shadow-xl ${isDay ? 'bg-white/90 border-green-400' : 'bg-slate-800/90 border-green-700'}`}>
          <h3 className={`mb-4 font-bold ${isDay ? 'text-green-800' : 'text-green-400'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
            🎮 MINECRAFT SERVER
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-3 rounded border-2 text-center ${isDay ? 'bg-green-50 border-green-200' : 'bg-green-900/30 border-green-700'}`}>
              <p className={`text-sm ${isDay ? 'text-green-600' : 'text-green-400'}`} style={{ fontFamily: "'VT323', monospace" }}>Players</p>
              <p className={`text-2xl font-bold ${isDay ? 'text-green-800' : 'text-green-300'}`} style={{ fontFamily: "'VT323', monospace" }}>
                {minecraft.playersOnline}/{minecraft.maxPlayers}
              </p>
            </div>
            <div className={`p-3 rounded border-2 text-center ${isDay ? 'bg-green-50 border-green-200' : 'bg-green-900/30 border-green-700'}`}>
              <p className={`text-sm ${isDay ? 'text-green-600' : 'text-green-400'}`} style={{ fontFamily: "'VT323', monospace" }}>TPS</p>
              <p className={`text-2xl font-bold ${minecraft.tps >= 19 ? (isDay ? 'text-green-800' : 'text-green-300') : 'text-yellow-500'}`} style={{ fontFamily: "'VT323', monospace" }}>
                {minecraft.tps.toFixed(1)}
              </p>
            </div>
            <div className={`p-3 rounded border-2 text-center ${isDay ? 'bg-green-50 border-green-200' : 'bg-green-900/30 border-green-700'}`}>
              <p className={`text-sm ${isDay ? 'text-green-600' : 'text-green-400'}`} style={{ fontFamily: "'VT323', monospace" }}>World Size</p>
              <p className={`text-2xl font-bold ${isDay ? 'text-green-800' : 'text-green-300'}`} style={{ fontFamily: "'VT323', monospace" }}>
                {minecraft.worldSize}MB
              </p>
            </div>
            <div className={`p-3 rounded border-2 text-center ${isDay ? 'bg-green-50 border-green-200' : 'bg-green-900/30 border-green-700'}`}>
              <p className={`text-sm ${isDay ? 'text-green-600' : 'text-green-400'}`} style={{ fontFamily: "'VT323', monospace" }}>JVM Memory</p>
              <p className={`text-2xl font-bold ${isDay ? 'text-green-800' : 'text-green-300'}`} style={{ fontFamily: "'VT323', monospace" }}>
                {minecraft.memoryUsed}/{minecraft.memoryMax}MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {prometheus?.alerts && prometheus.alerts.length > 0 && (
        <div className={`p-6 rounded-lg border-4 shadow-xl ${isDay ? 'bg-red-50 border-red-400' : 'bg-red-900/30 border-red-700'}`}>
          <h3 className={`mb-4 font-bold text-red-500`} style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
            🚨 ALERTS ({prometheus.alerts.length})
          </h3>
          
          <div className="space-y-2">
            {prometheus.alerts.map((alert, i) => (
              <div key={i} className={`p-3 rounded border-2 ${
                alert.severity === 'critical' 
                  ? 'bg-red-100 border-red-300' 
                  : 'bg-yellow-100 border-yellow-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800" style={{ fontFamily: "'VT323', monospace" }}>
                    {alert.name}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    alert.severity === 'critical' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mt-1" style={{ fontFamily: "'VT323', monospace" }}>
                  {alert.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Node card component
function NodeCard({ node, isDay }: { node: NodeInfo; isDay: boolean }) {
  const isReady = node.status === 'Ready';
  
  return (
    <div className={`p-4 rounded-lg border-2 ${
      isReady 
        ? (isDay ? 'bg-green-50 border-green-200' : 'bg-green-900/20 border-green-700')
        : (isDay ? 'bg-red-50 border-red-200' : 'bg-red-900/20 border-red-700')
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${isReady ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={`font-bold ${isDay ? 'text-gray-800' : 'text-white'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}>
            {node.name}
          </span>
          <span className={`text-xs px-2 py-1 rounded ${isDay ? 'bg-gray-200 text-gray-700' : 'bg-gray-700 text-gray-300'}`}>
            {node.roles}
          </span>
        </div>
        <span className={`text-sm ${isDay ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
          {node.version}
        </span>
      </div>
      
      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <p className={isDay ? 'text-gray-500' : 'text-gray-400'} style={{ fontFamily: "'VT323', monospace" }}>CPU</p>
          <p className={isDay ? 'text-gray-800' : 'text-gray-200'} style={{ fontFamily: "'VT323', monospace" }}>
            {node.cpu.used || '-'} / {node.cpu.allocatable}
            {node.cpu.percentage !== undefined && <span className="text-gray-500"> ({node.cpu.percentage}%)</span>}
          </p>
        </div>
        <div>
          <p className={isDay ? 'text-gray-500' : 'text-gray-400'} style={{ fontFamily: "'VT323', monospace" }}>Memory</p>
          <p className={isDay ? 'text-gray-800' : 'text-gray-200'} style={{ fontFamily: "'VT323', monospace" }}>
            {node.memory.used || '-'} / {node.memory.allocatable}
            {node.memory.percentage !== undefined && <span className="text-gray-500"> ({node.memory.percentage}%)</span>}
          </p>
        </div>
        <div>
          <p className={isDay ? 'text-gray-500' : 'text-gray-400'} style={{ fontFamily: "'VT323', monospace" }}>Pods</p>
          <p className={isDay ? 'text-gray-800' : 'text-gray-200'} style={{ fontFamily: "'VT323', monospace" }}>
            {node.pods.running} / {node.pods.capacity}
          </p>
        </div>
        <div>
          <p className={isDay ? 'text-gray-500' : 'text-gray-400'} style={{ fontFamily: "'VT323', monospace" }}>Age</p>
          <p className={isDay ? 'text-gray-800' : 'text-gray-200'} style={{ fontFamily: "'VT323', monospace" }}>
            {node.age}
          </p>
        </div>
      </div>
    </div>
  );
}

// Pod row component for table
function PodRow({ pod, isDay }: { pod: PodInfo; isDay: boolean }) {
  const statusColor = {
    Running: 'text-green-500',
    Pending: 'text-yellow-500',
    Failed: 'text-red-500',
    Succeeded: 'text-blue-500',
    Unknown: 'text-gray-500',
  }[pod.status] || 'text-gray-500';

  return (
    <tr className={`${isDay ? 'border-b border-gray-100' : 'border-b border-gray-800'}`}>
      <td className={`py-2 pr-4 ${isDay ? 'text-gray-800' : 'text-gray-200'}`}>
        <span className="truncate max-w-[200px] inline-block" title={pod.name}>
          {pod.name.length > 30 ? pod.name.substring(0, 27) + '...' : pod.name}
        </span>
      </td>
      <td className={`py-2 pr-4 ${isDay ? 'text-gray-600' : 'text-gray-400'}`}>
        <span className={`text-xs px-2 py-1 rounded ${isDay ? 'bg-gray-100' : 'bg-gray-700'}`}>
          {pod.namespace}
        </span>
      </td>
      <td className={`py-2 pr-4 ${statusColor}`}>
        {pod.status}
      </td>
      <td className={`py-2 pr-4 ${isDay ? 'text-gray-700' : 'text-gray-300'}`}>
        {pod.ready}
      </td>
      <td className={`py-2 pr-4 ${pod.restarts > 0 ? 'text-yellow-500' : (isDay ? 'text-gray-700' : 'text-gray-300')}`}>
        {pod.restarts}
      </td>
      <td className={`py-2 pr-4 ${isDay ? 'text-gray-700' : 'text-gray-300'}`}>
        {pod.cpu || '-'}
      </td>
      <td className={`py-2 pr-4 ${isDay ? 'text-gray-700' : 'text-gray-300'}`}>
        {pod.memory || '-'}
      </td>
      <td className={`py-2 ${isDay ? 'text-gray-700' : 'text-gray-300'}`}>
        {pod.age}
      </td>
    </tr>
  );
}

// Helper to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
}

// Cost Dashboard - Shows real Azure cost data
function CostDashboard({ costs, isDay }: { costs: InfrastructureCostResponse | null; isDay: boolean }) {
  if (!costs) {
    return (
      <div className={`p-6 rounded-lg border-4 shadow-xl ${isDay ? 'bg-white/90 border-yellow-400' : 'bg-slate-800/90 border-yellow-700'}`}>
        <p className={`text-center py-8 ${isDay ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
          Loading cost data...
        </p>
      </div>
    );
  }

  // Calculate max cost for chart scaling
  const maxCost = Math.max(...costs.dailyTrend.map(d => d.cost), 1);

  return (
    <div className="space-y-4">
      {/* Cost data source indicator */}
      {!costs.available && (
        <div className={`p-3 rounded-lg border-2 ${isDay ? 'bg-amber-50 border-amber-300' : 'bg-amber-900/30 border-amber-700'}`}>
          <p className={`text-sm ${isDay ? 'text-amber-700' : 'text-amber-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
            ⚠️ {costs.error || 'Showing estimated costs. Configure AZURE_SUBSCRIPTION_ID for real data.'}
          </p>
        </div>
      )}

      {/* Main cost cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today */}
        <div className={`p-4 rounded-lg border-4 shadow-lg ${isDay ? 'bg-white/90 border-green-400' : 'bg-slate-800/90 border-green-700'}`}>
          <p className={`text-sm ${isDay ? 'text-green-600' : 'text-green-400'}`} style={{ fontFamily: "'VT323', monospace" }}>Today</p>
          <p className={`text-2xl font-bold ${isDay ? 'text-green-800' : 'text-green-300'}`} style={{ fontFamily: "'VT323', monospace" }}>
            {costs.today.cost}
          </p>
          <p className={`text-xs ${isDay ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
            vs {costs.yesterday.cost} yesterday
          </p>
        </div>

        {/* This Month */}
        <div className={`p-4 rounded-lg border-4 shadow-lg ${isDay ? 'bg-white/90 border-blue-400' : 'bg-slate-800/90 border-blue-700'}`}>
          <p className={`text-sm ${isDay ? 'text-blue-600' : 'text-blue-400'}`} style={{ fontFamily: "'VT323', monospace" }}>This Month</p>
          <p className={`text-2xl font-bold ${isDay ? 'text-blue-800' : 'text-blue-300'}`} style={{ fontFamily: "'VT323', monospace" }}>
            {costs.thisMonth.cost}
          </p>
          <p className={`text-xs ${isDay ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
            Since {costs.thisMonth.startDate}
          </p>
        </div>

        {/* Forecast */}
        <div className={`p-4 rounded-lg border-4 shadow-lg ${isDay ? 'bg-white/90 border-purple-400' : 'bg-slate-800/90 border-purple-700'}`}>
          <p className={`text-sm ${isDay ? 'text-purple-600' : 'text-purple-400'}`} style={{ fontFamily: "'VT323', monospace" }}>Month Forecast</p>
          <p className={`text-2xl font-bold ${isDay ? 'text-purple-800' : 'text-purple-300'}`} style={{ fontFamily: "'VT323', monospace" }}>
            {costs.thisMonth.forecast}
          </p>
          <p className={`text-xs ${isDay ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
            Projected end of month
          </p>
        </div>

        {/* Last Month */}
        <div className={`p-4 rounded-lg border-4 shadow-lg ${isDay ? 'bg-white/90 border-gray-400' : 'bg-slate-800/90 border-gray-600'}`}>
          <p className={`text-sm ${isDay ? 'text-gray-600' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace" }}>Last Month</p>
          <p className={`text-2xl font-bold ${isDay ? 'text-gray-800' : 'text-gray-300'}`} style={{ fontFamily: "'VT323', monospace" }}>
            {costs.lastMonth.cost}
          </p>
          <p className={`text-xs ${isDay ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
            {costs.lastMonth.startDate} - {costs.lastMonth.endDate}
          </p>
        </div>
      </div>

      {/* Cost trend chart and breakdowns */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Daily Cost Trend */}
        <div className={`p-4 rounded-lg border-4 shadow-lg ${isDay ? 'bg-white/90 border-yellow-400' : 'bg-slate-800/90 border-yellow-700'}`}>
          <h4 className={`mb-3 font-bold ${isDay ? 'text-yellow-800' : 'text-yellow-400'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}>
            📈 DAILY COST TREND (14 Days)
          </h4>
          <div className="h-32 flex items-end gap-1">
            {costs.dailyTrend.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div 
                  className={`w-full rounded-t transition-all ${isDay ? 'bg-yellow-500' : 'bg-yellow-600'}`}
                  style={{ height: `${(day.cost / maxCost) * 100}%`, minHeight: '4px' }}
                  title={`${day.date}: $${day.cost.toFixed(2)}`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className={`text-xs ${isDay ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
              {costs.dailyTrend[0]?.date}
            </span>
            <span className={`text-xs ${isDay ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
              {costs.dailyTrend[costs.dailyTrend.length - 1]?.date}
            </span>
          </div>
          <p className={`text-center text-xs mt-1 ${isDay ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
            Avg: ${(costs.dailyTrend.reduce((sum, d) => sum + d.cost, 0) / costs.dailyTrend.length).toFixed(2)}/day
          </p>
        </div>

        {/* Service Breakdown */}
        <div className={`p-4 rounded-lg border-4 shadow-lg ${isDay ? 'bg-white/90 border-orange-400' : 'bg-slate-800/90 border-orange-700'}`}>
          <h4 className={`mb-3 font-bold ${isDay ? 'text-orange-800' : 'text-orange-400'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}>
            📊 COST BY SERVICE
          </h4>
          <div className="space-y-2">
            {costs.breakdown.byService.slice(0, 6).map((service, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={`truncate ${isDay ? 'text-gray-700' : 'text-gray-300'}`} style={{ fontFamily: "'VT323', monospace" }}>
                    {service.service}
                  </span>
                  <span className={`${isDay ? 'text-gray-800' : 'text-gray-200'}`} style={{ fontFamily: "'VT323', monospace" }}>
                    {service.cost}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${isDay ? 'bg-orange-500' : 'bg-orange-600'}`}
                    style={{ width: `${service.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resource Group Breakdown */}
      <div className={`p-4 rounded-lg border-4 shadow-lg ${isDay ? 'bg-white/90 border-cyan-400' : 'bg-slate-800/90 border-cyan-700'}`}>
        <h4 className={`mb-3 font-bold ${isDay ? 'text-cyan-800' : 'text-cyan-400'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}>
          📁 COST BY RESOURCE GROUP
        </h4>
        <div className="grid md:grid-cols-3 gap-4">
          {costs.breakdown.byResourceGroup.map((rg, i) => (
            <div key={i} className={`p-3 rounded-lg border-2 ${isDay ? 'bg-cyan-50 border-cyan-200' : 'bg-cyan-900/30 border-cyan-700'}`}>
              <p className={`text-xs truncate ${isDay ? 'text-cyan-600' : 'text-cyan-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
                {rg.resourceGroup}
              </p>
              <p className={`text-xl font-bold ${isDay ? 'text-cyan-800' : 'text-cyan-300'}`} style={{ fontFamily: "'VT323', monospace" }}>
                {rg.cost}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${isDay ? 'bg-cyan-500' : 'bg-cyan-600'}`}
                    style={{ width: `${rg.percentage}%` }}
                  />
                </div>
                <span className={`text-xs ${isDay ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
                  {rg.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Last updated */}
      <div className="flex justify-between items-center text-sm">
        <span className={`flex items-center gap-2 ${isDay ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
          <span className={`w-2 h-2 rounded-full ${costs.available ? 'bg-green-500' : 'bg-yellow-500'}`} />
          {costs.available ? 'Live data from Azure Cost Management' : 'Estimated costs'}
        </span>
        <span className={isDay ? 'text-gray-500' : 'text-gray-400'} style={{ fontFamily: "'VT323', monospace" }}>
          Updated: {new Date(costs.lastUpdated).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// Transition Progress Panel - Shows deploy/destroy progress
function TransitionProgressPanel({ transition }: { transition: InfrastructureTransition }) {
  const isDeploying = transition.action === 'deploying';
  const elapsed = transition.startedAt 
    ? Math.floor((Date.now() - new Date(transition.startedAt).getTime()) / 1000)
    : 0;
  const elapsedMinutes = Math.floor(elapsed / 60);
  const elapsedSeconds = elapsed % 60;
  
  // Estimate steps based on action
  const steps = isDeploying 
    ? [
        { name: 'Checkout code', threshold: 5 },
        { name: 'Azure login', threshold: 10 },
        { name: 'Setup Terraform', threshold: 15 },
        { name: 'Terraform init', threshold: 25 },
        { name: 'Terraform plan', threshold: 35 },
        { name: 'Create AKS cluster', threshold: 60 },
        { name: 'Deploy ingress', threshold: 70 },
        { name: 'Deploy cert-manager', threshold: 75 },
        { name: 'Deploy monitoring', threshold: 85 },
        { name: 'Deploy Minecraft', threshold: 90 },
        { name: 'Health checks', threshold: 95 },
      ]
    : [
        { name: 'Checkout code', threshold: 5 },
        { name: 'Azure login', threshold: 10 },
        { name: 'Setup Terraform', threshold: 15 },
        { name: 'Terraform init', threshold: 25 },
        { name: 'Terraform plan', threshold: 35 },
        { name: 'Delete Kubernetes resources', threshold: 50 },
        { name: 'Delete AKS cluster', threshold: 75 },
        { name: 'Delete networking', threshold: 85 },
        { name: 'Cleanup', threshold: 95 },
      ];

  return (
    <div className={`mb-6 p-4 rounded-lg border-2 ${
      isDeploying 
        ? 'bg-green-900/30 border-green-600' 
        : 'bg-red-900/30 border-red-600'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className={`font-bold ${isDeploying ? 'text-green-400' : 'text-red-400'}`} 
            style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
          {isDeploying ? '🚀 DEPLOYING INFRASTRUCTURE' : '🔥 DESTROYING INFRASTRUCTURE'}
        </h4>
        <span className="text-gray-300" style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}>
          {elapsedMinutes}:{elapsedSeconds.toString().padStart(2, '0')} elapsed
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400" style={{ fontFamily: "'VT323', monospace" }}>Progress</span>
          <span className={isDeploying ? 'text-green-400' : 'text-red-400'} style={{ fontFamily: "'VT323', monospace" }}>
            {transition.progress}%
          </span>
        </div>
        <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${
              isDeploying 
                ? 'bg-gradient-to-r from-green-600 to-green-400' 
                : 'bg-gradient-to-r from-red-600 to-red-400'
            }`}
            style={{ width: `${transition.progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1" style={{ fontFamily: "'VT323', monospace" }}>
          <span>0%</span>
          <span>~{transition.estimatedMinutes} min total</span>
          <span>100%</span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-1">
        {steps.map((step, i) => {
          const isComplete = transition.progress >= step.threshold;
          const isCurrent = transition.progress >= (steps[i - 1]?.threshold || 0) && 
                           transition.progress < step.threshold;
          
          return (
            <div key={step.name} className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${
                isComplete ? (isDeploying ? 'bg-green-500' : 'bg-red-500') :
                isCurrent ? 'bg-yellow-500 animate-pulse' : 'bg-gray-600'
              }`} />
              <span className={`${
                isComplete ? (isDeploying ? 'text-green-400' : 'text-red-400') :
                isCurrent ? 'text-yellow-400 font-bold' : 'text-gray-500'
              }`} style={{ fontFamily: "'VT323', monospace" }}>
                {step.name}
              </span>
              {isCurrent && (
                <span className="ml-auto text-yellow-400 animate-pulse" style={{ fontFamily: "'VT323', monospace" }}>
                  ⏳ In progress...
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Link to GitHub */}
      {transition.runUrl && (
        <div className="mt-4 pt-3 border-t border-gray-600">
          <a 
            href={transition.runUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`text-sm hover:underline ${isDeploying ? 'text-green-400' : 'text-red-400'}`}
            style={{ fontFamily: "'VT323', monospace" }}
          >
            View live workflow logs on GitHub Actions →
          </a>
        </div>
      )}
    </div>
  );
}
