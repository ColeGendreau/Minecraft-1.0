import { Router } from 'express';

const router = Router();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'ColeGendreau';
const GITHUB_REPO = process.env.GITHUB_REPO || 'Minecraft-1.0';
const GITHUB_API = 'https://api.github.com';

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  run_started_at: string;
}

interface WorkflowJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string;
  completed_at: string | null;
  steps: WorkflowStep[];
}

interface WorkflowStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
  started_at: string | null;
  completed_at: string | null;
}

async function githubFetch(endpoint: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'WorldForge-Dashboard',
  };

  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  return fetch(`${GITHUB_API}${endpoint}`, { headers });
}

/**
 * GET /api/workflows/runs
 * Get recent workflow runs
 */
router.get('/runs', async (req, res) => {
  try {
    const workflow = req.query.workflow as string || 'terraform.yaml';
    const limit = parseInt(req.query.limit as string) || 5;

    const response = await githubFetch(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${workflow}/runs?per_page=${limit}`
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('GitHub API error:', error);
      res.status(response.status).json({ 
        error: 'Failed to fetch workflow runs',
        details: response.status === 401 ? 'GitHub token required' : error 
      });
      return;
    }

    const data = await response.json() as { workflow_runs: WorkflowRun[] };

    const runs = data.workflow_runs.map((run: WorkflowRun) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      url: run.html_url,
      startedAt: run.run_started_at,
      duration: run.status === 'completed' 
        ? Math.round((new Date(run.updated_at).getTime() - new Date(run.run_started_at).getTime()) / 1000)
        : null,
    }));

    res.json({ runs });
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    res.status(500).json({ error: 'Failed to fetch workflow runs' });
  }
});

/**
 * GET /api/workflows/runs/:runId
 * Get details of a specific workflow run including jobs and steps
 */
router.get('/runs/:runId', async (req, res) => {
  try {
    const { runId } = req.params;

    // Fetch jobs for this run
    const response = await githubFetch(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${runId}/jobs`
    );

    if (!response.ok) {
      res.status(response.status).json({ error: 'Failed to fetch workflow run details' });
      return;
    }

    const data = await response.json() as { jobs: WorkflowJob[] };

    const jobs = data.jobs.map((job: WorkflowJob) => ({
      id: job.id,
      name: job.name,
      status: job.status,
      conclusion: job.conclusion,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      steps: job.steps.map((step: WorkflowStep) => ({
        number: step.number,
        name: step.name,
        status: step.status,
        conclusion: step.conclusion,
        startedAt: step.started_at,
        completedAt: step.completed_at,
      })),
    }));

    res.json({ runId, jobs });
  } catch (error) {
    console.error('Error fetching workflow run details:', error);
    res.status(500).json({ error: 'Failed to fetch workflow run details' });
  }
});

/**
 * GET /api/workflows/runs/:runId/logs
 * Get logs for a workflow run (simplified - returns log download URL)
 */
router.get('/runs/:runId/logs', async (req, res) => {
  try {
    const { runId } = req.params;

    // GitHub doesn't provide real-time logs via API easily
    // Instead, we return the URL to view logs
    res.json({
      runId,
      logsUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${runId}`,
      note: 'View full logs in GitHub Actions',
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

/**
 * GET /api/workflows/latest
 * Get the latest infrastructure workflow status
 */
router.get('/latest', async (req, res) => {
  try {
    // Fetch latest terraform workflow run
    const response = await githubFetch(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/terraform.yaml/runs?per_page=1`
    );

    if (!response.ok) {
      // If we can't reach GitHub, return mock data
      res.json({
        hasActiveRun: false,
        latestRun: null,
        message: 'Unable to fetch workflow status',
      });
      return;
    }

    const data = await response.json() as { workflow_runs: WorkflowRun[] };

    if (data.workflow_runs.length === 0) {
      res.json({
        hasActiveRun: false,
        latestRun: null,
      });
      return;
    }

    const run = data.workflow_runs[0];
    const isActive = ['queued', 'in_progress', 'waiting'].includes(run.status);

    // If active, fetch jobs for detailed progress
    let jobs: Array<{
      name: string;
      status: string;
      conclusion: string | null;
      steps: Array<{ name: string; status: string; conclusion: string | null }>;
    }> = [];

    if (isActive) {
      const jobsResponse = await githubFetch(
        `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${run.id}/jobs`
      );

      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json() as { jobs: WorkflowJob[] };
        jobs = jobsData.jobs.map((job: WorkflowJob) => ({
          name: job.name,
          status: job.status,
          conclusion: job.conclusion,
          steps: job.steps.map((step: WorkflowStep) => ({
            name: step.name,
            status: step.status,
            conclusion: step.conclusion,
          })),
        }));
      }
    }

    res.json({
      hasActiveRun: isActive,
      latestRun: {
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        url: run.html_url,
        startedAt: run.run_started_at,
        updatedAt: run.updated_at,
        jobs: isActive ? jobs : undefined,
      },
    });
  } catch (error) {
    console.error('Error fetching latest workflow:', error);
    res.json({
      hasActiveRun: false,
      latestRun: null,
      error: 'Failed to fetch workflow status',
    });
  }
});

/**
 * POST /api/workflows/trigger
 * Manually trigger a workflow (requires GITHUB_TOKEN with workflow scope)
 */
router.post('/trigger', async (req, res) => {
  try {
    const { workflow, inputs } = req.body;
    const workflowFile = workflow || 'terraform.yaml';

    if (!GITHUB_TOKEN) {
      res.status(400).json({ 
        error: 'GitHub token not configured',
        note: 'Use the INFRASTRUCTURE_STATE file method instead',
      });
      return;
    }

    const response = await fetch(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${workflowFile}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: inputs || {},
        }),
      }
    );

    if (response.status === 204) {
      res.json({ 
        success: true, 
        message: 'Workflow triggered successfully',
        workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${workflowFile}`,
      });
    } else {
      const error = await response.text();
      res.status(response.status).json({ error: 'Failed to trigger workflow', details: error });
    }
  } catch (error) {
    console.error('Error triggering workflow:', error);
    res.status(500).json({ error: 'Failed to trigger workflow' });
  }
});

export default router;


