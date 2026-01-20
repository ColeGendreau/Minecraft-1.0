import { AzureOpenAI } from 'openai';
import type { WorldSpec, Difficulty, GameMode, WorldSize } from '../types/index.js';
import { validateWorldSpecJson } from './validator.js';

// Azure OpenAI configuration - REQUIRED for world generation
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

// Initialize Azure OpenAI client
const azureOpenAI = AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_API_KEY
  ? new AzureOpenAI({
      endpoint: AZURE_OPENAI_ENDPOINT,
      apiKey: AZURE_OPENAI_API_KEY,
      apiVersion: '2024-08-01-preview',
    })
  : null;

interface PlannerInput {
  description: string;
  difficulty?: Difficulty;
  gameMode?: GameMode;
  size?: WorldSize;
  requestedBy: string;
}

interface PlannerResult {
  success: boolean;
  worldSpec?: WorldSpec;
  error?: string;
}

// System prompt for GPT-4o - CREATIVE ARCHITECTURAL GENIUS
// Uses Shape Library for complex forms + fill commands for details
const AI_SYSTEM_PROMPT = `You are WORLD FORGE AI - a CREATIVE ARCHITECTURAL GENIUS for Minecraft.

Your job is to create MIND-BLOWING, EPIC worlds with IMPRESSIVE ARTISTIC structures.

## SHAPE LIBRARY (USE THESE FOR COMPLEX FORMS!)

You have a SHAPE LIBRARY that generates complex 3D shapes automatically. Use these functions:

### SPHERES & DOMES
sphere(x, y, z, radius, block)           - Solid sphere (great for balls, planets, boulders)
hollowSphere(x, y, z, radius, block)     - Hollow sphere shell (orbs, bubbles, domes)
dome(x, y, z, radius, block)             - Half sphere on ground (igloos, observatories)
hollowDome(x, y, z, radius, block)       - Hollow dome (great buildings, arenas)

### CYLINDERS & TUBES
cylinder(x, y, z, radius, height, block) - Solid cylinder (pillars, towers, trunks)
hollowCylinder(x, y, z, radius, height, block) - Tube/pipe (silos, chimneys)

### PYRAMIDS & CONES
pyramid(x, y, z, baseSize, height, block)       - 4-sided pyramid
hollowPyramid(x, y, z, baseSize, height, block) - Hollow pyramid shell
cone(x, y, z, radius, height, block)            - Cone shape (roofs, spires)

### ARCHITECTURAL
arch(x, y, z, width, height, depth, block)      - Archway with curved top
box(x, y, z, width, height, depth, block)       - Hollow rectangular building
box(x, y, z, width, height, depth, block, false) - Solid box
stairs(x, y, z, direction, width, height, block) - Staircase (direction: north/south/east/west)
ring(x, y, z, innerRadius, outerRadius, block)   - Flat ring/donut shape

### BASICS
floor(x1, z1, x2, z2, y, block)                  - Flat platform
wall(x1, y1, z1, x2, y2, z2, block)              - Fill command (same as fill)

## EXAMPLES OF CREATIVE BUILDING

### Basketball House (sphere with details):
sphere(0, 85, 0, 20, orange_concrete)    // Main ball
hollowDome(0, 65, 0, 25, stone_bricks)   // Base building
cylinder(0, 65, 25, 3, 30, iron_block)   // Entrance column
arch(0, 65, 20, 8, 12, 3, stone_bricks)  // Doorway

### Wizard Tower:
cylinder(0, 65, 0, 12, 60, stone_bricks)     // Main tower
hollowDome(0, 125, 0, 15, purple_concrete)   // Dome roof
cone(0, 140, 0, 8, 20, purple_wool)          // Spire
ring(0, 90, 0, 14, 18, stone_bricks)         // Balcony ring

### Egyptian Temple:
pyramid(0, 65, 0, 80, 50, sandstone)         // Great pyramid
box(-60, 65, -60, 30, 20, 40, sandstone)     // Temple building
cylinder(-80, 65, 0, 5, 25, sandstone)       // Obelisk
cylinder(80, 65, 0, 5, 25, sandstone)        // Obelisk

### Space Station:
hollowSphere(0, 100, 0, 30, white_concrete)  // Main hub
hollowCylinder(-50, 95, 0, 8, 10, gray_concrete) // Docking arm
hollowCylinder(50, 95, 0, 8, 10, gray_concrete)  // Docking arm
ring(0, 80, 0, 40, 45, iron_block)           // Solar ring

## YOU CAN ALSO USE RAW FILL COMMANDS

For details, decorations, and custom shapes:
fill x1 y1 z1 x2 y2 z2 block [hollow]

## BLOCK PALETTE

NATURAL: grass_block, dirt, stone, cobblestone, sand, gravel, oak_log, oak_leaves, water
BUILDING: stone_bricks, polished_granite, polished_diorite, bricks, quartz_block, smooth_stone
GLASS: glass, white_stained_glass, light_blue_stained_glass, tinted_glass
WOOD: oak_planks, spruce_planks, dark_oak_planks, oak_log, spruce_log
METAL: iron_block, gold_block, copper_block, netherite_block
DECORATIVE: glowstone, sea_lantern, shroomlight, lantern, torch

CONCRETE COLORS: white, orange, magenta, light_blue, yellow, lime, pink, gray, light_gray, cyan, purple, blue, brown, green, red, black (add _concrete)
WOOL COLORS: same as concrete (add _wool)

## CRITICAL RULES

1. **USE SHAPE LIBRARY** - For ANY curved, spherical, pyramidal, or cylindrical form
2. **BUILD BIG** - Spheres 15-40 radius, towers 40-80 tall, pyramids 60-100 base
3. **MULTIPLE STRUCTURES** - Create a complete themed area with 4-8 major structures
4. **ADD DETAILS** - Use fill commands for floors, windows, decorations after main shapes
5. **CREATIVE NAMES** - Evocative names that capture the world's magic
6. **NEVER REJECT** - Find creative Minecraft equivalent for ANY request

Generate 20-40 shape/fill commands for IMPRESSIVE structures!

## JSON OUTPUT FORMAT

{
  "worldName": "creative-kebab-case-name",
  "displayName": "Epic Creative Name",
  "theme": "Brief description of the world and its structures (max 400 chars)",
  "generation": {
    "strategy": "new_seed",
    "levelType": "flat",
    "biomes": ["plains"],
    "structures": { "villages": false, "strongholds": false, "mineshafts": false, "temples": false, "oceanMonuments": false, "woodlandMansions": false }
  },
  "rules": {
    "difficulty": "peaceful",
    "gameMode": "creative",
    "hardcore": false,
    "pvp": false,
    "keepInventory": true,
    "naturalRegeneration": true,
    "doDaylightCycle": false,
    "doWeatherCycle": false,
    "doMobSpawning": false,
    "announceAdvancements": true,
    "spawnRadius": 10
  },
  "spawn": { "protection": true, "radius": 16, "forceGamemode": false },
  "datapacks": ["coordinates_hud"],
  "server": { "maxPlayers": 20, "viewDistance": 16, "simulationDistance": 12, "motd": "Epic World Description" },
  "metadata": { "requestedBy": "user", "requestedAt": "2026-01-20T12:00:00.000Z", "userDescription": "original prompt", "aiModel": "gpt-4o", "version": "1.0.0" },
  "buildCommands": [
    "sphere(0, 85, 0, 25, orange_concrete)",
    "hollowDome(0, 65, 0, 30, stone_bricks)",
    "pyramid(80, 65, 0, 50, 35, sandstone)",
    "cylinder(-60, 65, 0, 8, 45, quartz_block)",
    "fill -40 64 -40 40 64 40 polished_granite"
  ]
}

VALID BIOMES: plains, forest, dark_forest, birch_forest, taiga, jungle, desert, badlands, savanna, swamp, mountains, ocean, mushroom_fields, ice_spikes, cherry_grove, snowy_plains, beach, river

Output ONLY valid JSON. No markdown, no explanations.`;

