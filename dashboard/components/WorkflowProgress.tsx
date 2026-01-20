'use client';

import { useEffect, useState, useCallback } from 'react';

interface WorkflowStep {
  name: string;
  status: string;
  conclusion: string | null;
}

interface WorkflowJob {
  name: string;
  status: string;
  conclusion: string | null;
  steps: WorkflowStep[];
}

interface LatestWorkflow {
  hasActiveRun: boolean;
  latestRun: {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    url: string;
    startedAt: string;
    updatedAt: string;
    jobs?: WorkflowJob[];
  } | null;
  error?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function WorkflowProgress() {
  const [workflow, setWorkflow] = useState<LatestWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const fetchWorkflow = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/workflows/latest`);
      if (response.ok) {
        const data = await response.json();
        setWorkflow(data);
      }
    } catch (error) {
      console.error('Failed to fetch workflow status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflow();

    // Poll every 5 seconds when there's an active run
    const interval = setInterval(() => {
      if (workflow?.hasActiveRun) {
        fetchWorkflow();
      }
    }, 5000);

    // Also poll every 30 seconds regardless
    const slowInterval = setInterval(fetchWorkflow, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(slowInterval);
    };
  }, [fetchWorkflow, workflow?.hasActiveRun]);

  if (loading) {
    return null;
  }

  // Don't show if no workflow data
  if (!workflow?.latestRun) {
    return null;
  }

  const run = workflow.latestRun;
  const isActive = workflow.hasActiveRun;
  const isSuccess = run.conclusion === 'success';
  const isFailed = run.conclusion === 'failure';

  // Calculate elapsed time
  const startTime = new Date(run.startedAt).getTime();
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div
      className={`
        border rounded-xl overflow-hidden transition-all duration-300
        ${isActive ? 'bg-surface-raised border-accent-primary/50 animate-pulse-slow' : ''}
        ${isSuccess ? 'bg-accent-success/5 border-accent-success/30' : ''}
        ${isFailed ? 'bg-accent-error/5 border-accent-error/30' : ''}
        ${!isActive && !isSuccess && !isFailed ? 'bg-surface-raised border-surface-border' : ''}
      `}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-overlay/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Status icon */}
          <div className={`
            w-8 h-8 rounded-lg flex items-center justify-center text-lg
            ${isActive ? 'bg-accent-primary/20' : ''}
            ${isSuccess ? 'bg-accent-success/20' : ''}
            ${isFailed ? 'bg-accent-error/20' : ''}
            ${!isActive && !isSuccess && !isFailed ? 'bg-surface-overlay' : ''}
          `}>
            {isActive && <span className="animate-spin">⚙️</span>}
            {isSuccess && '✓'}
            {isFailed && '✗'}
            {!isActive && !isSuccess && !isFailed && '•'}
          </div>

          <div className="text-left">
            <h3 className="font-medium text-text-primary text-sm">
              {run.name}
            </h3>
            <p className="text-xs text-text-muted">
              {isActive ? `Running for ${minutes}m ${seconds}s` : run.conclusion || 'Unknown'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          {isActive && (
            <span className="flex items-center gap-1.5 text-xs text-accent-primary">
              <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
              LIVE
            </span>
          )}

          {/* Expand/collapse */}
          <span className={`text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Jobs and steps */}
          {run.jobs && run.jobs.length > 0 && (
            <div className="space-y-2">
              {run.jobs.map((job, jobIndex) => (
                <div key={jobIndex} className="bg-surface rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <JobStatusIcon status={job.status} conclusion={job.conclusion} />
                    <span className="font-medium text-sm text-text-primary">{job.name}</span>
                  </div>

                  {/* Steps */}
                  <div className="space-y-1 ml-6">
                    {job.steps.map((step, stepIndex) => (
                      <div
                        key={stepIndex}
                        className="flex items-center gap-2 text-xs"
                      >
                        <StepStatusIcon status={step.status} conclusion={step.conclusion} />
                        <span className={`
                          ${step.status === 'completed' && step.conclusion === 'success' ? 'text-accent-success' : ''}
                          ${step.status === 'completed' && step.conclusion === 'skipped' ? 'text-text-secondary' : ''}
                          ${step.status === 'in_progress' ? 'text-accent-primary font-medium' : ''}
                          ${step.status === 'completed' && step.conclusion === 'failure' ? 'text-accent-error' : ''}
                          ${step.status === 'queued' ? 'text-text-secondary' : ''}
                          ${!step.status || (step.status === 'completed' && !step.conclusion) ? 'text-text-primary' : ''}
                        `}>
                          {step.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Link to GitHub */}
          <a
            href={run.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-accent-primary hover:text-accent-primary/80"
          >
            View in GitHub Actions →
          </a>
        </div>
      )}
    </div>
  );
}

function JobStatusIcon({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === 'completed') {
    if (conclusion === 'success') {
      return <span className="text-accent-success">✓</span>;
    }
    if (conclusion === 'failure') {
      return <span className="text-accent-error">✗</span>;
    }
    return <span className="text-text-muted">•</span>;
  }
  if (status === 'in_progress') {
    return <span className="text-accent-primary animate-spin">⚙</span>;
  }
  return <span className="text-text-muted">○</span>;
}

function StepStatusIcon({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === 'completed') {
    if (conclusion === 'success') {
      return <span className="text-accent-success text-[10px]">●</span>;
    }
    if (conclusion === 'failure') {
      return <span className="text-accent-error text-[10px]">●</span>;
    }
    if (conclusion === 'skipped') {
      return <span className="text-text-muted text-[10px]">○</span>;
    }
    return <span className="text-text-muted text-[10px]">●</span>;
  }
  if (status === 'in_progress') {
    return <span className="text-accent-primary text-[10px] animate-pulse">◉</span>;
  }
  return <span className="text-text-muted text-[10px]">○</span>;
}

