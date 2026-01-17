import { Router } from 'express';
import { Octokit } from '@octokit/rest';

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
 * GET /api/infrastructure/status
 */
router.get('/status', async (req, res) => {
  try {
    const { state: infraState } = await getInfrastructureState();
    const isRunning = infraState === 'ON';

    const services = SERVICES.map((service) => ({
      ...service,
      status: isRunning ? 'running' : 'stopped',
    }));

    const metrics = isRunning
      ? {
          nodes: 2,
          pods: 12,
          cpuUsage: Math.floor(Math.random() * 30) + 20,
          memoryUsage: Math.floor(Math.random() * 40) + 30,
          publicIp: process.env.PUBLIC_IP || '57.154.70.117',
          grafanaUrl: `https://grafana.${process.env.PUBLIC_IP || '57.154.70.117'}.nip.io`,
          minecraftAddress: `${process.env.PUBLIC_IP || '57.154.70.117'}:25565`,
        }
      : null;

    res.json({
      state: infraState,
      isRunning,
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

    // Get current state and SHA (needed for update)
    const { state: currentState, sha } = await getInfrastructureState();

    if (currentState === newState) {
      res.json({
        success: true,
        message: `Infrastructure is already ${newState}`,
        newState,
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
 */
router.get('/cost', (req, res) => {
  res.json({
    daily: { running: '$3-5', stopped: '$0' },
    monthly: { running: '$100-150', stopped: '$0' },
    breakdown: [
      { service: 'AKS Cluster (2 nodes)', daily: '$3.50' },
      { service: 'Container Registry', daily: '$0.16' },
      { service: 'Log Analytics', daily: '$0.10-0.50' },
      { service: 'Static Public IP', daily: '$0.10' },
    ],
    note: 'Infrastructure can be destroyed and rebuilt in ~10 minutes',
  });
});

export default router;
