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
  type InfrastructureStatusResponse,
  type InfrastructureCostResponse,
  type InfrastructureLogsResponse,
  type LatestWorkflowResponse,
  type Asset
} from '@/lib/api';

export default function AdminPage() {
  const { isDay } = useTheme();
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
              <SectionHeader icon="🎮" title="SERVER CONTROL" isDay={isDay} />
              <div className={`p-6 rounded-lg border-4 shadow-xl transition-colors duration-500 ${
                isDay ? 'bg-white/90 backdrop-blur border-emerald-400' : 'bg-slate-800/90 backdrop-blur border-emerald-700'
              }`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-lg border-2 ${
                      isRunning 
                        ? (isDay ? 'bg-emerald-100 border-emerald-400' : 'bg-emerald-900/50 border-emerald-700') 
                        : 'bg-red-100 border-red-400'
                    }`}>
                      <span className="text-3xl">{isRunning ? '⚡' : '💤'}</span>
                    </div>
                    <div>
                      <h3 className={`text-lg ${isRunning ? (isDay ? 'text-emerald-700' : 'text-emerald-400') : 'text-red-500'}`} style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '12px' }}>
                        {isRunning ? 'SERVER ONLINE' : 'SERVER OFFLINE'}
                      </h3>
                      <p className={`mt-1 ${isDay ? 'text-gray-600' : 'text-gray-400'}`} style={{ fontFamily: "'VT323', monospace" }}>
                        {isRunning ? 'All systems operational' : 'Infrastructure stopped'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleInfra(isRunning ? 'OFF' : 'ON')}
                    disabled={actionLoading === 'toggle'}
                    className={`px-6 py-3 rounded-lg font-bold border-4 shadow-lg ${
                      isRunning ? 'bg-red-500 hover:bg-red-600 text-white border-red-700' : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-700'
                    } ${actionLoading === 'toggle' ? 'opacity-50' : ''}`}
                    style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}
                  >
                    {actionLoading === 'toggle' ? '...' : isRunning ? '🛑 DESTROY' : '🚀 DEPLOY'}
                  </button>
                </div>

                {isRunning && infraStatus?.metrics?.minecraftAddress && (
                  <div className={`p-4 rounded-lg border-2 mb-6 ${isDay ? 'bg-emerald-50 border-emerald-300' : 'bg-emerald-900/30 border-emerald-700'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm ${isDay ? 'text-emerald-600' : 'text-emerald-400'}`} style={{ fontFamily: "'VT323', monospace" }}>🎮 Server Address</p>
                        <code className={`text-xl font-bold ${isDay ? 'text-emerald-800' : 'text-emerald-300'}`}>{infraStatus.metrics.minecraftAddress}</code>
                      </div>
                      <button onClick={() => navigator.clipboard.writeText(infraStatus.metrics?.minecraftAddress || '')} className="mc-button-grass text-sm">📋 Copy</button>
                    </div>
                  </div>
                )}

                <h4 className={`mb-4 font-bold ${isDay ? 'text-amber-800' : 'text-slate-300'}`} style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>SERVICES</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(infraStatus?.services || [
                    { id: 'k8s', name: 'Kubernetes', icon: '📦', status: 'unknown' },
                    { id: 'acr', name: 'Registry', icon: '📦', status: 'unknown' },
                    { id: 'ip', name: 'Public IP', icon: '🌐', status: 'unknown' },
                    { id: 'nginx', name: 'Ingress', icon: '🚪', status: 'unknown' },
                    { id: 'cert', name: 'Certs', icon: '🔒', status: 'unknown' },
                    { id: 'mc', name: 'Minecraft', icon: '🎮', status: 'unknown' },
                    { id: 'prom', name: 'Prometheus', icon: '📊', status: 'unknown' },
                    { id: 'graf', name: 'Grafana', icon: '📈', status: 'unknown' },
                  ]).map((s) => (
                    <ServiceCard key={s.id} service={s} isDay={isDay} />
                  ))}
                </div>
              </div>
            </section>

            {/* Stats */}
            <section className="grid md:grid-cols-4 gap-4">
              <StatCard icon="🖼️" label="Assets" value={assets.length.toString()} color="purple" isDay={isDay} />
              <StatCard icon="📦" label="Pods" value={infraStatus?.metrics?.pods?.toString() ?? '-'} color="sky" isDay={isDay} />
              <StatCard icon="🖥️" label="Nodes" value={infraStatus?.metrics?.nodes?.toString() ?? '-'} color="cyan" isDay={isDay} />
              <StatCard icon="💾" label="CPU" value={infraStatus?.metrics?.cpuUsage ? `${infraStatus.metrics.cpuUsage}%` : '-'} color="orange" isDay={isDay} />
            </section>

            {/* Cost & Monitoring */}
            <section className="grid md:grid-cols-2 gap-6">
              <div>
                <SectionHeader icon="💰" title="COSTS" isDay={isDay} />
                <div className={`p-6 rounded-lg border-4 shadow-xl ${isDay ? 'bg-white/90 border-yellow-400' : 'bg-slate-800/90 border-yellow-700'}`}>
                  {infraCost ? (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className={`text-center p-4 rounded-lg border-2 ${isDay ? 'bg-yellow-50 border-yellow-300' : 'bg-yellow-900/30 border-yellow-700'}`}>
                          <p className={`text-sm ${isDay ? 'text-yellow-700' : 'text-yellow-400'}`} style={{ fontFamily: "'VT323', monospace" }}>Daily</p>
                          <p className={`text-2xl font-bold ${isDay ? 'text-yellow-800' : 'text-yellow-300'}`} style={{ fontFamily: "'VT323', monospace" }}>{infraCost.daily.running}</p>
                        </div>
                        <div className={`text-center p-4 rounded-lg border-2 ${isDay ? 'bg-yellow-50 border-yellow-300' : 'bg-yellow-900/30 border-yellow-700'}`}>
                          <p className={`text-sm ${isDay ? 'text-yellow-700' : 'text-yellow-400'}`} style={{ fontFamily: "'VT323', monospace" }}>Monthly</p>
                          <p className={`text-2xl font-bold ${isDay ? 'text-yellow-800' : 'text-yellow-300'}`} style={{ fontFamily: "'VT323', monospace" }}>{infraCost.monthly.running}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {infraCost.breakdown.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className={isDay ? 'text-gray-600' : 'text-gray-400'} style={{ fontFamily: "'VT323', monospace" }}>{item.service}</span>
                            <span className={isDay ? 'text-gray-800' : 'text-gray-200'} style={{ fontFamily: "'VT323', monospace" }}>{item.daily}/day</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className={`text-center py-8 ${isDay ? 'text-gray-500' : 'text-gray-400'}`}>No cost data</p>
                  )}
                </div>
              </div>

              <div>
                <SectionHeader icon="📊" title="MONITORING" isDay={isDay} />
                <div className={`p-6 rounded-lg border-4 shadow-xl space-y-3 ${isDay ? 'bg-white/90 border-sky-400' : 'bg-slate-800/90 border-sky-700'}`}>
                  <MonitoringLink icon="📈" title="Grafana" href={infraStatus?.metrics?.grafanaUrl} disabled={!isRunning} isDay={isDay} />
                  <MonitoringLink icon="📊" title="Prometheus" href={infraStatus?.metrics?.grafanaUrl?.replace('grafana', 'prometheus')} disabled={!isRunning} isDay={isDay} />
                  <MonitoringLink icon="☁️" title="Azure Portal" href="https://portal.azure.com" disabled={false} isDay={isDay} />
                  <MonitoringLink icon="🔄" title="GitHub Actions" href="https://github.com/ColeGendreau/Minecraft-1.0/actions" disabled={false} isDay={isDay} />
                </div>
              </div>
            </section>

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

            {/* Activity Log */}
            {infraLogs?.recentOperations && infraLogs.recentOperations.length > 0 && (
              <section>
                <SectionHeader icon="📜" title="ACTIVITY" isDay={isDay} />
                <div className={`p-6 rounded-lg border-4 shadow-xl ${isDay ? 'bg-white/90 border-amber-400' : 'bg-slate-800/90 border-amber-700'}`}>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {infraLogs.recentOperations.slice(0, 8).map((op, i) => (
                      <div key={i} className={`flex items-center gap-3 text-sm p-2 rounded ${isDay ? 'bg-amber-50' : 'bg-slate-700/50'}`}>
                        <span className={`w-2 h-2 rounded-full ${op.status === 'Succeeded' ? 'bg-emerald-500' : op.status === 'Failed' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                        <span className={`flex-1 ${isDay ? 'text-gray-800' : 'text-gray-300'}`} style={{ fontFamily: "'VT323', monospace" }}>{op.operation}</span>
                        <span className={op.status === 'Succeeded' ? 'text-emerald-600' : 'text-red-500'} style={{ fontFamily: "'VT323', monospace" }}>{op.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

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
  const statusBg = { running: isDay ? 'bg-emerald-100 border-emerald-400' : 'bg-emerald-900/50 border-emerald-700', stopped: 'bg-red-100 border-red-400', unknown: isDay ? 'bg-gray-100 border-gray-300' : 'bg-slate-700 border-slate-600' };
  const dotColor = { running: 'bg-emerald-500', stopped: 'bg-red-500', unknown: 'bg-gray-400' };
  
  return (
    <div className={`p-3 text-center rounded-lg border-2 shadow ${statusBg[service.status as keyof typeof statusBg] || statusBg.unknown}`}>
      <div className="text-2xl mb-1">{service.icon}</div>
      <p className={`text-xs font-bold ${isDay ? 'text-gray-700' : 'text-gray-300'}`} style={{ fontFamily: "'VT323', monospace" }}>{service.name}</p>
      <div className={`w-2 h-2 rounded-full mx-auto mt-2 ${dotColor[service.status as keyof typeof dotColor] || dotColor.unknown}`} />
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