/**
 * Plan a Minecraft world using Azure OpenAI GPT-4o
 * This is the ONLY way to create worlds - no mock/fallback
 */
export async function planWorld(input: PlannerInput): Promise<PlannerResult> {
  console.log(`Planning world for: "${input.description.slice(0, 100)}..."`);

  // Azure OpenAI is REQUIRED
  if (!azureOpenAI) {
    const errorMsg = 'Azure OpenAI is not configured. World generation requires AI. ' +
      'Please deploy the infrastructure first (terraform apply in infra/).';
    console.error(errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }

  try {
    console.log(`Calling Azure OpenAI (${AZURE_OPENAI_DEPLOYMENT}) for creative world planning...`);

    const userMessage = `Create an EPIC Minecraft world based on this request:

"${input.description}"

## YOUR TASK

1. INTERPRET creatively - what would make this AMAZING to explore?
2. Design 4-8 IMPRESSIVE structures using the SHAPE LIBRARY
3. Generate 20-40 shape commands + detail fill commands
4. Create an evocative world name

## USER PREFERENCES
- Difficulty: ${input.difficulty || 'peaceful'}
- Game Mode: ${input.gameMode || 'creative'}
- Requested by: ${input.requestedBy}

## BUILD REQUIREMENTS
- Use SHAPE LIBRARY functions for complex forms (spheres, domes, pyramids, cylinders)
- Use fill commands for details, platforms, decorations
- Structures should be IMPRESSIVE (spheres 15-40 radius, towers 40-80 tall)
- Place structures in -150 to 150 X/Z range, base at Y=65
- Ground level is Y=64

## SHAPE LIBRARY REMINDER
sphere(x, y, z, radius, block) - hollowSphere, dome, hollowDome
cylinder(x, y, z, radius, height, block) - hollowCylinder  
pyramid(x, y, z, baseSize, height, block) - hollowPyramid, cone
arch(x, y, z, width, height, depth, block)
box(x, y, z, width, height, depth, block)

Think like a theme park designer. Make it MAGICAL!`;

    const response = await azureOpenAI.chat.completions.create({
      model: AZURE_OPENAI_DEPLOYMENT,
      max_tokens: 8192, // Large output for detailed builds
      temperature: 0.9, // High creativity for epic structures
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'No response from Azure OpenAI' };
    }

    // Parse JSON response
    let worldSpec: WorldSpec & { buildCommands?: string[]; worldEditCommands?: string[] };
    try {
      let jsonStr = content.trim();
      // Remove markdown if present (shouldn't be with json_object mode, but just in case)
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      }
      worldSpec = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse Azure OpenAI response:', content);
      return { success: false, error: `Failed to parse AI response: ${parseError}` };
    }

    // Extract build commands (vanilla Minecraft commands like fill, setblock)
    // Also support legacy worldEditCommands for backwards compatibility
    const buildCommands = worldSpec.buildCommands || worldSpec.worldEditCommands || [];
    delete worldSpec.buildCommands;
    delete worldSpec.worldEditCommands;

    // Truncate theme if AI got too creative (schema limit is 500 chars)
    if (worldSpec.theme && worldSpec.theme.length > 500) {
      console.log(`Truncating theme from ${worldSpec.theme.length} to 500 chars`);
      worldSpec.theme = worldSpec.theme.substring(0, 497) + '...';
    }

    // Ensure metadata is present and valid
    // Always override with correct values since AI may output placeholder text
    worldSpec.metadata = {
      requestedBy: input.requestedBy,
      requestedAt: new Date().toISOString(),
      userDescription: input.description,
      aiModel: AZURE_OPENAI_DEPLOYMENT,
      version: '1.0.0',
    };

    // Validate against schema
    const validation = validateWorldSpecJson(worldSpec);
    if (!validation.valid) {
      console.error('AI output validation failed:', validation.errors);
      return { 
        success: false, 
        error: `AI produced invalid WorldSpec: ${validation.errors?.join('; ')}` 
      };
    }

    console.log(`AI generated world: "${worldSpec.displayName}" with ${buildCommands.length} build commands`);

    // Attach build commands for execution
    if (buildCommands.length > 0) {
      (worldSpec as WorldSpec & { _buildCommands?: string[] })._buildCommands = buildCommands;
    }

    return { success: true, worldSpec };

  } catch (error) {
    console.error('Azure OpenAI API error:', error);
    return {
      success: false,
      error: `AI planning failed: ${(error as Error).message}`,
    };
  }
}
