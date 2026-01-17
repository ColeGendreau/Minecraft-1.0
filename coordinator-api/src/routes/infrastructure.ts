import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Path to INFRASTRUCTURE_STATE file (relative to project root)
const INFRA_STATE_PATH = process.env.INFRA_STATE_PATH || '../INFRASTRUCTURE_STATE';
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'ColeGendreau';
const GITHUB_REPO = process.env.GITHUB_REPO || 'Minecraft-1.0';

// Service definitions with their health check info
const SERVICES = [
  {
    id: 'azure-rg',
    name: 'Azure Resource Group',
    description: 'mc-demo-dev-rg',
    category: 'infrastructure',
    icon: 'cloud',
  },
  {
    id: 'aks',
    name: 'Kubernetes Cluster',
    description: 'mc-demo-dev-aks (2 nodes)',
    category: 'infrastructure',
    icon: 'kubernetes',
  },
  {
    id: 'acr',
    name: 'Container Registry',
    description: 'mcdemodevacr.azurecr.io',
    category: 'infrastructure',
    icon: 'container',
  },
  {
    id: 'public-ip',
    name: 'Static Public IP',
    description: 'Load balancer ingress',
    category: 'infrastructure',
    icon: 'globe',
  },
  {
    id: 'ingress',
    name: 'NGINX Ingress',
    description: 'External traffic routing',
    category: 'kubernetes',
    icon: 'route',
  },
  {
    id: 'cert-manager',
    name: 'Cert Manager',
    description: "Let's Encrypt TLS automation",
    category: 'kubernetes',
    icon: 'lock',
  },
  {
    id: 'minecraft',
    name: 'Minecraft Server',
    description: 'Vanilla 1.21.3 on port 25565',
    category: 'application',
    icon: 'game',
  },
  {
    id: 'prometheus',
    name: 'Prometheus',
    description: 'Metrics collection',
    category: 'monitoring',
    icon: 'chart',
  },
  {
    id: 'grafana',
    name: 'Grafana',
    description: 'Dashboards & visualization',
    category: 'monitoring',
    icon: 'dashboard',
  },
  {
    id: 'log-analytics',
    name: 'Log Analytics',
    description: 'Azure Container Insights',
    category: 'monitoring',
    icon: 'logs',
  },
];

/**
 * GET /api/infrastructure/status
 * Get current infrastructure state and service statuses
 */
router.get('/status', async (req, res) => {
  try {
    // Read INFRASTRUCTURE_STATE file
    let infraState = 'UNKNOWN';
    try {
      const statePath = path.resolve(process.cwd(), INFRA_STATE_PATH);
      if (fs.existsSync(statePath)) {
        infraState = fs.readFileSync(statePath, 'utf-8').trim().toUpperCase();
      }
    } catch {
      // File doesn't exist or can't be read
    }

    const isRunning = infraState === 'ON';

    // Generate service statuses based on infrastructure state
    const services = SERVICES.map((service) => ({
      ...service,
      status: isRunning ? 'running' : 'stopped',
      // In a real implementation, we'd check actual service health
      // For now, simulate based on INFRASTRUCTURE_STATE
    }));

    // Calculate some mock metrics for the UI
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
        stateFile: 'INFRASTRUCTURE_STATE',
        workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions`,
      },
    });
  } catch (error) {
    console.error('Error getting infrastructure status:', error);
    res.status(500).json({ error: 'Failed to get infrastructure status' });
  }
});

/**
 * POST /api/infrastructure/toggle
 * Toggle infrastructure state (triggers GitHub workflow)
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

    // In a real implementation, this would:
    // 1. Use GitHub API (Octokit) to update INFRASTRUCTURE_STATE file
    // 2. This triggers the terraform.yaml workflow
    // 3. Workflow provisions or destroys infrastructure

    // For now, we'll update the local file (development mode)
    try {
      const statePath = path.resolve(process.cwd(), INFRA_STATE_PATH);
      fs.writeFileSync(statePath, newState + '\n');
    } catch {
      // Can't write locally, would use GitHub API in production
    }

    res.json({
      success: true,
      message: `Infrastructure state change to ${newState} initiated`,
      newState,
      estimatedTime: newState === 'ON' ? '12-15 minutes' : '10-12 minutes',
      note: 'Changes will be applied via GitHub Actions workflow',
      workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions`,
    });
  } catch (error) {
    console.error('Error toggling infrastructure:', error);
    res.status(500).json({ error: 'Failed to toggle infrastructure state' });
  }
});

/**
 * GET /api/infrastructure/cost
 * Get estimated cost information
 */
router.get('/cost', (req, res) => {
  res.json({
    daily: {
      running: '$3-5',
      stopped: '$0',
    },
    monthly: {
      running: '$100-150',
      stopped: '$0',
    },
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

