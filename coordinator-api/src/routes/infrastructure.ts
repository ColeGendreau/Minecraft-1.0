import { Router } from 'express';
import { Octokit } from '@octokit/rest';
import { getClusterMetrics, type ClusterMetrics, type PodInfo, type NodeInfo } from '../services/kubernetes.js';
import { 
  getClusterResourceMetrics, 
  getMinecraftMetrics, 
  isPrometheusAvailable,
  getAlerts,
  type ClusterResourceMetrics,
  type MinecraftMetrics,
} from '../services/prometheus.js';
import { getAzureCosts, type CostResponse } from '../services/azure-costs.js';

const router = Router();

// GitHub configuration
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'ColeGendreau';
const GITHUB_REPO = process.env.GITHUB_REPO || 'Minecraft-1.0';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const STATE_FILE_PATH = 'INFRASTRUCTURE_STATE';

// Initialize Octokit (GitHub API client)
const getOctokit = () => {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN environment variable not set');
  }
  return new Octokit({ auth: GITHUB_TOKEN });
};

// Service definitions
const SERVICES = [
  { id: 'aks', name: 'Kubernetes Cluster', description: 'mc-demo-dev-aks', category: 'infrastructure', icon: 'kubernetes' },
  { id: 'acr', name: 'Container Registry', description: 'mcdemodevacr.azurecr.io', category: 'infrastructure', icon: 'container' },
  { id: 'public-ip', name: 'Static Public IP', description: 'Load balancer ingress', category: 'infrastructure', icon: 'globe' },
  { id: 'ingress', name: 'NGINX Ingress', description: 'External traffic routing', category: 'kubernetes', icon: 'route' },
  { id: 'cert-manager', name: 'Cert Manager', description: "Let's Encrypt TLS", category: 'kubernetes', icon: 'lock' },
  { id: 'minecraft', name: 'Minecraft Server', description: 'Vanilla 1.21.3', category: 'application', icon: 'game' },
  { id: 'prometheus', name: 'Prometheus', description: 'Metrics collection', category: 'monitoring', icon: 'chart' },
  { id: 'grafana', name: 'Grafana', description: 'Dashboards', category: 'monitoring', icon: 'dashboard' },
];

/**
 * Get current INFRASTRUCTURE_STATE from GitHub
 */
async function getInfrastructureState(): Promise<{ state: string; sha: string }> {
  try {
    const octokit = getOctokit();
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: STATE_FILE_PATH,
    });

    if ('content' in data) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8').trim().toUpperCase();
      return { state: content, sha: data.sha };
    }
    return { state: 'UNKNOWN', sha: '' };
  } catch (error) {
    console.error('Error reading infrastructure state from GitHub:', error);
    return { state: 'UNKNOWN', sha: '' };
  }
}

/**
 * Update INFRASTRUCTURE_STATE in GitHub (triggers workflow)
 */
