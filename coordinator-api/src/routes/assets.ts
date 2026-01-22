/**
 * Asset Management Routes
 * 
 * Handles creating, listing, deleting, and duplicating assets in the Minecraft world.
 * Assets are built live via RCON - no server restart needed.
 */

import { Router } from 'express';
import {
  createAsset,
  getAssetById,
  getAssets,
  getActiveAssets,
  deleteAsset,
  nukeAllAssets,
  getNextAssetPosition,
} from '../db/client.js';
import { getRconClient } from '../services/rcon-client.js';
import { buildLogo } from '../services/image-to-voxel.js';
import { searchImage, isImageSearchAvailable, getImageSearchStatus } from '../services/bing-image-search.js';
import type { AssetStatus } from '../types/index.js';

const router = Router();

// ============================================================
// STATUS / CONFIG
// ============================================================

/**
 * GET /api/assets/status
 * Get asset system status including AI image lookup availability
 */
router.get('/status', (_req, res) => {
  const assets = getActiveAssets();
  const searchStatus = getImageSearchStatus();
  
  res.json({
    totalAssets: assets.length,
    aiImageGeneration: {
      available: searchStatus.available,
      service: searchStatus.service,
      note: searchStatus.available 
        ? 'Image Search is enabled! Search for any image and build it as pixel art.'
        : 'Image Search is not configured. You can still create assets from image URLs.',
    },
    capabilities: [
      'Image URL to pixel art',
      searchStatus.available ? 'Search → find image → pixel art' : null,
      'Delete assets',
      'Duplicate assets',
      'Nuke all assets',
    ].filter(Boolean),
  });
});

// ============================================================
// LIST ASSETS
// ============================================================

/**
 * GET /api/assets
 * List all active assets
 */
router.get('/', (req, res) => {
  const status = req.query.status as AssetStatus | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  const { assets, total } = getAssets(status, limit, offset);

  res.json({
    assets: assets.map(a => ({
      id: a.id,
      name: a.name,
      imageUrl: a.image_url,
      prompt: a.prompt,
      generatedImageUrl: a.generated_image_url,
      position: {
        x: a.position_x,
        y: a.position_y,
        z: a.position_z,
      },
      dimensions: {
        width: a.width,
        height: a.height,
        depth: a.depth,
      },
      scale: a.scale,
      facing: a.facing,
      status: a.status,
      createdBy: a.created_by,
      createdAt: a.created_at,
    })),
    pagination: {
      total,
      limit,
      offset,
    },
  });
});

/**
 * GET /api/assets/:id
 * Get details of a specific asset
 */
router.get('/:id', (req, res) => {
  const asset = getAssetById(req.params.id);

  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  res.json({
    id: asset.id,
    name: asset.name,
    imageUrl: asset.image_url,
    prompt: asset.prompt,
    generatedImageUrl: asset.generated_image_url,
    position: {
      x: asset.position_x,
      y: asset.position_y,
      z: asset.position_z,
    },
    dimensions: {
      width: asset.width,
      height: asset.height,
      depth: asset.depth,
    },
    scale: asset.scale,
    facing: asset.facing,
    status: asset.status,
    createdBy: asset.created_by,
    createdAt: asset.created_at,
    deletedAt: asset.deleted_at,
  });
});

// ============================================================
// CREATE ASSET
// ============================================================

