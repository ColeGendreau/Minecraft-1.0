'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  getInfrastructureStatus, 
  getInfrastructureCost,
  getInfrastructureLogs,
  toggleInfrastructure,
  getLatestWorkflow,
  nukeAllAssets,
  getAssets,
  checkHealth,
  type InfrastructureStatusResponse,
  type InfrastructureCostResponse,
  type InfrastructureLogsResponse,
  type LatestWorkflowResponse,
  type Asset
} from '@/lib/api';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [infraStatus, setInfraStatus] = useState<InfrastructureStatusResponse | null>(null);
  const [infraCost, setInfraCost] = useState<InfrastructureCostResponse | null>(null);
  const [infraLogs, setInfraLogs] = useState<InfrastructureLogsResponse | null>(null);
  const [workflow, setWorkflow] = useState<LatestWorkflowResponse | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [apiOnline, setApiOnline] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showNukeConfirm, setShowNukeConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      await checkHealth();
      setApiOnline(true);
      
      const [statusData, costData, logsData, workflowData, assetsData] = await Promise.all([
        getInfrastructureStatus().catch(() => null),
        getInfrastructureCost().catch(() => null),
        getInfrastructureLogs().catch(() => null),
        getLatestWorkflow().catch(() => null),
        getAssets().catch(() => ({ assets: [] }))
      ]);
      
      setInfraStatus(statusData);
      setInfraCost(costData);
      setInfraLogs(logsData);
      setWorkflow(workflowData);
      setAssets(assetsData.assets);
    } catch {
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

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
    <main className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800">
      {/* Nuke Confirmation Modal */}
      {showNukeConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="mc-panel-stone p-8 max-w-md">
            <div className="text-center">
              <div className="text-6xl mb-4">☢️</div>
              <h2 
                className="text-xl text-red-500 mb-4"
                style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}
              >
                NUKE ALL ASSETS?
              </h2>
              <p className="text-gray-300 mb-6" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                This will DELETE all {assets.length} assets from the Minecraft world. 
                The area will be cleared and reset.
              </p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => setShowNukeConfirm(false)} className="mc-button-stone">
                  CANCEL
                </button>
                <button onClick={handleNuke} className="mc-button-stone !bg-red-700 !border-red-900">
                  ☢️ CONFIRM NUKE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-stone-900/80 border-b border-stone-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                ← Back
              </Link>
              <div>
                <h1 
                  className="text-xl text-white"
                  style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}
                >
                  ⚙️ ADMIN PANEL
                </h1>
                <p className="text-gray-500 mt-1" style={{ fontFamily: "'VT323', monospace" }}>
                  Infrastructure, monitoring, and server management
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1 rounded ${apiOnline ? 'bg-emerald-900/50' : 'bg-red-900/50'}`}>
                <div className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-400' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-300" style={{ fontFamily: "'VT323', monospace" }}>
                  API {apiOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">⛏️</div>
            <p className="text-gray-400" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
              Loading admin data...
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Server Control Panel */}
            <section>
              <SectionHeader icon="🎮" title="SERVER CONTROL" />
              <div className="mc-panel-stone p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${isRunning ? 'bg-emerald-900/50' : 'bg-red-900/50'}`}>
                      <span className="text-3xl">{isRunning ? '⚡' : '💤'}</span>
                    </div>
                    <div>
                      <h3 
                        className={`text-lg ${isRunning ? 'text-emerald-400' : 'text-red-400'}`}
                        style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '12px' }}
                      >
                        {isRunning ? 'SERVER ONLINE' : 'SERVER OFFLINE'}
                      </h3>
                      <p className="text-gray-400 mt-1" style={{ fontFamily: "'VT323', monospace" }}>
                        {isRunning ? 'All systems operational' : 'Infrastructure is stopped'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleToggleInfra(isRunning ? 'OFF' : 'ON')}
                    disabled={actionLoading === 'toggle'}
                    className={`px-6 py-3 rounded font-bold transition-all ${
                      isRunning 
                        ? 'bg-red-700 hover:bg-red-600 text-white' 
                        : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                    } ${actionLoading === 'toggle' ? 'opacity-50' : ''}`}
                    style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}
                  >
                    {actionLoading === 'toggle' ? '...' : isRunning ? '🛑 DESTROY' : '🚀 DEPLOY'}
                  </button>
                </div>

                {/* Server Address */}
                {isRunning && infraStatus?.metrics?.minecraftAddress && (
                  <div className="bg-black/30 rounded p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
                          🎮 Minecraft Server Address
                        </p>
                        <code className="text-emerald-400 text-xl font-mono">
                          {infraStatus.metrics.minecraftAddress}
                        </code>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(infraStatus.metrics?.minecraftAddress || '')}
                        className="mc-button-stone text-sm"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                )}

                {/* Services Grid */}
                <h4 className="text-gray-400 mb-4" style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}>
                  SERVICES
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {infraStatus?.services?.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  )) ?? (
                    <>
                      <ServiceCard service={{ id: 'k8s', name: 'Kubernetes Cluster', icon: '📦', status: 'unknown', description: '', category: '' }} />
                      <ServiceCard service={{ id: 'acr', name: 'Container Registry', icon: '📦', status: 'unknown', description: '', category: '' }} />
                      <ServiceCard service={{ id: 'ip', name: 'Static Public IP', icon: '🌐', status: 'unknown', description: '', category: '' }} />
                      <ServiceCard service={{ id: 'nginx', name: 'NGINX Ingress', icon: '🚪', status: 'unknown', description: '', category: '' }} />
                      <ServiceCard service={{ id: 'cert', name: 'Cert Manager', icon: '🔒', status: 'unknown', description: '', category: '' }} />
                      <ServiceCard service={{ id: 'mc', name: 'Minecraft Server', icon: '🎮', status: 'unknown', description: '', category: '' }} />
                      <ServiceCard service={{ id: 'prom', name: 'Prometheus', icon: '📊', status: 'unknown', description: '', category: '' }} />
                      <ServiceCard service={{ id: 'graf', name: 'Grafana', icon: '📈', status: 'unknown', description: '', category: '' }} />
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* Stats Row */}
            <section className="grid md:grid-cols-4 gap-4">
              <StatCard
                icon="🖼️"
                label="Total Assets"
                value={assets.length.toString()}
                color="purple"
              />
              <StatCard
                icon="📦"
                label="K8s Pods"
                value={infraStatus?.metrics?.pods?.toString() ?? '-'}
                color="blue"
              />
              <StatCard
                icon="🖥️"
                label="K8s Nodes"
                value={infraStatus?.metrics?.nodes?.toString() ?? '-'}
                color="cyan"
              />
              <StatCard
                icon="💾"
                label="CPU Usage"
                value={infraStatus?.metrics?.cpuUsage ? `${infraStatus.metrics.cpuUsage}%` : '-'}
                color="orange"
              />
            </section>

            {/* Cost & Monitoring Row */}
            <section className="grid md:grid-cols-2 gap-6">
              {/* Cost Breakdown */}
              <div>
                <SectionHeader icon="💰" title="COST ESTIMATE" />
                <div className="mc-panel-stone p-6">
                  {infraCost ? (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="text-center p-4 bg-black/30 rounded">
                          <p className="text-gray-500 text-sm" style={{ fontFamily: "'VT323', monospace" }}>Daily (Running)</p>
                          <p className="text-2xl text-emerald-400 font-bold" style={{ fontFamily: "'VT323', monospace" }}>
                            {infraCost.daily.running}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-black/30 rounded">
                          <p className="text-gray-500 text-sm" style={{ fontFamily: "'VT323', monospace" }}>Monthly (Running)</p>
                          <p className="text-2xl text-emerald-400 font-bold" style={{ fontFamily: "'VT323', monospace" }}>
                            {infraCost.monthly.running}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {infraCost.breakdown.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-400" style={{ fontFamily: "'VT323', monospace" }}>{item.service}</span>
                            <span className="text-white" style={{ fontFamily: "'VT323', monospace" }}>{item.daily}/day</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-gray-500 text-xs mt-4" style={{ fontFamily: "'VT323', monospace" }}>
                        {infraCost.note}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500 text-center py-8" style={{ fontFamily: "'VT323', monospace" }}>
                      Cost data unavailable
                    </p>
                  )}
                </div>
              </div>

              {/* Monitoring Links */}
              <div>
                <SectionHeader icon="📊" title="MONITORING" />
                <div className="mc-panel-stone p-6 space-y-4">
                  <MonitoringLink
                    icon="📈"
                    title="Grafana"
                    description="Dashboards & visualizations"
                    href={infraStatus?.metrics?.grafanaUrl}
                    disabled={!isRunning}
                  />
                  <MonitoringLink
                    icon="📊"
                    title="Prometheus"
                    description="Metrics & queries"
                    href={infraStatus?.metrics?.grafanaUrl?.replace('grafana', 'prometheus')}
                    disabled={!isRunning}
                  />
                  <MonitoringLink
                    icon="☁️"
                    title="Azure Portal"
                    description="AKS cluster insights"
                    href="https://portal.azure.com/#browse/Microsoft.ContainerService%2FmanagedClusters"
                    disabled={false}
                  />
                  <MonitoringLink
                    icon="🔄"
                    title="GitHub Actions"
                    description="CI/CD workflows"
                    href={infraStatus?.gitHub?.workflowUrl || 'https://github.com/ColeGendreau/Minecraft-1.0/actions'}
                    disabled={false}
                  />
                </div>
              </div>
            </section>

            {/* Workflow Status */}
            {workflow?.latestRun && (
              <section>
                <SectionHeader icon="🔄" title="LATEST WORKFLOW" />
                <div className="mc-panel-stone p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        workflow.latestRun.status === 'completed' && workflow.latestRun.conclusion === 'success' ? 'bg-emerald-400' :
                        workflow.latestRun.status === 'in_progress' ? 'bg-yellow-400 animate-pulse' :
                        'bg-red-400'
                      }`} />
                      <div>
                        <p className="text-white" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                          {workflow.latestRun.name}
                        </p>
                        <p className="text-gray-500 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
                          {workflow.latestRun.status} • {new Date(workflow.latestRun.startedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <a
                      href={workflow.latestRun.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mc-button-stone text-sm"
                    >
                      View →
                    </a>
                  </div>
                </div>
              </section>
            )}

            {/* Activity Log */}
            {infraLogs?.recentOperations && infraLogs.recentOperations.length > 0 && (
              <section>
                <SectionHeader icon="📜" title="RECENT ACTIVITY" />
                <div className="mc-panel-stone p-6">
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {infraLogs.recentOperations.slice(0, 10).map((op, i) => (
                      <div key={i} className="flex items-center gap-4 text-sm">
                        <span className={`w-2 h-2 rounded-full ${
                          op.status === 'Succeeded' ? 'bg-emerald-400' :
                          op.status === 'Failed' ? 'bg-red-400' :
                          'bg-yellow-400'
                        }`} />
                        <span className="text-gray-500 w-40" style={{ fontFamily: "'VT323', monospace" }}>
                          {new Date(op.time).toLocaleString()}
                        </span>
                        <span className="text-white flex-1" style={{ fontFamily: "'VT323', monospace" }}>
                          {op.operation}
                        </span>
                        <span className={`${
                          op.status === 'Succeeded' ? 'text-emerald-400' :
                          op.status === 'Failed' ? 'text-red-400' :
                          'text-yellow-400'
                        }`} style={{ fontFamily: "'VT323', monospace" }}>
                          {op.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Danger Zone */}
            <section>
              <SectionHeader icon="⚠️" title="DANGER ZONE" />
              <div className="mc-panel-stone p-6 border-2 border-red-900">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-red-400" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}>
                      ☢️ NUKE ALL ASSETS
                    </h4>
                    <p className="text-gray-500 mt-1" style={{ fontFamily: "'VT323', monospace" }}>
                      Delete all {assets.length} assets and reset the Minecraft world
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNukeConfirm(true)}
                    disabled={actionLoading === 'nuke' || assets.length === 0}
                    className="mc-button-stone !bg-red-800 !border-red-900 hover:!bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading === 'nuke' ? '☢️ NUKING...' : '☢️ NUKE ALL'}
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

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-2xl">{icon}</span>
      <h2 
        className="text-white"
        style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '12px' }}
      >
        {title}
      </h2>
    </div>
  );
}

function ServiceCard({ service }: { service: { id: string; name: string; icon: string; status: string; description: string; category: string } }) {
  const statusColors = {
    running: 'bg-emerald-400',
    stopped: 'bg-red-400',
    unknown: 'bg-gray-500',
    error: 'bg-red-500'
  };
  
  return (
    <div className="mc-slot p-3 text-center">
      <div className="text-2xl mb-1">{service.icon}</div>
      <p className="text-gray-300 text-xs" style={{ fontFamily: "'VT323', monospace" }}>
        {service.name}
      </p>
      <div className={`w-2 h-2 rounded-full mx-auto mt-2 ${statusColors[service.status as keyof typeof statusColors] || 'bg-gray-500'}`} />
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    purple: 'text-purple-400',
    blue: 'text-blue-400',
    cyan: 'text-cyan-400',
    orange: 'text-orange-400',
    emerald: 'text-emerald-400'
  };
  
  return (
    <div className="mc-panel-stone p-4 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p className={`text-3xl font-bold ${colorClasses[color]}`} style={{ fontFamily: "'VT323', monospace" }}>
        {value}
      </p>
      <p className="text-gray-500 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
        {label}
      </p>
    </div>
  );
}

function MonitoringLink({ 
  icon, 
  title, 
  description, 
  href, 
  disabled 
}: { 
  icon: string; 
  title: string; 
  description: string; 
  href?: string; 
  disabled: boolean;
}) {
  const Component = disabled || !href ? 'div' : 'a';
  
  return (
    <Component
      {...(!disabled && href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`flex items-center gap-4 p-3 rounded transition-colors ${
        disabled 
          ? 'bg-black/20 opacity-50 cursor-not-allowed' 
          : 'bg-black/30 hover:bg-black/50 cursor-pointer'
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <p className="text-white" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
          {title}
        </p>
        <p className="text-gray-500 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
          {description}
        </p>
      </div>
      {!disabled && <span className="text-gray-500">→</span>}
    </Component>
  );
}

