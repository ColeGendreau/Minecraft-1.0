/**
 * Minecraft Server Routes
 * 
 * Handles communication with the Minecraft server via RCON,
 * including WorldEdit command execution and structure building.
 */

import { Router } from 'express';
import { getRconClient, executeRconCommands } from '../services/rcon-client.js';
import { generateStructuresFromDescription } from '../services/structure-generator.js';
import type { GeneratedStructure, StructureExecutionResult, WorldEditCommand } from '../types/index.js';

const router = Router();

// ============== SERVER CONTROL ==============

/**
 * POST /api/minecraft/restart
 * Restart the Minecraft server (Kubernetes will auto-restart after stop)
 * Used to apply new world configurations like MOTD
 */
router.post('/restart', async (req, res) => {
  try {
    const { reason, worldName } = req.body;
    
    console.log(`Server restart requested: ${reason || 'No reason provided'}`);
    
    const rcon = getRconClient();
    if (!rcon.isConnected()) {
      await rcon.connect();
    }
    
    // Warn players
    await rcon.send('say §c§l⚠ SERVER RESTARTING IN 10 SECONDS ⚠');
    if (worldName) {
      await rcon.send(`say §6New world being forged: §b${worldName}`);
    }
    await rcon.send('say §7Please reconnect in about 60 seconds...');
    
    // Wait 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Countdown
    await rcon.send('say §c§lRestarting in 3...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await rcon.send('say §c§l2...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await rcon.send('say §c§l1...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Stop the server - Kubernetes will restart it automatically
    try {
      await rcon.send('stop');
    } catch {
      // Connection will close when server stops - this is expected
    }
    
    res.json({
      success: true,
      message: 'Server restart initiated. It will be back online in ~60 seconds.',
      reason,
      worldName,
      restartedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error restarting server:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Restart failed',
    });
  }
});

// ============== HEALTH & STATUS ==============

/**
 * GET /api/minecraft/status
 * Check Minecraft server and RCON connection status
 */
router.get('/status', async (req, res) => {
  try {
    const rcon = getRconClient();
    
    if (!rcon.isConnected()) {
      try {
        await rcon.connect();
      } catch (err) {
        res.json({
          online: false,
          rconConnected: false,
          worldEditAvailable: false,
          error: err instanceof Error ? err.message : 'Connection failed',
          lastChecked: new Date().toISOString(),
        });
        return;
      }
    }
    
    // Try to get player list as a simple health check
    let playerList = '';
    try {
      playerList = await rcon.send('list');
    } catch {
      playerList = 'Unable to fetch';
    }
    
    // Check if WorldEdit is loaded
    let worldEditVersion = 'Unknown';
    try {
      const weVersion = await rcon.send('version WorldEdit');
      worldEditVersion = weVersion || 'Installed';
    } catch {
      worldEditVersion = 'Not detected';
    }
    
    res.json({
      online: true,
      rconConnected: true,
      worldEditAvailable: worldEditVersion !== 'Not detected',
      worldEditVersion,
      playerList,
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking Minecraft status:', error);
    res.status(500).json({
      online: false,
      rconConnected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============== COMMAND EXECUTION ==============

/**
 * POST /api/minecraft/command
 * Execute a single command on the Minecraft server
 */
router.post('/command', async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command || typeof command !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Command is required and must be a string',
      });
      return;
    }
    
    // Security: Block certain dangerous commands
    const blockedPatterns = [
      /^\/?(stop|restart|reload)/i,
      /^\/?(op|deop|ban|kick|pardon)/i,
      /^\/?(whitelist)/i,
    ];
    
    if (blockedPatterns.some(pattern => pattern.test(command))) {
      res.status(403).json({
        success: false,
        error: 'This command is not allowed via the API',
      });
      return;
    }
    
    const rcon = getRconClient();
    if (!rcon.isConnected()) {
      await rcon.connect();
    }
    
    const result = await rcon.sendWorldEdit(command);
    
    res.json({
      success: true,
      command,
      result,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error executing command:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Command execution failed',
    });
  }
});

/**
 * POST /api/minecraft/commands
 * Execute multiple commands in sequence
 */
router.post('/commands', async (req, res) => {
  try {
    const { commands } = req.body;
    
    if (!Array.isArray(commands)) {
      res.status(400).json({
        success: false,
        error: 'Commands must be an array',
      });
      return;
    }
    
    // Validate command structure
    const validatedCommands: Array<{ command: string; delayMs?: number; optional?: boolean }> = [];
    for (const cmd of commands) {
      if (typeof cmd === 'string') {
        validatedCommands.push({ command: cmd });
      } else if (typeof cmd === 'object' && cmd.command) {
        validatedCommands.push({
          command: cmd.command,
          delayMs: cmd.delayMs,
          optional: cmd.optional,
        });
      }
    }
    
    if (validatedCommands.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid commands provided',
      });
      return;
    }
    
    // Limit batch size
    if (validatedCommands.length > 500) {
      res.status(400).json({
        success: false,
        error: 'Maximum 500 commands per batch',
      });
      return;
    }
    
    const { results, errors } = await executeRconCommands(validatedCommands);
    
    res.json({
      success: errors.length === 0,
      totalCommands: validatedCommands.length,
      successfulCommands: results.length,
      failedCommands: errors.length,
      results,
      errors,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error executing commands:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Command execution failed',
    });
  }
});

// ============== STRUCTURE GENERATION ==============

/**
 * POST /api/minecraft/generate-structures
 * Generate WorldEdit structure commands from a description
 * (Does not execute - just returns the commands)
 */
router.post('/generate-structures', async (req, res) => {
  try {
    const { description, worldName, complexity } = req.body;
    
    if (!description || typeof description !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Description is required',
      });
      return;
    }
    
    const structures = generateStructuresFromDescription(
      description,
      worldName || `world-${Date.now()}`,
      complexity || 5
    );
    
    const totalCommands = structures.reduce((sum, s) => sum + s.commands.length, 0);
    const totalBlocks = structures.reduce((sum, s) => sum + s.estimatedBlocks, 0);
    
    res.json({
      success: true,
      structureCount: structures.length,
      totalCommands,
      estimatedBlocks: totalBlocks,
      structures,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating structures:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Structure generation failed',
    });
  }
});

