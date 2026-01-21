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
    <main className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-200">
      {/* Clouds */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float opacity-60"
            style={{
              left: `${(i * 25) % 100}%`,
              top: `${3 + (i * 5) % 15}%`,
              animationDelay: `${i * 1}s`,
              animationDuration: `${5 + (i % 2)}s`
            }}
          >
            <div className="flex gap-1">
              <div className="w-10 h-6 bg-white rounded-lg" />
              <div className="w-14 h-8 bg-white rounded-lg -mt-1" />
              <div className="w-8 h-5 bg-white rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Nuke Confirmation Modal */}
      {showNukeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="mc-card p-8 max-w-md bg-white border-4 border-red-500 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">☢️</div>
              <h2 
                className="text-xl text-red-600 mb-4"
                style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}
              >
                NUKE ALL ASSETS?
              </h2>
              <p className="text-gray-700 mb-6" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
                This will DELETE all {assets.length} assets from the Minecraft world. 
                The area will be cleared and reset.
              </p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => setShowNukeConfirm(false)} className="mc-button-stone">
                  CANCEL
                </button>
                <button onClick={handleNuke} className="mc-button-stone !bg-red-600 !border-red-800">
                  ☢️ CONFIRM NUKE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative bg-amber-100/80 backdrop-blur border-b-4 border-amber-400 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-amber-700 hover:text-amber-900 transition-colors font-bold">
                ← Back to Home
              </Link>
              <div>
                <h1 
                  className="text-xl text-amber-900"
                  style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '14px' }}
                >
                  ⚙️ ADMIN PANEL
                </h1>
                <p className="text-amber-700 mt-1" style={{ fontFamily: "'VT323', monospace" }}>
                  Infrastructure, monitoring & server management
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${apiOnline ? 'bg-emerald-100 border-emerald-400' : 'bg-red-100 border-red-400'}`}>
                <div className={`w-3 h-3 rounded-full ${apiOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className={`text-sm font-bold ${apiOnline ? 'text-emerald-700' : 'text-red-700'}`} style={{ fontFamily: "'VT323', monospace" }}>
                  API {apiOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 relative">
        {loading ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">⛏️</div>
            <p className="text-amber-800 text-xl" style={{ fontFamily: "'VT323', monospace" }}>
              Loading admin data...
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Server Control Panel */}
            <section>
              <SectionHeader icon="🎮" title="SERVER CONTROL" />
              <div className="mc-card p-6 bg-white/90 backdrop-blur border-4 border-emerald-400 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-lg ${isRunning ? 'bg-emerald-100 border-2 border-emerald-400' : 'bg-red-100 border-2 border-red-400'}`}>
                      <span className="text-3xl">{isRunning ? '⚡' : '💤'}</span>
                    </div>
                    <div>
                      <h3 
                        className={`text-lg ${isRunning ? 'text-emerald-700' : 'text-red-700'}`}
                        style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '12px' }}
                      >
                        {isRunning ? 'SERVER ONLINE' : 'SERVER OFFLINE'}
                      </h3>
                      <p className="text-gray-600 mt-1" style={{ fontFamily: "'VT323', monospace" }}>
                        {isRunning ? 'All systems operational' : 'Infrastructure is stopped'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleToggleInfra(isRunning ? 'OFF' : 'ON')}
                    disabled={actionLoading === 'toggle'}
                    className={`px-6 py-3 rounded-lg font-bold transition-all shadow-lg border-4 ${
                      isRunning 
                        ? 'bg-red-500 hover:bg-red-600 text-white border-red-700' 
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-700'
                    } ${actionLoading === 'toggle' ? 'opacity-50' : ''}`}
                    style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}
                  >
                    {actionLoading === 'toggle' ? '...' : isRunning ? '🛑 DESTROY' : '🚀 DEPLOY'}
                  </button>
                </div>

                {/* Server Address */}
                {isRunning && infraStatus?.metrics?.minecraftAddress && (
                  <div className="bg-emerald-50 rounded-lg p-4 mb-6 border-2 border-emerald-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-emerald-600 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
                          🎮 Minecraft Server Address
                        </p>
                        <code className="text-emerald-800 text-xl font-bold">
                          {infraStatus.metrics.minecraftAddress}
                        </code>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(infraStatus.metrics?.minecraftAddress || '')}
                        className="mc-button-grass text-sm"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                )}

                {/* Services Grid */}
                <h4 className="text-amber-800 mb-4 font-bold" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
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
              <StatCard icon="🖼️" label="Total Assets" value={assets.length.toString()} color="purple" />
              <StatCard icon="📦" label="K8s Pods" value={infraStatus?.metrics?.pods?.toString() ?? '-'} color="sky" />
              <StatCard icon="🖥️" label="K8s Nodes" value={infraStatus?.metrics?.nodes?.toString() ?? '-'} color="cyan" />
              <StatCard icon="💾" label="CPU Usage" value={infraStatus?.metrics?.cpuUsage ? `${infraStatus.metrics.cpuUsage}%` : '-'} color="orange" />
            </section>

            {/* Cost & Monitoring Row */}
            <section className="grid md:grid-cols-2 gap-6">
              {/* Cost Breakdown */}
              <div>
                <SectionHeader icon="💰" title="COST ESTIMATE" />
                <div className="mc-card p-6 bg-white/90 backdrop-blur border-4 border-yellow-400 shadow-xl">
                  {infraCost ? (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
                          <p className="text-yellow-700 text-sm" style={{ fontFamily: "'VT323', monospace" }}>Daily (Running)</p>
                          <p className="text-2xl text-yellow-800 font-bold" style={{ fontFamily: "'VT323', monospace" }}>
                            {infraCost.daily.running}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
                          <p className="text-yellow-700 text-sm" style={{ fontFamily: "'VT323', monospace" }}>Monthly (Running)</p>
                          <p className="text-2xl text-yellow-800 font-bold" style={{ fontFamily: "'VT323', monospace" }}>
                            {infraCost.monthly.running}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {infraCost.breakdown.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-600" style={{ fontFamily: "'VT323', monospace" }}>{item.service}</span>
                            <span className="text-gray-800 font-bold" style={{ fontFamily: "'VT323', monospace" }}>{item.daily}/day</span>
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
                <div className="mc-card p-6 bg-white/90 backdrop-blur border-4 border-sky-400 shadow-xl space-y-4">
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
                <div className="mc-card p-6 bg-white/90 backdrop-blur border-4 border-purple-400 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-4 h-4 rounded-full ${
                        workflow.latestRun.status === 'completed' && workflow.latestRun.conclusion === 'success' ? 'bg-emerald-500' :
                        workflow.latestRun.status === 'in_progress' ? 'bg-yellow-500 animate-pulse' :
                        'bg-red-500'
                      }`} />
                      <div>
                        <p className="text-gray-800 font-bold" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
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
                      className="mc-button-grass text-sm"
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
                <div className="mc-card p-6 bg-white/90 backdrop-blur border-4 border-amber-400 shadow-xl">
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {infraLogs.recentOperations.slice(0, 10).map((op, i) => (
                      <div key={i} className="flex items-center gap-4 text-sm p-2 bg-amber-50 rounded">
                        <span className={`w-3 h-3 rounded-full ${
                          op.status === 'Succeeded' ? 'bg-emerald-500' :
                          op.status === 'Failed' ? 'bg-red-500' :
                          'bg-yellow-500'
                        }`} />
                        <span className="text-gray-500 w-40" style={{ fontFamily: "'VT323', monospace" }}>
                          {new Date(op.time).toLocaleString()}
                        </span>
                        <span className="text-gray-800 flex-1" style={{ fontFamily: "'VT323', monospace" }}>
                          {op.operation}
                        </span>
                        <span className={`font-bold ${
                          op.status === 'Succeeded' ? 'text-emerald-600' :
                          op.status === 'Failed' ? 'text-red-600' :
                          'text-yellow-600'
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
              <div className="mc-card p-6 bg-red-50 border-4 border-red-400 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-red-700 font-bold" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}>
                      ☢️ NUKE ALL ASSETS
                    </h4>
                    <p className="text-red-600 mt-1" style={{ fontFamily: "'VT323', monospace" }}>
                      Delete all {assets.length} assets and reset the Minecraft world
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNukeConfirm(true)}
                    disabled={actionLoading === 'nuke' || assets.length === 0}
                    className="mc-button-stone !bg-red-600 !border-red-800 hover:!bg-red-700 disabled:opacity-50"
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
      <span className="text-2xl drop-shadow-lg">{icon}</span>
      <h2 
        className="text-amber-900"
        style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '12px' }}
      >
        {title}
      </h2>
    </div>
  );
}