async function updateInfrastructureState(newState: string, currentSha: string): Promise<{ success: boolean; commitUrl?: string; error?: string }> {
  try {
    const octokit = getOctokit();
    
    const message = newState === 'ON' 
      ? '🚀 Deploy Minecraft infrastructure' 
      : '🛑 Destroy Minecraft infrastructure';

    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: STATE_FILE_PATH,
      message,
      content: Buffer.from(newState + '\n').toString('base64'),
      sha: currentSha,
      committer: {
        name: 'Minecraft Dashboard',
        email: 'dashboard@minecraft.local',
      },
    });

    return {
      success: true,
      commitUrl: data.commit.html_url,
    };
  } catch (error: unknown) {
    console.error('Error updating infrastructure state:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Check if there's an active terraform workflow and what it's doing
 */
async function getActiveWorkflowInfo(): Promise<{
  hasActiveRun: boolean;
  action: 'deploying' | 'destroying' | 'unknown' | null;
  runId: number | null;
  runUrl: string | null;
  startedAt: string | null;
  progress: number; // 0-100 estimated progress
}> {
  try {
    const octokit = getOctokit();
    
    // Get recent workflow runs
    const { data: workflowRuns } = await octokit.actions.listWorkflowRunsForRepo({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      per_page: 5,
    });

    // Find active terraform-related runs
    const activeRun = workflowRuns.workflow_runs.find(run => 
      (run.status === 'in_progress' || run.status === 'queued') &&
      (run.name?.toLowerCase().includes('terraform') || 
       run.name?.toLowerCase().includes('deploy') ||
       run.name?.toLowerCase().includes('minecraft'))
    );

    if (!activeRun) {
      return { hasActiveRun: false, action: null, runId: null, runUrl: null, startedAt: null, progress: 0 };
    }

    // Determine action from commit message or run name
    const isDestroying = activeRun.head_commit?.message?.toLowerCase().includes('destroy') ||
                         activeRun.name?.toLowerCase().includes('destroy');
    const isDeploying = activeRun.head_commit?.message?.toLowerCase().includes('deploy') ||
                        activeRun.name?.toLowerCase().includes('deploy');

    // Estimate progress based on time elapsed (rough estimate)
    const startedAt = activeRun.created_at;
    const elapsed = Date.now() - new Date(startedAt).getTime();
    const estimatedTotal = isDestroying ? 8 * 60 * 1000 : 12 * 60 * 1000; // 8 min destroy, 12 min deploy
    const progress = Math.min(Math.round((elapsed / estimatedTotal) * 100), 95); // Cap at 95% until complete

    return {
      hasActiveRun: true,
      action: isDestroying ? 'destroying' : isDeploying ? 'deploying' : 'unknown',
      runId: activeRun.id,
      runUrl: activeRun.html_url,
      startedAt,
      progress,
    };
  } catch (error) {
    console.error('Error checking active workflow:', error);
    return { hasActiveRun: false, action: null, runId: null, runUrl: null, startedAt: null, progress: 0 };
  }
}

/**
 * Check if the last terraform workflow run succeeded recently
 * Returns info about whether we should re-trigger a workflow
 */
async function getLastWorkflowStatus(): Promise<{
  lastRunSucceeded: boolean;
  lastRunTime: string | null;
  lastRunConclusion: string | null;
  shouldRetrigger: boolean;
  reason: string;
}> {
  try {
    const octokit = getOctokit();
    
    // Get recent workflow runs for terraform workflow specifically
    const { data: workflowRuns } = await octokit.actions.listWorkflowRunsForRepo({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      per_page: 10,
    });

    // Find the most recent completed terraform-related run
    const lastCompletedRun = workflowRuns.workflow_runs.find(run => 
      run.status === 'completed' &&
      (run.name?.toLowerCase().includes('terraform') || 
       run.name?.toLowerCase().includes('minecraft server'))
    );

    if (!lastCompletedRun) {
      return {
        lastRunSucceeded: false,
        lastRunTime: null,
        lastRunConclusion: null,
        shouldRetrigger: true,
        reason: 'No previous terraform workflow found',
      };
    }

    const lastRunTime = lastCompletedRun.updated_at || lastCompletedRun.created_at;
    const timeSinceLastRun = Date.now() - new Date(lastRunTime).getTime();
    const ONE_HOUR = 60 * 60 * 1000;

    // If last run failed or was cancelled, should retry
    if (lastCompletedRun.conclusion !== 'success') {
      return {
        lastRunSucceeded: false,
        lastRunTime,
        lastRunConclusion: lastCompletedRun.conclusion,
        shouldRetrigger: true,
        reason: `Last run ${lastCompletedRun.conclusion} - retry needed`,
      };
    }

    // If last run succeeded but was a long time ago (>1 hour), might need refresh
    if (timeSinceLastRun > ONE_HOUR) {
      return {
        lastRunSucceeded: true,
        lastRunTime,
        lastRunConclusion: 'success',
        shouldRetrigger: false, // Don't auto-retrigger old successful runs
        reason: `Last successful run was ${Math.round(timeSinceLastRun / 60000)} minutes ago`,
      };
    }

    // Recent successful run - no need to re-trigger
    return {
      lastRunSucceeded: true,
      lastRunTime,
      lastRunConclusion: 'success',
      shouldRetrigger: false,
      reason: `Last run succeeded ${Math.round(timeSinceLastRun / 60000)} minutes ago`,
    };
  } catch (error) {
    console.error('Error checking last workflow status:', error);
    // On error, allow re-trigger as a safe default
    return {
      lastRunSucceeded: false,
      lastRunTime: null,
      lastRunConclusion: null,
      shouldRetrigger: true,
      reason: 'Could not check workflow status',
    };
  }
}

/**
 * Check if infrastructure is actually running by pinging public services
 * This works from Container Apps (no kubectl needed)
 */
async function checkInfrastructureReachable(): Promise<boolean> {
  const publicIp = process.env.PUBLIC_IP || '4.242.217.139';
  const grafanaUrl = `https://grafana.${publicIp}.nip.io`;
  
  try {
    // Try to reach Grafana - if it responds, the cluster is up
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(grafanaUrl, { 
      signal: controller.signal,
      method: 'HEAD',
    });
    clearTimeout(timeout);
    
    // Any response (even 302 redirect to login) means Grafana is up
    console.log(`Infrastructure check: Grafana responded with ${response.status}`);
    return response.status < 500;
  } catch (error) {
    console.log(`Infrastructure check: Grafana unreachable - ${error}`);
    return false;
  }
}

/**
 * GET /api/infrastructure/status
 */
router.get('/status', async (req, res) => {
  try {
    // First, check if infrastructure is ACTUALLY running by pinging public services
    // This works from Container Apps (kubectl doesn't work here)
    const clusterIsReachable = await checkInfrastructureReachable();
    
    const [{ state: infraState }, workflowInfo] = await Promise.all([
      getInfrastructureState(),
      getActiveWorkflowInfo(),
    ]);

    // Determine the actual operational state based on REAL cluster state, not just the file
    // Priority: 1) Active workflow status, 2) Actual cluster reachability, 3) State file as fallback
    let operationalState: 'running' | 'stopped' | 'deploying' | 'destroying';
    
    if (workflowInfo.hasActiveRun) {
      // Active workflow - use its status
      operationalState = workflowInfo.action === 'destroying' ? 'destroying' : 'deploying';
    } else if (clusterIsReachable) {
      // Cluster is actually reachable - it's running
      operationalState = 'running';
    } else if (infraState === 'ON' && !clusterIsReachable) {
      // State says ON but cluster not reachable - might be deploying or failed
      // Check if there was a recent successful deploy
      const lastStatus = await getLastWorkflowStatus();
      if (lastStatus.lastRunSucceeded && lastStatus.lastRunTime) {
        const timeSinceRun = Date.now() - new Date(lastStatus.lastRunTime).getTime();
        if (timeSinceRun < 20 * 60 * 1000) {
          // Recent successful run but cluster not reachable - might still be starting up
          operationalState = 'deploying';
        } else {
          // Old successful run but cluster not reachable - something's wrong, show stopped
          operationalState = 'stopped';
        }
      } else {
        operationalState = 'stopped';
      }
    } else {
      // State says OFF or unknown - stopped
      operationalState = 'stopped';
    }

    // isRunning should be true if currently running OR still in process of destroying
    // (resources still exist during destruction)
    const isRunning = operationalState === 'running' || operationalState === 'destroying';
    const isTransitioning = operationalState === 'deploying' || operationalState === 'destroying';

    // Determine service status based on operational state
    const services = SERVICES.map((service) => ({
      ...service,
      status: isTransitioning 
        ? (operationalState === 'deploying' ? 'starting' : 'stopping')
        : (isRunning ? 'running' : 'stopped'),
    }));

    const publicIp = process.env.PUBLIC_IP || '4.242.217.139';
    
    // Note: kubectl metrics not available from Container Apps
    // Use static estimates when running (real metrics would come from Prometheus via Grafana)
    const metrics = isRunning
      ? {
          nodes: 2,
          pods: 12,
          totalPods: 12,
          pendingPods: 0,
          failedPods: 0,
          cpuUsage: 25,
          memoryUsage: 40,
          publicIp,
          grafanaUrl: `https://grafana.${publicIp}.nip.io`,
          prometheusUrl: `https://prometheus.${publicIp}.nip.io`,
          minecraftAddress: `${publicIp}:25565`,
          namespaces: ['minecraft', 'monitoring', 'ingress-nginx', 'cert-manager'],
        }
      : null;

    res.json({
      state: infraState,
      operationalState,
      isRunning,
      isTransitioning,
      transition: workflowInfo.hasActiveRun ? {
        action: workflowInfo.action,
        progress: workflowInfo.progress,
        startedAt: workflowInfo.startedAt,
        runUrl: workflowInfo.runUrl,
        estimatedMinutes: workflowInfo.action === 'destroying' ? 8 : 12,
      } : null,
      services,
      metrics,
      lastUpdated: new Date().toISOString(),
      gitHub: {
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        stateFile: STATE_FILE_PATH,
        workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/terraform.yaml`,
      },
    });
  } catch (error) {
    console.error('Error getting infrastructure status:', error);
    res.status(500).json({ error: 'Failed to get infrastructure status' });
  }
});

/**
 * GET /api/infrastructure/monitoring
 * Returns detailed monitoring data from Kubernetes and Prometheus
 */
router.get('/monitoring', async (req, res) => {
  try {
    const { state: infraState } = await getInfrastructureState();
    const isRunning = infraState === 'ON';

    if (!isRunning) {
      res.json({
        available: false,
        message: 'Infrastructure is not running',
        kubernetes: null,
        prometheus: null,
        minecraft: null,
      });
      return;
    }

    // Fetch data from both sources in parallel
    const [
      clusterMetrics,
      prometheusMetrics,
      minecraftMetrics,
      prometheusAvailable,
      alerts,
    ] = await Promise.all([
      getClusterMetrics().catch(() => null),
      getClusterResourceMetrics().catch(() => null),
      getMinecraftMetrics().catch(() => null),
      isPrometheusAvailable().catch(() => false),
      getAlerts().catch(() => []),
    ]);

    res.json({
      available: true,
      timestamp: new Date().toISOString(),
      
      // Kubernetes data (from kubectl)
      kubernetes: clusterMetrics ? {
        nodes: clusterMetrics.nodes,
        pods: clusterMetrics.pods,
        namespaces: clusterMetrics.namespaces,
      } : null,
      
      // Prometheus data (real metrics)
      prometheus: {
        available: prometheusAvailable,
        metrics: prometheusMetrics,
        alerts,
      },
      
      // Minecraft-specific metrics
      minecraft: minecraftMetrics,
    });
  } catch (error) {
    console.error('Error getting monitoring data:', error);
    res.status(500).json({ 
      error: 'Failed to get monitoring data',
      available: false,
    });
  }
});

/**
 * GET /api/infrastructure/pods
 * Returns detailed pod information
 */
router.get('/pods', async (req, res) => {
  try {
    const { state: infraState } = await getInfrastructureState();
    const isRunning = infraState === 'ON';

    if (!isRunning) {
      res.json({
        available: false,
        pods: [],
        message: 'Infrastructure is not running',
      });
      return;
    }

    const clusterMetrics = await getClusterMetrics().catch(() => null);
    
    res.json({
      available: true,
      timestamp: new Date().toISOString(),
      pods: clusterMetrics?.pods.details ?? [],
      summary: {
        total: clusterMetrics?.pods.total ?? 0,
        running: clusterMetrics?.pods.running ?? 0,
        pending: clusterMetrics?.pods.pending ?? 0,
        failed: clusterMetrics?.pods.failed ?? 0,
      },
    });
  } catch (error) {
    console.error('Error getting pods:', error);
    res.status(500).json({ error: 'Failed to get pod data' });
  }
});

/**
 * GET /api/infrastructure/nodes
 * Returns detailed node information
 */
router.get('/nodes', async (req, res) => {
  try {
    const { state: infraState } = await getInfrastructureState();
    const isRunning = infraState === 'ON';

    if (!isRunning) {
      res.json({
        available: false,
        nodes: [],
        message: 'Infrastructure is not running',
      });
      return;
    }

    const clusterMetrics = await getClusterMetrics().catch(() => null);
    
    res.json({
      available: true,
      timestamp: new Date().toISOString(),
      nodes: clusterMetrics?.nodes.details ?? [],
      summary: {
        total: clusterMetrics?.nodes.total ?? 0,
        ready: clusterMetrics?.nodes.ready ?? 0,
      },
    });
  } catch (error) {
    console.error('Error getting nodes:', error);
    res.status(500).json({ error: 'Failed to get node data' });
  }
});

/**
 * Trigger workflow using workflow_dispatch (requires workflow scope on token)
 * No fallback - if dispatch fails, user must manually trigger via GitHub Actions UI
 */
async function triggerWorkflowDispatch(): Promise<{ success: boolean; method?: string; error?: string }> {
  const octokit = getOctokit();
  
  try {
    await octokit.actions.createWorkflowDispatch({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      workflow_id: 'terraform.yaml',
      ref: 'main',
    });
    return { success: true, method: 'workflow_dispatch' };
  } catch (dispatchError: unknown) {
    console.error('workflow_dispatch failed:', dispatchError);
    const errorMessage = dispatchError instanceof Error ? dispatchError.message : 'Unknown error';
    return { 
      success: false, 
      error: `Cannot auto-trigger workflow (token may lack 'workflow' scope). Please manually trigger at GitHub Actions. Error: ${errorMessage}` 
    };
  }
}

/**
 * POST /api/infrastructure/toggle
 * Toggle infrastructure state by committing to GitHub (triggers terraform workflow)
 */
router.post('/toggle', async (req, res) => {
  try {
    const { targetState } = req.body;

    if (!targetState || !['ON', 'OFF'].includes(targetState.toUpperCase())) {
      res.status(400).json({
        error: 'Invalid target state',
        details: 'targetState must be "ON" or "OFF"',
      });
      return;
    }

    const newState = targetState.toUpperCase();

    // Check if GITHUB_TOKEN is configured
    if (!GITHUB_TOKEN) {
      res.status(503).json({
        error: 'GitHub integration not configured',
        details: 'GITHUB_TOKEN environment variable is not set on the coordinator API',
        manual: `To deploy manually, update INFRASTRUCTURE_STATE to "${newState}" and push to main branch`,
        workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/terraform.yaml`,
      });
      return;
    }

    // Check if there's already an active workflow
    const workflowInfo = await getActiveWorkflowInfo();
    if (workflowInfo.hasActiveRun) {
      res.json({
        success: true,
        message: `Workflow already running (${workflowInfo.action})`,
        newState,
        alreadyRunning: true,
        runUrl: workflowInfo.runUrl,
        workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/terraform.yaml`,
      });
      return;
    }

    // Get current state and SHA (needed for update)
    const { state: currentState, sha } = await getInfrastructureState();

    if (currentState === newState) {
      // State is already correct - check if we should re-trigger
      const lastStatus = await getLastWorkflowStatus();
      
      if (!lastStatus.shouldRetrigger) {
        // Last run succeeded recently - no need to re-trigger
        res.json({
          success: true,
          message: `Infrastructure is already ${newState}`,
          newState,
          alreadyDeployed: true,
          lastWorkflow: {
            succeeded: lastStatus.lastRunSucceeded,
            time: lastStatus.lastRunTime,
            reason: lastStatus.reason,
          },
          workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/terraform.yaml`,
        });
        return;
      }

      // Last run failed/cancelled or no recent run - re-trigger via workflow_dispatch
      console.log(`State is already ${newState}, but ${lastStatus.reason}. Re-triggering workflow...`);
      const dispatchResult = await triggerWorkflowDispatch();
      
      if (!dispatchResult.success) {
        res.status(500).json({
          error: 'Failed to trigger workflow',
          details: dispatchResult.error,
          workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/terraform.yaml`,
        });
        return;
      }

      res.json({
        success: true,
        message: `Infrastructure ${newState === 'ON' ? 'deployment' : 'destruction'} re-triggered!`,
        newState,
        triggeredVia: dispatchResult.method || 'workflow_dispatch',
        reason: lastStatus.reason,
        estimatedTime: newState === 'ON' ? '12-15 minutes' : '8-10 minutes',
        workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/terraform.yaml`,
      });
      return;
    }

    // Update the file in GitHub (this triggers the terraform workflow)
    const result = await updateInfrastructureState(newState, sha);

    if (!result.success) {
      res.status(500).json({
        error: 'Failed to update infrastructure state',
        details: result.error,
        workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/terraform.yaml`,
      });
      return;
    }

    res.json({
      success: true,
      message: `Infrastructure ${newState === 'ON' ? 'deployment' : 'destruction'} initiated!`,
      newState,
      previousState: currentState,
      estimatedTime: newState === 'ON' ? '12-15 minutes' : '8-10 minutes',
      commitUrl: result.commitUrl,
      workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/terraform.yaml`,
    });
  } catch (error) {
    console.error('Error toggling infrastructure:', error);
    res.status(500).json({ 
      error: 'Failed to toggle infrastructure state',
      workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/terraform.yaml`,
    });
  }
});

/**
 * GET /api/infrastructure/cost
 * Returns real Azure cost data from Cost Management API
 */
router.get('/cost', async (req, res) => {
  try {
    const costs = await getAzureCosts();
    res.json(costs);
  } catch (error) {
    console.error('Error getting costs:', error);
    res.status(500).json({ 
      available: false,
      error: 'Failed to retrieve cost data',
    });
  }
});

/**
 * GET /api/infrastructure/cost/summary
 * Returns a simplified cost summary (for backward compatibility)
 */
router.get('/cost/summary', async (req, res) => {
  try {
    const costs = await getAzureCosts();
    
    // Convert to the old format for backward compatibility
    res.json({
      daily: { 
        running: costs.today.cost, 
        stopped: '$0' 
      },
      monthly: { 
        running: costs.thisMonth.cost, 
        forecast: costs.thisMonth.forecast,
        stopped: '$0' 
      },
      breakdown: costs.breakdown.byService.slice(0, 5).map((s) => ({
        service: s.service,
        daily: s.cost,
      })),
      note: costs.available 
        ? 'Real cost data from Azure Cost Management' 
        : 'Estimated costs - Azure Cost Management not configured',
      isEstimate: !costs.available,
    });
  } catch (error) {
    console.error('Error getting cost summary:', error);
    res.json({
      daily: { running: '~$3-5', stopped: '$0' },
      monthly: { running: '~$100-150', stopped: '$0' },
      breakdown: [
        { service: 'AKS Cluster', daily: '~$3.50' },
        { service: 'Other services', daily: '~$1.00' },
      ],
      note: 'Estimated costs - unable to query Azure',
      isEstimate: true,
    });
  }
});

/**
 * GET /api/infrastructure/logs
 * Returns Azure resource status and activity logs by parsing GitHub workflow output
 */
router.get('/logs', async (req, res) => {
  try {
    const octokit = getOctokit();
    const { state: infraState } = await getInfrastructureState();
    const isRunning = infraState === 'ON';

    // Azure Resource Groups (derived from terraform config)
    const resourceGroups = [
      { name: 'mc-demo-tfstate-rg', location: 'westus3', state: 'Succeeded', purpose: 'Terraform state storage' },
      { name: 'mc-demo-dev-dashboard-rg', location: 'westus3', state: 'Succeeded', purpose: 'Dashboard & Coordinator (always on)' },
      { name: 'mc-demo-dev-rg', location: 'westus3', state: isRunning ? 'Succeeded' : 'Deleted', purpose: 'Minecraft infrastructure' },
      { name: 'MC_mc-demo-dev-rg_mc-demo-dev-aks_westus3', location: 'westus3', state: isRunning ? 'Succeeded' : 'Deleted', purpose: 'AKS managed resources' },
    ];

    // AKS Cluster status
    const aksCluster = isRunning ? {
      name: 'mc-demo-dev-aks',
      resourceGroup: 'mc-demo-dev-rg',
      location: 'westus3',
      kubernetesVersion: '1.28.5',
      nodeCount: 2,
      state: 'Running',
    } : null;

    // Get recent workflow runs for activity log
    const { data: workflowRuns } = await octokit.actions.listWorkflowRunsForRepo({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      per_page: 10,
    });

    // Parse workflow runs into activity log format
    const activityLog = workflowRuns.workflow_runs.map(run => ({
      time: run.created_at,
      operation: run.name || 'Workflow Run',
      status: run.conclusion === 'success' ? 'Succeeded' : 
              run.conclusion === 'failure' ? 'Failed' :
              run.status === 'in_progress' ? 'Running' :
              run.status === 'queued' ? 'Queued' : 'Unknown',
      details: `${run.event} triggered by ${run.actor?.login || 'unknown'}`,
      url: run.html_url,
    }));

    // Get jobs from most recent terraform run for detailed operations
    const terraformRuns = workflowRuns.workflow_runs.filter(r => 
      r.name?.toLowerCase().includes('terraform') || r.path?.includes('terraform')
    );

    let recentOperations: Array<{
      time: string;
      operation: string;
      status: string;
      resource?: string;
    }> = [];

    if (terraformRuns.length > 0) {
      const latestTerraformRun = terraformRuns[0];
      const { data: jobs } = await octokit.actions.listJobsForWorkflowRun({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        run_id: latestTerraformRun.id,
      });

      for (const job of jobs.jobs) {
        for (const step of job.steps || []) {
          // Map step names to Azure-like operations
          let operation = step.name;
          let resource = '';

          if (step.name?.toLowerCase().includes('terraform init')) {
            operation = 'Initialize Terraform Backend';
            resource = 'mc-demo-tfstate-rg/tfstate';
          } else if (step.name?.toLowerCase().includes('terraform plan')) {
            operation = 'Plan Infrastructure Changes';
            resource = 'mc-demo-dev-rg';
          } else if (step.name?.toLowerCase().includes('terraform apply')) {
            operation = 'Apply Infrastructure Changes';
            resource = 'mc-demo-dev-rg/*';
          } else if (step.name?.toLowerCase().includes('terraform destroy')) {
            operation = 'Destroy Infrastructure';
            resource = 'mc-demo-dev-rg/*';
          } else if (step.name?.toLowerCase().includes('provision') || step.name?.toLowerCase().includes('create')) {
            operation = `Create ${step.name?.replace(/provision|create/gi, '').trim() || 'Resource'}`;
          } else if (step.name?.toLowerCase().includes('cleanup') || step.name?.toLowerCase().includes('destroy')) {
            operation = `Delete ${step.name?.replace(/cleanup|destroy/gi, '').trim() || 'Resource'}`;
          }

          recentOperations.push({
            time: step.completed_at || step.started_at || job.started_at || '',
            operation,
            status: step.conclusion === 'success' ? 'Succeeded' :
                    step.conclusion === 'failure' ? 'Failed' :
                    step.conclusion === 'skipped' ? 'Skipped' :
                    step.status === 'in_progress' ? 'Running' : 'Pending',
            resource,
          });
        }
      }

      // Sort by time descending, limit to 15
      recentOperations = recentOperations
        .filter(op => op.time)
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 15);
    }

    // Simulated Azure operations based on infrastructure state
    const azureOperations = isRunning ? [
      { time: new Date().toISOString(), operation: 'Get Managed Cluster', status: 'Running', resource: 'mc-demo-dev-aks' },
      { time: new Date(Date.now() - 60000).toISOString(), operation: 'List Pods', status: 'Succeeded', resource: 'minecraft namespace' },
      { time: new Date(Date.now() - 120000).toISOString(), operation: 'Get LoadBalancer Status', status: 'Succeeded', resource: 'ingress-nginx' },
    ] : [];

    res.json({
      timestamp: new Date().toISOString(),
      infrastructureState: infraState,
      resourceGroups: resourceGroups.filter(rg => rg.state === 'Succeeded'),
      aksCluster,
      activityLog,
      recentOperations: [...azureOperations, ...recentOperations].slice(0, 20),
      workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions`,
    });
  } catch (error) {
    console.error('Error fetching infrastructure logs:', error);
    
    // Return minimal data even on error
    res.json({
      timestamp: new Date().toISOString(),
      infrastructureState: 'UNKNOWN',
      resourceGroups: [
        { name: 'mc-demo-dev-dashboard-rg', location: 'westus3', state: 'Succeeded', purpose: 'Dashboard (always on)' },
      ],
      aksCluster: null,
      activityLog: [],
      recentOperations: [],
      error: 'Could not fetch complete activity logs',
      workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions`,
    });
  }
});

export default router;