/**
 * POST /api/minecraft/build-structure
 * Execute a single structure's WorldEdit commands
 */
router.post('/build-structure', async (req, res) => {
  try {
    const { structure } = req.body as { structure: GeneratedStructure };
    
    if (!structure || !structure.commands || !Array.isArray(structure.commands)) {
      res.status(400).json({
        success: false,
        error: 'Valid structure with commands is required',
      });
      return;
    }
    
    console.log(`Building structure: ${structure.name} (${structure.commands.length} commands)`);
    
    const startTime = Date.now();
    const commandsToExecute = structure.commands.map(cmd => ({
      command: cmd.command,
      delayMs: cmd.delayMs || 50,
      optional: cmd.optional || false,
    }));
    
    const { results, errors } = await executeRconCommands(commandsToExecute);
    const executionTimeMs = Date.now() - startTime;
    
    const result: StructureExecutionResult = {
      structureId: structure.id,
      success: errors.length < structure.commands.length * 0.5, // 50% success threshold
      commandsExecuted: results.length,
      commandsFailed: errors.length,
      executionTimeMs,
      errors,
    };
    
    res.json({
      success: result.success,
      result,
      message: result.success 
        ? `Successfully built ${structure.name}!`
        : `Partially built ${structure.name} with some errors`,
    });
  } catch (error) {
    console.error('Error building structure:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Structure building failed',
    });
  }
});

/**
 * POST /api/minecraft/build-world
 * Execute all structures for a world (full world building pipeline)
 */