function ServiceCard({ service }: { service: { id: string; name: string; icon: string; status: string; description: string; category: string } }) {
  const statusColors = {
    running: 'bg-emerald-100 border-emerald-400',
    stopped: 'bg-red-100 border-red-400',
    unknown: 'bg-gray-100 border-gray-300',
    error: 'bg-red-100 border-red-500'
  };
  const dotColors = {
    running: 'bg-emerald-500',
    stopped: 'bg-red-500',
    unknown: 'bg-gray-400',
    error: 'bg-red-600'
  };
  
  return (
    <div className={`${statusColors[service.status as keyof typeof statusColors] || 'bg-gray-100 border-gray-300'} p-3 text-center rounded-lg border-2 shadow`}>
      <div className="text-2xl mb-1">{service.icon}</div>
      <p className="text-gray-700 text-xs font-bold" style={{ fontFamily: "'VT323', monospace" }}>
        {service.name}
      </p>
      <div className={`w-2 h-2 rounded-full mx-auto mt-2 ${dotColors[service.status as keyof typeof dotColors] || 'bg-gray-400'}`} />
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-100 border-purple-400 text-purple-700',
    sky: 'bg-sky-100 border-sky-400 text-sky-700',
    cyan: 'bg-cyan-100 border-cyan-400 text-cyan-700',
    orange: 'bg-orange-100 border-orange-400 text-orange-700',
    emerald: 'bg-emerald-100 border-emerald-400 text-emerald-700'
  };
  
  return (
    <div className={`${colorClasses[color]} p-4 text-center rounded-lg border-4 shadow-lg`}>
      <div className="text-3xl mb-2 drop-shadow">{icon}</div>
      <p className={`text-3xl font-bold`} style={{ fontFamily: "'VT323', monospace" }}>
        {value}
      </p>
      <p className="text-gray-600 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
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
      className={`flex items-center gap-4 p-3 rounded-lg transition-colors border-2 ${
        disabled 
          ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed' 
          : 'bg-sky-50 border-sky-300 hover:bg-sky-100 cursor-pointer'
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <p className="text-gray-800 font-bold" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
          {title}
        </p>
        <p className="text-gray-500 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
          {description}
        </p>
      </div>
      {!disabled && <span className="text-sky-500 font-bold">→</span>}
    </Component>
  );
}