/**
 * POST /api/assets
 * Create a new asset from image URL or AI prompt
 * 
 * Body: {
 *   name?: string,           // Optional name (auto-generated if not provided)
 *   imageUrl?: string,       // Direct image URL
 *   prompt?: string,         // AI prompt (looks up a real image URL via GPT-4o)
 *   position?: { x, y, z },  // Optional position (auto-positioned if not provided)
 *   scale?: number,          // Blocks per pixel (default: 2)
 *   depth?: number,          // 1 = flat, >1 = 3D relief (default: 1)
 *   facing?: string          // north/south/east/west (default: south)
 * }
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      imageUrl,
      prompt,
      position,
      scale = 2,
      depth = 1,
      facing = 'south',
    } = req.body;

    // Require either imageUrl or prompt
    if (!imageUrl && !prompt) {
      return res.status(400).json({
        error: 'Either imageUrl or prompt is required',
      });
    }

    // Get user info
    const user = req.user || { username: 'anonymous' };

    // Determine image URL to use
    let finalImageUrl = imageUrl;
    let foundImageUrl: string | null = null;
    
    // Track if this is an AI lookup (for positioning)
    const isAiLookup = !!(prompt && !imageUrl);

    // If prompt provided but no image, use Bing Image Search to find a real image
    if (prompt && !imageUrl) {
      console.log(`[Asset] Image search for: "${prompt}"`);
      
      if (!isImageSearchAvailable()) {
        return res.status(400).json({
          error: 'Image Search is not configured. Please provide an imageUrl instead.',
          hint: 'Image Search requires Bing Search API credentials (BING_SEARCH_KEY).',
          searchStatus: getImageSearchStatus(),
        });
      }
      
      const searchResult = await searchImage(prompt);
      
      if (!searchResult.success || !searchResult.imageUrl) {
        return res.status(400).json({
          error: searchResult.error || 'No images found for this search',
          hint: 'Try different search terms or provide an imageUrl directly.',
        });
      }
      
      finalImageUrl = searchResult.imageUrl;
      foundImageUrl = searchResult.imageUrl;
      
      console.log(`[Asset] Found image: ${foundImageUrl.substring(0, 80)}...`);
    }

    // Get position (auto or manual)
    // All assets are placed in a row, automatically spaced to avoid overlap
    const pos = position || getNextAssetPosition();
    const posX = pos.x ?? 0;
    const posY = pos.y ?? 65;
    const posZ = pos.z ?? 50;

    console.log(`[Asset] Creating from URL: ${finalImageUrl}`);
    console.log(`[Asset] Position: (${posX}, ${posY}, ${posZ}), Scale: ${scale}x, Depth: ${depth}`);

    // Build the image
    const result = await buildLogo(finalImageUrl, posX, posY, posZ, {
      maxSize: 100,
      scale,
      depth,
      facing: facing as 'north' | 'south' | 'east' | 'west',
    });

    console.log(`[Asset] Generated ${result.commands.length} commands`);

    // Connect to RCON
    const rcon = getRconClient();
    if (!rcon.isConnected()) {
      await rcon.connect();
    }

    // Forceload the area
    console.log(`[Asset] Forceload: ${result.forceloadCommand}`);
    await rcon.send(result.forceloadCommand);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Set time to day
    await rcon.send('time set 6000');

    // Execute build commands
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 50;

    for (let i = 0; i < result.commands.length; i += batchSize) {
      const batch = result.commands.slice(i, i + batchSize);
      for (const cmd of batch) {
        try {
          await rcon.send(cmd);
          successCount++;
        } catch {
          errorCount++;
        }
      }
      if (i + batchSize < result.commands.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[Asset] Built: ${successCount} blocks, ${errorCount} errors`);

    // Generate name if not provided
    const assetName = name || `Asset ${new Date().toLocaleTimeString()}`;

    // Save to database
    const asset = createAsset({
      name: assetName,
      imageUrl: finalImageUrl,
      prompt: prompt || undefined,
      generatedImageUrl: foundImageUrl || undefined,
      positionX: result.buildInfo.position.x,
      positionY: result.buildInfo.position.y,
      positionZ: result.buildInfo.position.z,
      width: result.buildInfo.width,
      height: result.buildInfo.height,
      depth: depth,
      scale: scale,
      facing: facing as 'north' | 'south' | 'east' | 'west',
      createdBy: user.username,
    });

    // Announce in game
    await rcon.send(`say §6[World Forge] §a🖼️ New asset built: ${assetName}`);

    res.status(201).json({
      success: true,
      asset: {
        id: asset.id,
        name: asset.name,
        imageUrl: asset.image_url,
        position: {
          x: asset.position_x,
          y: asset.position_y,
          z: asset.position_z,
        },
        dimensions: {
          width: asset.width,
          height: asset.height,
          depth: asset.depth,
        },
      },
      stats: {
        blocksPlaced: successCount,
        errors: errorCount,
      },
    });

  } catch (error) {
    console.error('[Asset] Create error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create asset',
    });
  }
});

// ============================================================
// DELETE ASSET
// ============================================================

/**
 * DELETE /api/assets/:id
 * Delete an asset (clears it from the world)
 */
