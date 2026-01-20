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
      // Build RCON commands from world spec (game rules)
      const gameCommands = buildRconCommands(worldSpec);
      console.log(`[${requestId}] Executing ${gameCommands.length} game rule commands...`);

      const { results: gameResults, errors: gameErrors } = await executeRconCommands(gameCommands);
      
      if (gameErrors.length > 0) {
        console.warn(`[${requestId}] Some game commands had errors:`, gameErrors);
      }
      
      console.log(`[${requestId}] Game rules applied: ${gameResults.length} succeeded`);

      // Execute build commands if present (WorldEdit + vanilla commands)
      // WorldEdit commands: //world, //pos1, //pos2, //set, //faces, //walls, etc.
      // Vanilla commands: forceload, fill, setblock, summon
      const buildCmds = (worldSpec as WorldSpec & { _buildCommands?: string[] })._buildCommands;
      if (buildCmds && buildCmds.length > 0) {
        console.log(`[${requestId}] Executing ${buildCmds.length} build commands (WorldEdit + vanilla)...`);
        
        // Filter out comment lines (starting with "// " with space, NOT WorldEdit commands like "//set")
        // WorldEdit commands start with "//" followed immediately by a command name (no space)
        const preparedCommands = buildCmds
          .filter(cmd => {
            if (!cmd) return false;
            const trimmed = cmd.trim();
            if (trimmed.length === 0) return false;
            // Keep WorldEdit commands (//pos1, //set, //faces, etc.) - they have no space after //
            if (trimmed.startsWith('//') && trimmed.length > 2 && trimmed[2] !== ' ' && trimmed[2] !== '=') {
              return true; // This is a WorldEdit command
            }
            // Remove comment lines (start with // followed by space or =)
            if (trimmed.startsWith('//')) {
              return false; // This is a comment
            }
            return true; // Keep vanilla commands
          })
          .map(cmd => {
            const trimmed = cmd.trim();
            return { 
              command: trimmed, // Send as-is, WorldEdit commands need their // prefix
              delayMs: 200, // Give WorldEdit time to process large operations
              optional: true
            };
          });
        
        if (preparedCommands.length > 0) {
          console.log(`[${requestId}] Filtered to ${preparedCommands.length} actual commands`);
          const { results: buildResults, errors: buildErrors } = await executeRconCommands(preparedCommands);
          console.log(`[${requestId}] Build commands: ${buildResults.length} succeeded, ${buildErrors.length} failed`);
          
          if (buildErrors.length > 0) {
            console.warn(`[${requestId}] Build errors:`, buildErrors.slice(0, 5));
          }
          
          if (buildResults.length > 0) {
            // Announce the build
            await executeRconCommands([{
              command: `say §6[World Forge] §a✨ Built ${buildResults.length} epic structures for ${worldSpec.displayName}!`,
              delayMs: 500
            }]);
          }
        }
      }

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

    // Step 4: Restart the server to apply changes (new world, fresh start)
    console.log(`[${requestId}] Restarting server to apply new world configuration...`);
    try {
      const rcon = getRconClient();
      if (!rcon.isConnected()) {
        await rcon.connect();
      }
      
      // Warn players
      await executeRconCommands([
        { command: `say §6═══════════════════════════════════════`, delayMs: 100 },
        { command: `say §6   🌍 NEW WORLD FORGED!`, delayMs: 100 },
        { command: `say §b   ${worldSpec.displayName || worldSpec.worldName}`, delayMs: 100 },
        { command: `say §6═══════════════════════════════════════`, delayMs: 100 },
        { command: `say §c§l⚠ SERVER RESTARTING IN 10 SECONDS ⚠`, delayMs: 100 },
        { command: `say §7Reconnect in ~60 seconds to explore!`, delayMs: 100 },
      ]);
      
      // Wait then restart
      await new Promise(resolve => setTimeout(resolve, 10000));
      await executeRconCommands([
        { command: 'say §c§l3...', delayMs: 1000 },
        { command: 'say §c§l2...', delayMs: 1000 },
        { command: 'say §c§l1...', delayMs: 1000 },
      ]);
      
      // Stop the server - Kubernetes will restart it
      try {
        await rcon.send('stop');
      } catch {
        // Expected - connection closes when server stops
      }
      
      console.log(`[${requestId}] Server restart triggered`);
    } catch (restartError) {
      console.warn(`[${requestId}] Could not restart server:`, restartError);
      // Don't fail the deployment - the world was still created
    }

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

  // === SET DAYTIME AND CLEAR WEATHER ===
  // Note: gamerule commands don't work via RCON in Paper 1.21
  // So we just set the time and weather - they'll need to be reset periodically
  commands.push({ command: 'time set day', delayMs: 100 });
  commands.push({ command: 'weather clear 1000000', delayMs: 100 }); // Clear for ~11 days

  // Note: Gamerule commands don't work via RCON in Paper 1.21
  // Gamerules are set in server config instead (values.yaml)

  // === WORLD NAME ANNOUNCEMENT ===
  // Since MOTD in server.properties can't be changed at runtime,
  // we announce the world name prominently in chat
  const worldTitle = spec.displayName || spec.worldName;
  commands.push({ 
    command: `say §6═══════════════════════════════════════`,
    delayMs: 100 
  });
  commands.push({ 
    command: `say §6   🌍 WORLD FORGE - ${worldTitle.toUpperCase()}`,
    delayMs: 100 
  });
  commands.push({ 
    command: `say §6═══════════════════════════════════════`,
    delayMs: 100 
  });

  // Announce the theme
  if (spec.theme) {
    const shortTheme = spec.theme.length > 80 ? spec.theme.substring(0, 80) + '...' : spec.theme;
    commands.push({ 
      command: `say §7${shortTheme}`,
      delayMs: 100,
      optional: true
    });
  }

  return commands;
}

export default router;

