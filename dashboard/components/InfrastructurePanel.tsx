'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getInfrastructureStatus,
  toggleInfrastructure,
  getLatestWorkflow,
  getInfrastructureLogs,
  type InfrastructureStatusResponse,
  type LatestWorkflowResponse,
  type WorkflowJob,
  type WorkflowStep,
  type InfrastructureLogsResponse,
} from '@/lib/api';

export function InfrastructurePanel() {
  const [status, setStatus] = useState<InfrastructureStatusResponse | null>(null);
  const [workflow, setWorkflow] = useState<LatestWorkflowResponse | null>(null);
  const [logs, setLogs] = useState<InfrastructureLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statusData, workflowData, logsData] = await Promise.all([
        getInfrastructureStatus().catch(() => null),
        getLatestWorkflow().catch(() => null),
        getInfrastructureLogs().catch(() => null),
      ]);
      
      if (statusData) setStatus(statusData);
      if (workflowData) setWorkflow(workflowData);
      if (logsData) setLogs(logsData);
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
      ? 'DESTROY all infrastructure?\n\nThis will delete:\n- Kubernetes cluster\n- Minecraft server\n- All monitoring\n\nYou will stop being billed.'
      : 'DEPLOY Minecraft infrastructure?\n\nThis will create:\n- AKS Kubernetes cluster\n- Minecraft Java server\n- Grafana + Prometheus monitoring\n\nEstimated cost: ~$3-5/day';

    if (!confirm(confirmMessage)) return;

    setToggling(true);
    setShowLogs(true); // Auto-show logs when toggling
    try {
      await toggleInfrastructure(targetState);
      setTimeout(fetchData, 2000);
    } catch (err) {
      if (err instanceof Error) {
        alert(`Failed: ${err.message}`);
      }
    } finally {
      setToggling(false);
    }
  };

  const isRunning = status?.state === 'ON';
  const hasActiveWorkflow = workflow?.hasActiveRun ?? false;

  return (
    <div className="space-y-4">
      {/* Main Status Card - Dirt/Grass Style */}
      <div className="mc-panel-dirt p-6 text-white">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          {/* Status */}
          <div className="flex items-center gap-4">
            <div className={`
              w-16 h-16 rounded flex items-center justify-center text-4xl
              ${hasActiveWorkflow ? 'bg-yellow-500/30 animate-pulse' : isRunning ? 'bg-green-500/30' : 'bg-gray-500/30'}
            `}>
              {hasActiveWorkflow ? '⚙️' : isRunning ? '⚡' : '💤'}
            </div>
            <div>
              <h2 
                className="text-white text-shadow-mc"
                style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '16px' }}
              >
                {hasActiveWorkflow ? 'WORKING...' : isRunning ? 'SERVER ONLINE' : 'SERVER OFFLINE'}
              </h2>
              <p className="text-green-200 mt-1" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
                {hasActiveWorkflow 
                  ? 'Infrastructure changes in progress...'
                  : isRunning 
                    ? 'All systems operational' 
                    : 'No costs - click Deploy to start'
                }
              </p>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleToggle}
            disabled={toggling || loading || hasActiveWorkflow}
            className={`
              px-8 py-4 rounded text-white font-bold transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isRunning ? 'mc-button-red' : 'mc-button-grass'}
            `}
            style={{ fontFamily: "'VT323', monospace", fontSize: '20px', letterSpacing: '1px' }}
          >
            {toggling || hasActiveWorkflow ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                WORKING...
              </span>
            ) : isRunning ? (
              '🛑 DESTROY'
            ) : (
              '🚀 DEPLOY'
            )}
          </button>
        </div>

        {/* Service Status Grid */}
        {status?.services && (
          <div className="mb-4">
            <h3 className="text-green-200 mb-3 font-bold tracking-wide" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
              SERVICES
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {status.services.map((service) => (
                <ServiceBlock key={service.id} service={service} />
              ))}
            </div>
          </div>
        )}

        {/* Server Info when running */}
        {isRunning && status?.metrics && (
          <ServerInfoBox metrics={status.metrics} />
        )}

        {/* Workflow Progress */}
        {hasActiveWorkflow && workflow?.latestRun && (
          <WorkflowProgressBox 
            jobs={workflow.latestRun.jobs} 
            runUrl={workflow.latestRun.url}
          />
        )}
      </div>

      {/* Azure Activity Logs Toggle */}
      <button
        onClick={() => setShowLogs(!showLogs)}
        className="mc-button-secondary w-full flex items-center justify-center gap-2"
      >
        <span>{showLogs ? '▼' : '▶'}</span>
        <span>AZURE ACTIVITY LOGS</span>
      </button>

      {/* Azure Activity Logs Panel */}
      {showLogs && logs && (
        <AzureLogsPanel logs={logs} />
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-sm px-2" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
        <span className="text-amber-800 font-semibold">
          💰 {isRunning ? '~$3-5/day while running' : '$0/day when stopped'}
        </span>
        <span className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${
            hasActiveWorkflow ? 'bg-yellow-500 animate-pulse' : 
            loading ? 'bg-yellow-500' : 
            error ? 'bg-red-500' : 
            'bg-green-500'
          }`} />
          <span className="text-green-700 font-semibold">
            {hasActiveWorkflow ? 'Workflow Running' : loading ? 'Loading...' : error ? 'Error' : 'Connected'}
          </span>
        </span>
      </div>
    </div>
  );
}

// Service block component - looks like Minecraft inventory slot
function ServiceBlock({ service }: { service: InfrastructureStatusResponse['services'][0] }) {
  const isOnline = service.status === 'running';
  
  const icons: Record<string, string> = {
    kubernetes: '☸️',
    container: '📦',
    globe: '🌐',
    route: '🚪',
    lock: '🔒',
    game: '🎮',
    chart: '📊',
    dashboard: '📈',
  };

  return (
    <div className={`
      mc-slot p-2 text-center transition-all
      ${isOnline ? 'opacity-100' : 'opacity-50'}
    `}>
      <div className="text-2xl mb-1">{icons[service.icon] || '⬜'}</div>
      <p className="text-xs text-gray-800 font-bold truncate" style={{ fontFamily: "'VT323', monospace" }}>
        {service.name}
      </p>
      <div className={`
        w-2 h-2 rounded-full mx-auto mt-1
        ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}
      `} />
    </div>
  );
}

// Server info box
function ServerInfoBox({ metrics }: { metrics: InfrastructureStatusResponse['metrics'] }) {
  const [copied, setCopied] = useState(false);

  const copyIP = () => {
    if (metrics?.minecraftAddress) {
      navigator.clipboard.writeText(metrics.minecraftAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!metrics) return null;

  return (
    <div className="mc-panel-oak p-4 mb-4">
      <h3 className="text-amber-900 mb-3 font-bold" style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}>
        🎮 JOIN SERVER
      </h3>
      <div className="flex items-center gap-3">
        <code className="flex-grow bg-amber-100 px-4 py-2 text-amber-900 font-mono text-lg rounded border-2 border-amber-300">
          {metrics.minecraftAddress}
        </code>
        <button
          onClick={copyIP}
          className="mc-button"
          style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}
        >
          {copied ? '✅ COPIED!' : '📋 COPY'}
        </button>
      </div>
      <div className="mt-3 p-3 bg-amber-200 border-2 border-amber-400 rounded">
        <p className="text-amber-900 font-bold" style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
          📋 How to connect:
        </p>
        <p className="text-amber-800 mt-1" style={{ fontFamily: "'VT323', monospace", fontSize: '17px' }}>
          Open Minecraft Java → Multiplayer → Add Server → Paste address above
        </p>
      </div>
    </div>
  );
}

// Workflow progress box
function WorkflowProgressBox({ jobs, runUrl }: { jobs?: WorkflowJob[]; runUrl: string }) {
  if (!jobs || jobs.length === 0) {
    return (
      <div className="mc-panel-stone p-4">
        <p className="text-gray-300 text-center" style={{ fontFamily: "'VT323', monospace" }}>
          Waiting for workflow to start...
        </p>
      </div>
    );
  }

  return (
    <div className="mc-panel-stone p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-200 text-shadow-mc-light" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}>
          ⚙️ WORKFLOW PROGRESS
        </h3>
        <a 
          href={runUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-300 hover:text-blue-200 text-xs underline"
        >
          View in GitHub →
        </a>
      </div>
      
      {jobs.map((job) => (
        <div key={job.name} className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">
              {job.status === 'completed' 
                ? (job.conclusion === 'success' ? '✅' : '❌')
                : job.status === 'in_progress' ? '⏳' : '⏸️'
              }
            </span>
            <span className="text-gray-200" style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}>
              {job.name}
            </span>
          </div>
          <div className="ml-6 space-y-1">
            {job.steps?.slice(0, 8).map((step, i) => (
              <StepIndicator key={i} step={step} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StepIndicator({ step }: { step: WorkflowStep }) {
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
        step.status === 'completed' && step.conclusion === 'skipped' ? 'text-gray-300' :
        step.status === 'in_progress' ? 'text-yellow-300 font-bold' : 
        'text-gray-300'
      }`} style={{ fontFamily: "'VT323', monospace" }}>
        {step.name}
      </span>
    </div>
  );
}