router.delete('/:id', async (req, res) => {
  try {
    const asset = getAssetById(req.params.id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (asset.status === 'deleted') {
      return res.status(400).json({ error: 'Asset already deleted' });
    }

    console.log(`[Asset] Deleting: ${asset.name} at (${asset.position_x}, ${asset.position_y}, ${asset.position_z})`);

    // Connect to RCON
    const rcon = getRconClient();
    if (!rcon.isConnected()) {
      await rcon.connect();
    }

    // Calculate the area to clear
    const x1 = asset.position_x;
    const y1 = asset.position_y;
    const z1 = asset.position_z;
    const x2 = asset.position_x + asset.width;
    const y2 = asset.position_y + asset.height;
    const z2 = asset.position_z + asset.depth;

    // Forceload the area
    await rcon.send(`forceload add ${x1 - 16} ${z1 - 16} ${x2 + 16} ${z2 + 16}`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Clear the asset area with air
    // Do in chunks to respect block limit
    const chunkSize = 30;
    for (let y = y1; y <= y2; y += chunkSize) {
      const yEnd = Math.min(y + chunkSize - 1, y2);
      const cmd = `fill ${x1} ${y} ${z1} ${x2} ${yEnd} ${z2} air`;
      await rcon.send(cmd);
    }

    // Mark as deleted in database
    deleteAsset(asset.id);

    // Announce in game
    await rcon.send(`say §6[World Forge] §c🗑️ Asset removed: ${asset.name}`);

    console.log(`[Asset] Deleted: ${asset.name}`);

    res.json({
      success: true,
      message: `Asset "${asset.name}" deleted`,
      id: asset.id,
    });

  } catch (error) {
    console.error('[Asset] Delete error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete asset',
    });
  }
});

// ============================================================
// DUPLICATE ASSET
// ============================================================

/**
 * POST /api/assets/:id/duplicate
 * Duplicate an asset at a new position
 */
router.post('/:id/duplicate', async (req, res) => {
  try {
    const asset = getAssetById(req.params.id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (asset.status === 'deleted') {
      return res.status(400).json({ error: 'Cannot duplicate a deleted asset' });
    }

    // Get new position (manual or auto)
    const { position } = req.body;
    const newPos = position || getNextAssetPosition();

    console.log(`[Asset] Duplicating: ${asset.name} to (${newPos.x}, ${newPos.y}, ${newPos.z})`);

    // Rebuild the asset at the new position
    const imageUrl = asset.generated_image_url || asset.image_url;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Asset has no image URL to duplicate' });
    }

    // Build at new position
    const result = await buildLogo(imageUrl, newPos.x, newPos.y, newPos.z, {
      maxSize: 100,
      scale: asset.scale,
      depth: asset.depth,
      facing: asset.facing,
    });

    // Connect to RCON
    const rcon = getRconClient();
    if (!rcon.isConnected()) {
      await rcon.connect();
    }

    // Forceload and build
    await rcon.send(result.forceloadCommand);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await rcon.send('time set 6000');

    let successCount = 0;
    for (const cmd of result.commands) {
      try {
        await rcon.send(cmd);
        successCount++;
      } catch {
        // ignore errors
      }
    }

    // Create new asset record
    const newAsset = createAsset({
      name: `${asset.name} (copy)`,
      imageUrl: asset.image_url || undefined,
      prompt: asset.prompt || undefined,
      generatedImageUrl: asset.generated_image_url || undefined,
      positionX: result.buildInfo.position.x,
      positionY: result.buildInfo.position.y,
      positionZ: result.buildInfo.position.z,
      width: result.buildInfo.width,
      height: result.buildInfo.height,
      depth: asset.depth,
      scale: asset.scale,
      facing: asset.facing,
      createdBy: req.user?.username || 'anonymous',
    });

    // Announce
    await rcon.send(`say §6[World Forge] §a📋 Asset duplicated: ${newAsset.name}`);

    res.status(201).json({
      success: true,
      asset: {
        id: newAsset.id,
        name: newAsset.name,
        position: {
          x: newAsset.position_x,
          y: newAsset.position_y,
          z: newAsset.position_z,
        },
      },
      stats: {
        blocksPlaced: successCount,
      },
    });

  } catch (error) {
    console.error('[Asset] Duplicate error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to duplicate asset',
    });
  }
});

