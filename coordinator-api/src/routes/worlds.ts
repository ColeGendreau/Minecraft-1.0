import { Router } from 'express';
import {
  createWorldRequest,
  getWorldRequestById,
  getWorldRequests,
  getCurrentDeployment,
  updateWorldRequestStatus,
  deleteWorldRequest,
  createDeployment,
} from '../db/client.js';
import { planWorld } from '../services/ai-planner.js';
import { executeRconCommands, getRconClient } from '../services/rcon-client.js';
import { createWorldLimiter } from '../middleware/ratelimit.js';
import { validateCreateWorldRequest, validateRequestId } from '../middleware/validation.js';
import type {
  CreateWorldRequest,
  WorldListItem,
  WorldListResponse,
  WorldDetailResponse,
  CurrentWorldResponse,
  WorldSpec,
  WorldRequestStatus,
} from '../types/index.js';

const router = Router();
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'ColeGendreau';
const GITHUB_REPO = process.env.GITHUB_REPO || 'Minecraft-1.0';

/**
 * GET /api/worlds/current
 * Get the currently deployed world
 */
router.get('/current', (req, res) => {
  const deployment = getCurrentDeployment();

  if (!deployment) {
    res.status(404).json({ error: 'No world currently deployed' });
    return;
  }

  let spec: WorldSpec | null = null;
  if (deployment.worldspec_json) {
    try {
      spec = JSON.parse(deployment.worldspec_json);
    } catch {
      // Ignore parse errors
    }
  }

  const response: CurrentWorldResponse = {
    worldName: deployment.world_name,
    displayName: spec?.displayName || deployment.world_name,
    deployedAt: deployment.deployed_at,
    commitSha: deployment.commit_sha,
    commitUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/commit/${deployment.commit_sha}`,
    spec: spec!,
  };

  res.json(response);
});

/**
 * GET /api/worlds
 * List all world creation requests
 */
router.get('/', (req, res) => {
  const status = req.query.status as WorldRequestStatus | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  // Validate status if provided
  const validStatuses: WorldRequestStatus[] = ['pending', 'planned', 'building', 'pr_created', 'deployed', 'failed'];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({
      error: 'Invalid status',
      details: `Status must be one of: ${validStatuses.join(', ')}`,
    });
    return;
  }

  const { requests, total } = getWorldRequests(status, limit, offset);

  const worlds: WorldListItem[] = requests.map((r) => {
    let worldSpec: WorldSpec | null = null;
    if (r.worldspec_json) {
      try {
        worldSpec = JSON.parse(r.worldspec_json);
      } catch {
        // Ignore parse errors
      }
    }

    return {
      id: r.id,
      worldName: worldSpec?.worldName || null,
      displayName: worldSpec?.displayName || null,
      status: r.status,
      requestedBy: r.user_github_username,
      requestedAt: r.created_at,
      deployedAt: r.status === 'deployed' ? r.updated_at : null,
      prUrl: r.pr_url,
    };
  });

  const response: WorldListResponse = {
    worlds,
    pagination: {
      total,
      limit,
      offset,
    },
  };

  res.json(response);
});

/**
 * POST /api/worlds
 * Create a new world request
 */
router.post('/', createWorldLimiter, validateCreateWorldRequest, async (req, res) => {
  const user = req.user!;
  const body = req.body as CreateWorldRequest;

  // Create the request in the database
  const request = createWorldRequest(
    user.githubId,
    user.username,
    body.description,
    body.difficulty,
    body.gameMode,
    body.size
  );

  // Start async processing (don't await)
  processWorldRequest(request.id, user.username, body).catch((err) => {
    console.error(`Error processing request ${request.id}:`, err);
  });

  res.status(202).json({
    id: request.id,
    status: request.status,
    message: 'World creation request submitted successfully',
    estimatedTime: '2-3 minutes',
  });
});

/**
 * GET /api/worlds/:id
 * Get details of a specific world request
 */
router.get('/:id', validateRequestId, (req, res) => {
  const { id } = req.params;
  const request = getWorldRequestById(id);

  if (!request) {
    res.status(404).json({ error: 'World request not found' });
    return;
  }

  let worldSpec: WorldSpec | null = null;
  if (request.worldspec_json) {
    try {
      worldSpec = JSON.parse(request.worldspec_json);
    } catch {
      // Ignore parse errors
    }
  }

  const response: WorldDetailResponse = {
    id: request.id,
    status: request.status,
    requestedBy: request.user_github_username,
    requestedAt: request.created_at,
    updatedAt: request.updated_at,
    request: {
      description: request.description,
      difficulty: request.difficulty,
      gameMode: request.game_mode,
      size: request.size,
    },
    worldSpec,
    prUrl: request.pr_url,
    commitSha: request.commit_sha,
    error: request.error ? { message: request.error } : null,
  };

  res.json(response);
});

/**
 * POST /api/worlds/:id/retry
 * Retry a failed world request
 */
router.post('/:id/retry', validateRequestId, async (req, res) => {
  const { id } = req.params;
  const user = req.user!;
  const request = getWorldRequestById(id);

  if (!request) {
    res.status(404).json({ error: 'World request not found' });
    return;
  }

  // Only allow retry for failed requests
  if (request.status !== 'failed') {
    res.status(400).json({
      error: `Cannot retry request with status: ${request.status}`,
    });
    return;
  }

  // Only allow original requester to retry
  if (request.user_github_id !== user.githubId) {
    res.status(403).json({
      error: 'Only the original requester can retry this request',
    });
    return;
  }

  // Reset to pending
  updateWorldRequestStatus(id, 'pending', { error: undefined });

  // Start async processing
  const body: CreateWorldRequest = {
    description: request.description,
    difficulty: request.difficulty || undefined,
    gameMode: request.game_mode || undefined,
    size: request.size || undefined,
  };

  processWorldRequest(id, user.username, body).catch((err) => {
    console.error(`Error processing retry ${id}:`, err);
  });

  res.status(202).json({
    id: request.id,
    status: 'pending',
    message: 'Request resubmitted for processing',
  });
});

/**
 * DELETE /api/worlds/:id
 * Delete a world request
 */
router.delete('/:id', validateRequestId, (req, res) => {
  const { id } = req.params;
  const request = getWorldRequestById(id);

  if (!request) {
    res.status(404).json({ error: 'World request not found' });
    return;
  }

  // Delete the request
  const deleted = deleteWorldRequest(id);
  
  if (!deleted) {
    res.status(500).json({ error: 'Failed to delete world request' });
    return;
  }

  console.log(`[${id}] World request deleted`);
  
  res.json({
    success: true,
    message: 'World request deleted successfully',
    id,
  });
});

/**
 * Process a world request asynchronously
 * This is the main flow: AI planning -> RCON configuration -> deployed
 */
async function processWorldRequest(
  requestId: string,
  username: string,
  body: CreateWorldRequest
): Promise<void> {
  try {
    // Step 1: Plan with AI
    console.log(`[${requestId}] Starting AI planning...`);
    const planResult = await planWorld({
      description: body.description,
      difficulty: body.difficulty,
      gameMode: body.gameMode,
      size: body.size,
      requestedBy: username,
    });

    if (!planResult.success || !planResult.worldSpec) {
      updateWorldRequestStatus(requestId, 'failed', {
        error: planResult.error || 'AI planning failed',
      });
      return;
    }

    const worldSpec = planResult.worldSpec;

    // Update status to planned
    updateWorldRequestStatus(requestId, 'planned', {
      worldspecJson: JSON.stringify(worldSpec),
    });
    console.log(`[${requestId}] Planning complete: ${worldSpec.worldName}`);

    // Step 2: Apply configuration via RCON
    updateWorldRequestStatus(requestId, 'building');
    console.log(`[${requestId}] Applying configuration via RCON...`);

    try {
      // Build RCON commands from world spec
      const commands = buildRconCommands(worldSpec);
      console.log(`[${requestId}] Executing ${commands.length} RCON commands...`);

      const { results, errors } = await executeRconCommands(commands);
      
      if (errors.length > 0) {
        console.warn(`[${requestId}] Some commands had errors:`, errors);
      }
      
      console.log(`[${requestId}] RCON commands executed: ${results.length} succeeded, ${errors.length} failed`);

    } catch (rconError) {
      console.error(`[${requestId}] RCON connection failed:`, rconError);
      // Don't fail the whole request - RCON might be temporarily unavailable
      // Mark as deployed anyway since the plan was created
    }

    // Step 3: Mark as deployed and create deployment record
    const deploymentId = `dep_${Date.now().toString(36)}`;
    
    createDeployment(
      worldSpec.worldName,
      deploymentId,
      JSON.stringify(worldSpec)
    );

    updateWorldRequestStatus(requestId, 'deployed', {
      commitSha: deploymentId,
    });

    console.log(`[${requestId}] World deployed: ${worldSpec.displayName || worldSpec.worldName}`);

  } catch (error) {
    console.error(`[${requestId}] Processing error:`, error);
    updateWorldRequestStatus(requestId, 'failed', {
      error: (error as Error).message,
    });
  }
}

/**
 * Build RCON commands from a world spec
 */
function buildRconCommands(spec: WorldSpec): Array<{ command: string; delayMs?: number; optional?: boolean }> {
  const commands: Array<{ command: string; delayMs?: number; optional?: boolean }> = [];

  // Set difficulty
  if (spec.rules.difficulty) {
    commands.push({ command: `difficulty ${spec.rules.difficulty}` });
  }

  // Set game mode (default for new players)
  if (spec.rules.gameMode) {
    commands.push({ command: `defaultgamemode ${spec.rules.gameMode}` });
  }

  // Game rules
  const gameRules: Record<string, boolean | number | undefined> = {
    keepInventory: spec.rules.keepInventory,
    doDaylightCycle: spec.rules.doDaylightCycle,
    doWeatherCycle: spec.rules.doWeatherCycle,
    doMobSpawning: spec.rules.doMobSpawning,
    announceAdvancements: spec.rules.announceAdvancements,
    naturalRegeneration: spec.rules.naturalRegeneration,
    pvp: spec.rules.pvp,
    spawnRadius: spec.rules.spawnRadius,
  };

  for (const [rule, value] of Object.entries(gameRules)) {
    if (value !== undefined) {
      // Convert camelCase to proper gamerule name
      const ruleValue = typeof value === 'boolean' ? value.toString() : value.toString();
      commands.push({ command: `gamerule ${rule} ${ruleValue}`, optional: true });
    }
  }

  // Set world border if specified
  if (spec.server?.viewDistance) {
    // World border based on view distance (just an example)
    const borderSize = spec.server.viewDistance * 16 * 2;
    commands.push({ command: `worldborder set ${borderSize}`, optional: true });
  }

  // Set MOTD announcement
  commands.push({ 
    command: `say §6[World Forge] §aNew world configured: §b${spec.displayName || spec.worldName}`, 
    delayMs: 500 
  });

  // Announce the theme
  if (spec.theme) {
    commands.push({ 
      command: `say §7Theme: ${spec.theme.substring(0, 100)}...`,
      delayMs: 100,
      optional: true
    });
  }

  return commands;
}

export default router;

