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
import { updateMinecraftMOTD } from '../services/kubernetes.js';
import { processBuildCommands } from '../services/shape-library.js';
import { buildLogo, pixelsTo3DRelief, fetchImagePixels, optimizeCommands } from '../services/image-to-voxel.js';
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

      // Execute build commands if present
      // Supports shape library, components, custom voxels, and raw fill commands
      // IMPORTANT: Chunks must be loaded for fill commands to work!
      const buildCmds = (worldSpec as WorldSpec & { _buildCommands?: string[] })._buildCommands;
      const customVoxels = (worldSpec as WorldSpec & { _customVoxels?: Record<string, { palette: Record<string, string>; layers: string[][] }> })._customVoxels;
      
      if (buildCmds && buildCmds.length > 0) {
        const customVoxelCount = customVoxels ? Object.keys(customVoxels).length : 0;
        console.log(`[${requestId}] Processing ${buildCmds.length} build commands (${customVoxelCount} custom voxels)...`);
        
        // Process through shape library - converts shape/component/custom voxel commands to fill commands
        const processedCommands = processBuildCommands(buildCmds, customVoxels);
        console.log(`[${requestId}] Expanded to ${processedCommands.length} Minecraft commands`);

        // Extract coordinates from all fill commands to determine forceload area
        const coords: { x: number; z: number }[] = [];
        for (const cmd of processedCommands) {
          const match = cmd.match(/fill\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/i);
          if (match) {
            coords.push(
              { x: parseInt(match[1]), z: parseInt(match[3]) },
              { x: parseInt(match[4]), z: parseInt(match[6]) }
            );
          }
          const setblockMatch = cmd.match(/setblock\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/i);
          if (setblockMatch) {
            coords.push({ x: parseInt(setblockMatch[1]), z: parseInt(setblockMatch[3]) });
          }
        }

        // Calculate bounding box and forceload chunks
        if (coords.length > 0) {
          const minX = Math.min(...coords.map(c => c.x));
          const maxX = Math.max(...coords.map(c => c.x));
          const minZ = Math.min(...coords.map(c => c.z));
          const maxZ = Math.max(...coords.map(c => c.z));
          
          console.log(`[${requestId}] Build area: X(${minX} to ${maxX}), Z(${minZ} to ${maxZ})`);
          
          // Forceload all necessary chunks FIRST (with padding)
          const forceloadCmd = {
            command: `forceload add ${minX - 16} ${minZ - 16} ${maxX + 16} ${maxZ + 16}`,
            delayMs: 500
          };
          
          console.log(`[${requestId}] Forceload: ${forceloadCmd.command}`);
          const { errors: forceloadErrors } = await executeRconCommands([forceloadCmd]);
          
          if (forceloadErrors.length > 0) {
            console.warn(`[${requestId}] Forceload errors:`, forceloadErrors);
          }
          
          // Wait for chunks to load
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // CLEAR THE BUILD AREA - gives fresh canvas for each world
          // Fill with air from Y=65 to Y=200, then reset ground at Y=64
          console.log(`[${requestId}] Clearing build area for fresh world...`);
          const clearCommands = [
            // Clear everything above ground (in chunks to avoid command size limits)
            { command: `fill ${minX - 10} 65 ${minZ - 10} ${maxX + 10} 150 ${maxZ + 10} air`, delayMs: 200 },
            { command: `fill ${minX - 10} 151 ${minZ - 10} ${maxX + 10} 220 ${maxZ + 10} air`, delayMs: 200 },
            // Reset ground to flat grass
            { command: `fill ${minX - 10} 64 ${minZ - 10} ${maxX + 10} 64 ${maxZ + 10} grass_block`, delayMs: 200 },
            { command: `fill ${minX - 10} 60 ${minZ - 10} ${maxX + 10} 63 ${maxZ + 10} dirt`, delayMs: 200 },
          ];
          
          const { errors: clearErrors } = await executeRconCommands(clearCommands);
          if (clearErrors.length > 0) {
            console.warn(`[${requestId}] Clear area had some errors (may be expected):`, clearErrors.slice(0, 2));
          }
          console.log(`[${requestId}] Build area cleared`);
        }
        
        // Execute all build commands
        const preparedCommands = processedCommands.map(cmd => ({
          command: cmd,
          delayMs: 50, // Fast execution for many commands
          optional: true
        }));
        
        if (preparedCommands.length > 0) {
          console.log(`[${requestId}] Executing ${preparedCommands.length} build commands...`);
          const { results: buildResults, errors: buildErrors } = await executeRconCommands(preparedCommands);
          console.log(`[${requestId}] Build commands: ${buildResults.length} succeeded, ${buildErrors.length} failed`);
          
          if (buildErrors.length > 0) {
            console.warn(`[${requestId}] Build errors:`, buildErrors.slice(0, 5));
          }
          
          if (buildResults.length > 0) {
            // Set world spawn to center of build area if we have coordinates
            if (coords.length > 0) {
              const centerX = Math.round((Math.min(...coords.map(c => c.x)) + Math.max(...coords.map(c => c.x))) / 2);
              const centerZ = Math.round((Math.min(...coords.map(c => c.z)) + Math.max(...coords.map(c => c.z))) / 2);
              await executeRconCommands([
                { command: `setworldspawn ${centerX} 80 ${centerZ}`, delayMs: 100 }
              ]);
              console.log(`[${requestId}] Set world spawn to ${centerX}, 80, ${centerZ}`);
            }
            
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

    // Step 2.5: Build custom image/logo if provided
    if (body.imageUrl) {
      try {
        console.log(`[${requestId}] Building custom image from URL: ${body.imageUrl}`);
        
        const imageScale = body.imageScale || 2;
        const imageDepth = body.imageDepth || 1;
        
        // Position the image at a good viewing location (offset from spawn)
        const imageX = 0;
        const imageY = 65;
        const imageZ = 80; // In front of spawn
        
        const result = await buildLogo(body.imageUrl, imageX, imageY, imageZ, {
          maxSize: 80,
          scale: imageScale,
          depth: imageDepth,
          facing: 'south'
        });
        
        console.log(`[${requestId}] Image processed: ${result.buildInfo.width}x${result.buildInfo.height} blocks`);
        
        // Get RCON connection
        const rcon = getRconClient();
        if (!rcon.isConnected()) {
          await rcon.connect();
        }
        
        // Forceload the image area
        console.log(`[${requestId}] Forceload: ${result.forceloadCommand}`);
        await rcon.send(result.forceloadCommand);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Execute image build commands in batches
        const batchSize = 50;
        let imageSuccessCount = 0;
        let imageErrorCount = 0;
        
        for (let i = 0; i < result.commands.length; i += batchSize) {
          const batch = result.commands.slice(i, i + batchSize);
          for (const cmd of batch) {
            try {
              await rcon.send(cmd);
              imageSuccessCount++;
            } catch {
              imageErrorCount++;
            }
          }
          if (i + batchSize < result.commands.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        console.log(`[${requestId}] Image built: ${imageSuccessCount} blocks placed, ${imageErrorCount} errors`);
        
        // Announce the image
        await rcon.send(`say §6[World Forge] §a🖼️ Custom image built! ${result.buildInfo.width}x${result.buildInfo.height} blocks`);
        
      } catch (imageError) {
        console.error(`[${requestId}] Image building failed:`, imageError);
        // Don't fail the world creation - image is optional
      }
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

    // Step 4: Update MOTD and restart the server
    const worldTitle = worldSpec.displayName || worldSpec.worldName;
    console.log(`[${requestId}] Updating MOTD and restarting server...`);
    
    // First, update the MOTD via Kubernetes API (so it shows in server list after restart)
    try {
      const motdResult = await updateMinecraftMOTD(worldTitle, worldSpec.theme);
      if (motdResult.success) {
        console.log(`[${requestId}] ✅ MOTD updated to: ${worldTitle}`);
      } else {
        console.warn(`[${requestId}] MOTD update skipped: ${motdResult.error}`);
      }
    } catch (motdError) {
      console.warn(`[${requestId}] Could not update MOTD:`, motdError);
      // Continue anyway - MOTD is nice-to-have
    }
    
    // Now restart via RCON
    try {
      const rcon = getRconClient();
      if (!rcon.isConnected()) {
        await rcon.connect();
      }
      
      // Warn players
      await executeRconCommands([
        { command: `say §6═══════════════════════════════════════`, delayMs: 100 },
        { command: `say §6   🌍 NEW WORLD FORGED!`, delayMs: 100 },
        { command: `say §b   ${worldTitle}`, delayMs: 100 },
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
      
      // Stop the server - Kubernetes will restart it with new MOTD
      try {
        await rcon.send('stop');
      } catch {
        // Expected - connection closes when server stops
      }
      
      console.log(`[${requestId}] Server restart triggered - MOTD will show: ${worldTitle}`);
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

  // === GAMERULES - Lock time to day, disable weather, no mobs ===
  commands.push({ command: 'gamerule doDaylightCycle false', delayMs: 100 });
  commands.push({ command: 'gamerule doWeatherCycle false', delayMs: 100 });
  commands.push({ command: 'gamerule doMobSpawning false', delayMs: 100 });
  commands.push({ command: 'time set day', delayMs: 100 });
  commands.push({ command: 'weather clear', delayMs: 100 });

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