// Azure Logs Panel - Command block terminal style
function AzureLogsPanel({ logs }: { logs: InfrastructureLogsResponse }) {
  return (
    <div className="mc-terminal rounded">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-700">
        <span className="text-green-400 font-bold">AZURE INFRASTRUCTURE</span>
        <span className="text-gray-500 text-xs">{new Date(logs.timestamp).toLocaleString()}</span>
      </div>

      {/* Resource Groups */}
      <div className="mb-4">
        <p className="text-blue-400 font-bold mb-2">=== Resource Groups ===</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500">
              <td className="pr-4">Name</td>
              <td className="pr-4">Location</td>
              <td className="pr-4">State</td>
              <td>Purpose</td>
            </tr>
          </thead>
          <tbody>
            {logs.resourceGroups.map((rg, i) => (
              <tr key={i}>
                <td className="pr-4 text-white">{rg.name}</td>
                <td className="pr-4 text-gray-400">{rg.location}</td>
                <td className={`pr-4 ${rg.state === 'Succeeded' ? 'text-green-400' : 'text-red-400'}`}>
                  {rg.state}
                </td>
                <td className="text-gray-500">{rg.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AKS Cluster */}
      <div className="mb-4">
        <p className="text-blue-400 font-bold mb-2">=== AKS Cluster ===</p>
        {logs.aksCluster ? (
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="pr-4 text-gray-500">Name:</td>
                <td className="text-white">{logs.aksCluster.name}</td>
              </tr>
              <tr>
                <td className="pr-4 text-gray-500">Kubernetes:</td>
                <td className="text-white">v{logs.aksCluster.kubernetesVersion}</td>
              </tr>
              <tr>
                <td className="pr-4 text-gray-500">Nodes:</td>
                <td className="text-white">{logs.aksCluster.nodeCount}</td>
              </tr>
              <tr>
                <td className="pr-4 text-gray-500">State:</td>
                <td className="text-green-400">{logs.aksCluster.state}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">No AKS cluster deployed</p>
        )}
      </div>

      {/* Recent Operations */}
      <div className="mb-4">
        <p className="text-blue-400 font-bold mb-2">=== Recent Activity ===</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500">
              <td className="pr-4">Time</td>
              <td className="pr-4">Operation</td>
              <td>Status</td>
            </tr>
          </thead>
          <tbody>
            {logs.recentOperations.slice(0, 12).map((op, i) => (
              <tr key={i}>
                <td className="pr-4 text-gray-500">
                  {op.time ? new Date(op.time).toLocaleTimeString() : '--'}
                </td>
                <td className="pr-4 text-white">{op.operation}</td>
                <td className={`
                  ${op.status === 'Succeeded' || op.status === 'success' ? 'text-green-400' : ''}
                  ${op.status === 'Failed' || op.status === 'failure' ? 'text-red-400' : ''}
                  ${op.status === 'Running' || op.status === 'in_progress' ? 'text-yellow-400' : ''}
                  ${op.status === 'Skipped' ? 'text-gray-500' : ''}
                `}>
                  {op.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Activity Log */}
      {logs.activityLog.length > 0 && (
        <div>
          <p className="text-blue-400 font-bold mb-2">=== Workflow History ===</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500">
                <td className="pr-4">Time</td>
                <td className="pr-4">Workflow</td>
                <td className="pr-4">Status</td>
                <td>Trigger</td>
              </tr>
            </thead>
            <tbody>
              {logs.activityLog.slice(0, 8).map((entry, i) => (
                <tr key={i}>
                  <td className="pr-4 text-gray-500">
                    {new Date(entry.time).toLocaleDateString()}
                  </td>
                  <td className="pr-4 text-white">{entry.operation}</td>
                  <td className={`pr-4 ${
                    entry.status === 'Succeeded' ? 'text-green-400' : 
                    entry.status === 'Failed' ? 'text-red-400' : 
                    entry.status === 'Running' ? 'text-yellow-400' : 'text-gray-400'
                  }`}>
                    {entry.status}
                  </td>
                  <td className="text-gray-500 truncate max-w-[150px]">{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Link to full logs */}
      <div className="mt-4 pt-2 border-t border-gray-700">
        <a 
          href={logs.workflowUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          View full logs on GitHub Actions →
        </a>
      </div>
    </div>
  );
}