// ============================================================
// NUKE ALL ASSETS
// ============================================================

/**
 * POST /api/assets/nuke
 * Delete ALL assets and reset to vanilla world
 */
router.post('/nuke', async (req, res) => {
  try {
    const { confirm } = req.body;

    if (confirm !== 'NUKE') {
      return res.status(400).json({
        error: 'Confirmation required',
        hint: 'Send { "confirm": "NUKE" } to proceed',
      });
    }

    console.log('[Asset] NUKING ALL ASSETS...');

    const assets = getActiveAssets();
    
    if (assets.length === 0) {
      return res.json({
        success: true,
        message: 'No assets to delete',
        deletedCount: 0,
      });
    }

    // Connect to RCON
    const rcon = getRconClient();
    if (!rcon.isConnected()) {
      await rcon.connect();
    }

    // Announce
    await rcon.send('say §c§l⚠️ NUKING ALL ASSETS IN 5 SECONDS ⚠️');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Find bounding box of all assets
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const asset of assets) {
      minX = Math.min(minX, asset.position_x);
      maxX = Math.max(maxX, asset.position_x + asset.width);
      minY = Math.min(minY, asset.position_y);
      maxY = Math.max(maxY, asset.position_y + asset.height);
      minZ = Math.min(minZ, asset.position_z);
      maxZ = Math.max(maxZ, asset.position_z + asset.depth);
    }

    // Expand bounds
    minX -= 10;
    maxX += 10;
    minZ -= 10;
    maxZ += 10;

    // Forceload
    await rcon.send(`forceload add ${minX} ${minZ} ${maxX} ${maxZ}`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Clear in chunks (respect 32768 block limit)
    const chunkSize = 30;
    for (let y = minY; y <= maxY + 50; y += chunkSize) {
      const yEnd = Math.min(y + chunkSize - 1, maxY + 50);
      try {
        await rcon.send(`fill ${minX} ${y} ${minZ} ${maxX} ${yEnd} ${maxZ} air`);
      } catch {
        // May hit block limit, continue
      }
    }

    // Reset ground
    await rcon.send(`fill ${minX} 64 ${minZ} ${maxX} 64 ${maxZ} grass_block`);
    await rcon.send(`fill ${minX} 60 ${minZ} ${maxX} 63 ${maxZ} dirt`);

    // Mark all as deleted in DB
    const deletedCount = nukeAllAssets();

    // Announce
    await rcon.send(`say §6[World Forge] §a✨ World reset! ${deletedCount} assets removed.`);
    await rcon.send('time set 6000');

    // Teleport to spawn
    await rcon.send('tp @a 0 66 0');

    console.log(`[Asset] NUKED ${deletedCount} assets`);

    res.json({
      success: true,
      message: `Nuked ${deletedCount} assets and reset world`,
      deletedCount,
    });

  } catch (error) {
    console.error('[Asset] Nuke error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to nuke assets',
    });
  }
});

export default router;