router.post('/build-world', async (req, res) => {
  try {
    const { structures, worldName } = req.body as { 
      structures: GeneratedStructure[];
      worldName: string;
    };
    
    if (!structures || !Array.isArray(structures) || structures.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Structures array is required',
      });
      return;
    }
    
    console.log(`\n========================================`);
    console.log(`Building world: ${worldName || 'Unknown'}`);
    console.log(`Structures: ${structures.length}`);
    console.log(`========================================\n`);
    
    const startTime = Date.now();
    const results: StructureExecutionResult[] = [];
    
    // Build each structure in sequence
    for (let i = 0; i < structures.length; i++) {
      const structure = structures[i];
      console.log(`[${i + 1}/${structures.length}] Building: ${structure.name}...`);
      
      const structureStart = Date.now();
      const commandsToExecute = structure.commands.map(cmd => ({
        command: cmd.command,
        delayMs: cmd.delayMs || 50,
        optional: cmd.optional || false,
      }));
      
      const { results: cmdResults, errors } = await executeRconCommands(commandsToExecute);
      
      results.push({
        structureId: structure.id,
        success: errors.length < structure.commands.length * 0.5,
        commandsExecuted: cmdResults.length,
        commandsFailed: errors.length,
        executionTimeMs: Date.now() - structureStart,
        errors,
      });
      
      console.log(`  ✓ Completed in ${Date.now() - structureStart}ms (${errors.length} errors)`);
      
      // Brief pause between structures
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const totalTime = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    
    console.log(`\n========================================`);
    console.log(`World building complete!`);
    console.log(`Success: ${successCount}/${structures.length} structures`);
    console.log(`Total time: ${totalTime}ms`);
    console.log(`========================================\n`);
    
    res.json({
      success: successCount === structures.length,
      worldName,
      structuresBuilt: successCount,
      structuresTotal: structures.length,
      totalTimeMs: totalTime,
      results,
    });
  } catch (error) {
    console.error('Error building world:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'World building failed',
    });
  }
});

// ============== WORLDEDIT UTILITIES ==============

/**
 * POST /api/minecraft/worldedit/undo
 * Undo the last WorldEdit operation
 */
router.post('/worldedit/undo', async (req, res) => {
  try {
    const { count } = req.body;
    const undoCount = Math.min(Math.max(1, count || 1), 20); // Limit to 20 undos
    
    const rcon = getRconClient();
    if (!rcon.isConnected()) {
      await rcon.connect();
    }
    
    const results: string[] = [];
    for (let i = 0; i < undoCount; i++) {
      const result = await rcon.sendWorldEdit('//undo');
      results.push(result);
    }
    
    res.json({
      success: true,
      undoCount,
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Undo failed',
    });
  }
});

/**
 * POST /api/minecraft/worldedit/clear-area
 * Clear a cubic area (useful for cleanup/reset)
 */
router.post('/worldedit/clear-area', async (req, res) => {
  try {
    const { x1, y1, z1, x2, y2, z2 } = req.body;
    
    if ([x1, y1, z1, x2, y2, z2].some(v => typeof v !== 'number')) {
      res.status(400).json({
        success: false,
        error: 'All coordinates (x1, y1, z1, x2, y2, z2) are required as numbers',
      });
      return;
    }
    
    // Limit area size
    const volume = Math.abs(x2 - x1) * Math.abs(y2 - y1) * Math.abs(z2 - z1);
    if (volume > 10000000) { // 10 million blocks max
      res.status(400).json({
        success: false,
        error: 'Area too large. Maximum 10 million blocks.',
      });
      return;
    }
    
    const commands = [
      { command: `//pos1 ${x1},${y1},${z1}` },
      { command: `//pos2 ${x2},${y2},${z2}` },
      { command: '//set air', delayMs: 100 },
    ];
    
    const { results, errors } = await executeRconCommands(commands);
    
    res.json({
      success: errors.length === 0,
      volume,
      results,
      errors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Clear area failed',
    });
  }
});

/**
 * GET /api/minecraft/worldedit/patterns
 * Return available block patterns for reference
 */
router.get('/worldedit/patterns', (req, res) => {
  res.json({
    syntax: {
      single: 'stone',
      weighted: '50%stone,30%cobblestone,20%andesite',
      blockState: 'oak_stairs[facing=north,half=top]',
    },
    examples: {
      gradient: 'Create gradient by layering patterns at different heights',
      noise: '60%stone,25%cobblestone,15%gravel - natural variation',
      mixed: 'obsidian,crying_obsidian,purple_stained_glass - modern look',
    },
    commonBlocks: {
      structural: ['stone', 'cobblestone', 'andesite', 'diorite', 'granite', 'deepslate'],
      wood: ['oak_log', 'spruce_log', 'birch_log', 'dark_oak_log', 'acacia_log'],
      glass: ['glass', 'white_stained_glass', 'light_blue_stained_glass', 'purple_stained_glass'],
      light: ['glowstone', 'sea_lantern', 'shroomlight', 'end_rod', 'lantern'],
      nether: ['obsidian', 'crying_obsidian', 'blackstone', 'basalt', 'netherrack'],
      special: ['beacon', 'amethyst_block', 'copper_block', 'gold_block'],
    },
  });
});

export default router;

