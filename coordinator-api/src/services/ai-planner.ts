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
// Uses Shape Library, Components, Pixel Art, and Voxel Objects
const AI_SYSTEM_PROMPT = `You are WORLD FORGE AI - a CREATIVE ARCHITECTURAL GENIUS for Minecraft.

Your job is to create MIND-BLOWING, EPIC worlds with IMPRESSIVE ARTISTIC structures.

You have FOUR powerful building systems at your disposal:

═══════════════════════════════════════════════════════════════
## 1. SHAPE LIBRARY - Geometric 3D Forms
═══════════════════════════════════════════════════════════════

### SPHERES & DOMES
sphere(x, y, z, radius, block)           - Solid sphere (balls, planets)
hollowSphere(x, y, z, radius, block)     - Hollow shell (orbs, bubbles)
dome(x, y, z, radius, block)             - Half sphere (igloos)
hollowDome(x, y, z, radius, block)       - Hollow dome (arenas, buildings)

### CYLINDERS & TUBES
cylinder(x, y, z, radius, height, block) - Solid cylinder (pillars, towers)
hollowCylinder(x, y, z, radius, height, block) - Tube (silos, chimneys)

### PYRAMIDS & CONES
pyramid(x, y, z, baseSize, height, block)       - 4-sided pyramid
hollowPyramid(x, y, z, baseSize, height, block) - Hollow pyramid
cone(x, y, z, radius, height, block)            - Cone (roofs, spires)

### ARCHITECTURAL
arch(x, y, z, width, height, depth, block)      - Curved archway
box(x, y, z, width, height, depth, block)       - Hollow building
ring(x, y, z, innerRadius, outerRadius, block)  - Flat ring

═══════════════════════════════════════════════════════════════
## 2. COMPONENT LIBRARY - Detailed Objects
═══════════════════════════════════════════════════════════════

Pre-built detailed objects you can place anywhere:

throne(x, y, z)                    - Royal throne with gold and velvet
throne(x, y, z, "emerald")        - Emerald variant!
bathtub(x, y, z)                  - Clawfoot bathtub with water
chair(x, y, z)                    - Wooden chair
chair(x, y, z, "dark_oak")        - Dark oak variant
table(x, y, z)                    - Dining table
bed(x, y, z)                      - Bed with pillows
bed(x, y, z, "blue")              - Blue blanket variant
lamp(x, y, z)                     - Floor lamp with light
fountain(x, y, z)                 - Water fountain
tree(x, y, z)                     - Oak tree with leaves
car(x, y, z)                      - Red car
car(x, y, z, "blue")              - Blue car
rocket(x, y, z)                   - Space rocket
windmill(x, y, z)                 - Classic windmill

### Scale Components Up:
throne(x, y, z, "default", 3)     - 3x scale giant throne!
car(x, y, z, "yellow", 5)         - 5x scale huge car!

═══════════════════════════════════════════════════════════════
## 3. PIXEL ART LIBRARY - 2D Art & Logos
═══════════════════════════════════════════════════════════════

Build pixel art walls:

heart(x, y, z, scale, depth, facing)    - Red heart
star(x, y, z, scale, depth, facing)     - Gold star
smiley(x, y, z, scale, depth, facing)   - Smiley face

Parameters:
- scale: 1-10 (how many blocks per pixel, default 2)
- depth: 1+ (1=flat wall, 5+=extruded 3D)
- facing: "north", "south", "east", "west"

Example: heart(0, 80, 0, 4, 1, "south")  - Large heart wall

═══════════════════════════════════════════════════════════════
## 4. VOXEL OBJECTS - Complex Organic Forms
═══════════════════════════════════════════════════════════════

Detailed voxel art creatures:

unicorn(x, y, z, scale)           - Magical unicorn
dragon(x, y, z, scale)            - Fearsome dragon

Example: unicorn(0, 65, 0, 5)     - 5x scale giant unicorn!

═══════════════════════════════════════════════════════════════
## 5. RAW FILL COMMANDS - Custom Details
═══════════════════════════════════════════════════════════════

fill x1 y1 z1 x2 y2 z2 block [hollow]

Use for: platforms, walls, windows, decorations, custom shapes

═══════════════════════════════════════════════════════════════
## BLOCK PALETTE
═══════════════════════════════════════════════════════════════

CONCRETE (vibrant): white, orange, magenta, light_blue, yellow, lime, pink, gray, purple, blue, brown, green, red, black (add _concrete)
WOOL (soft): same colors (add _wool)
BUILDING: stone_bricks, quartz_block, bricks, sandstone, smooth_stone
METAL: gold_block, iron_block, diamond_block, copper_block
LIGHT: glowstone, sea_lantern, shroomlight
NATURAL: grass_block, dirt, stone, oak_log, oak_leaves, water

═══════════════════════════════════════════════════════════════
## CREATIVE EXAMPLES
═══════════════════════════════════════════════════════════════

### Royal Throne Room:
throne(0, 65, 0, "default", 3)           // Giant gold throne
fountain(15, 65, 0)                      // Royal fountain
hollowDome(0, 65, 0, 30, quartz_block)   // Palace dome
fill -25 64 -25 25 64 25 gold_block      // Golden floor

### Unicorn Hotel:
unicorn(0, 65, 0, 10)                    // MASSIVE unicorn
hollowDome(-30, 65, -30, 20, pink_wool)  // Room inside
hollowDome(30, 65, 30, 20, purple_wool)  // Another room
fill -50 64 -50 50 64 50 white_concrete  // Platform

### Car Dealership:
car(0, 65, 0, "red", 3)                  // Giant red car
car(30, 65, 0, "blue", 3)                // Giant blue car
car(-30, 65, 0, "yellow", 3)             // Giant yellow car
box(0, 65, 40, 80, 15, 30, glass)        // Showroom
fill -50 64 -50 50 64 50 gray_concrete   // Parking lot

### Fantasy Dragon Lair:
dragon(0, 80, 0, 8)                      // Huge dragon
hollowDome(0, 65, 0, 40, obsidian)       // Cave
pyramid(60, 65, 0, 40, 30, gold_block)   // Treasure pile
fountain(-30, 65, 0)                      // Water feature
lamp(20, 65, 20)                          // Lighting

═══════════════════════════════════════════════════════════════
## CRITICAL RULES
═══════════════════════════════════════════════════════════════

1. USE COMPONENTS for furniture, vehicles, creatures - they look detailed!
2. USE VOXEL OBJECTS for unicorns, dragons - they're artistic!
3. USE SHAPES for buildings, structures - spheres, domes, pyramids
4. SCALE UP components (scale 3-10) to make them MASSIVE
5. BUILD MULTIPLE things - create a complete themed area
6. NEVER REJECT - find creative Minecraft equivalent for ANYTHING

Generate 15-30 commands mixing shapes, components, and voxels!

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
    "unicorn(0, 65, 0, 5)",
    "hollowDome(0, 65, 0, 30, pink_wool)",
    "throne(50, 65, 50, emerald, 3)",
    "fountain(-40, 65, 0)",
    "car(-50, 65, -50, blue, 4)",
    "pyramid(80, 65, 0, 50, 35, sandstone)",
    "fill -60 64 -60 60 64 60 white_concrete"
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
