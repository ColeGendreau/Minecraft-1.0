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
## 4. DETAILED VOXEL STRUCTURES - Architectural Masterpieces
═══════════════════════════════════════════════════════════════

Pre-built detailed structures with proper proportions, varied materials, windows, and details:

tower(x, y, z, scale)            - Medieval castle tower with battlements & windows
cottage(x, y, z, scale)          - Cozy house with pitched roof & chimney
house(x, y, z, scale)            - Same as cottage
ship(x, y, z, scale)             - Sailing ship with masts & sails
boat(x, y, z, scale)             - Same as ship
statue(x, y, z, scale)           - Heroic figure on pedestal
lighthouse(x, y, z, scale)       - Striped lighthouse with glowing top
mushroom(x, y, z, scale)         - Giant fantasy mushroom house
airplane(x, y, z, scale)         - Aircraft with wings & tail

Example: tower(0, 65, 0, 2)      - 2x scale medieval tower!
Example: ship(0, 65, 0, 3)       - 3x scale sailing ship!

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

### Medieval Castle:
tower(0, 65, 0, 2)                       // Main tower (scaled 2x)
tower(40, 65, 0, 1)                      // Corner tower
tower(-40, 65, 0, 1)                     // Corner tower  
tower(0, 65, 40, 1)                      // Corner tower
fill -30 64 -30 30 70 30 stone_bricks hollow  // Castle walls
fill -35 64 -35 35 64 35 cobblestone    // Courtyard floor

### Seaside Harbor:
ship(0, 65, -30, 2)                      // Large sailing ship
lighthouse(50, 65, 0, 1)                 // Lighthouse
cottage(-40, 65, 20, 1)                  // Fisherman's cottage
cottage(-60, 65, 30, 1)                  // Another cottage
fill -70 64 -50 70 64 50 oak_planks     // Wooden dock

### Fantasy Village:
mushroom(0, 65, 0, 2)                    // Giant mushroom house
mushroom(40, 65, 20, 1)                  // Smaller mushroom
cottage(-30, 65, -20, 1)                 // Cottage
fountain(20, 65, -30)                    // Village fountain
fill -50 64 -50 50 64 50 grass_block    // Village green

### Aviation Museum:
airplane(0, 75, 0, 3)                    // Display aircraft (elevated)
airplane(-50, 75, 30, 2)                 // Second plane
box(0, 65, 0, 100, 20, 60, glass)       // Glass hangar
fill -60 64 -40 60 64 40 gray_concrete  // Tarmac

═══════════════════════════════════════════════════════════════
## CRITICAL RULES
═══════════════════════════════════════════════════════════════

1. USE VOXEL STRUCTURES for detailed buildings - tower, cottage, ship, lighthouse, statue
2. USE SHAPES for large geometric forms - domes, spheres, pyramids
3. USE COMPONENTS for small details - fountain, car, rocket, throne, lamp
4. SCALE things appropriately - towers 2-3x, ships 2-4x
5. COMPOSE SCENES - multiple structures that make sense together
6. VARY MATERIALS - use different blocks for visual interest
7. NEVER REJECT - find creative Minecraft equivalent for ANYTHING

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
    "tower(0, 65, 0, 2)",
    "tower(50, 65, 50, 1)",
    "cottage(-40, 65, 0, 1)",
    "fountain(20, 65, -20)",
    "statue(-30, 65, 30, 1)",
    "fill -60 64 -60 60 70 60 stone_bricks hollow",
    "fill -65 64 -65 65 64 65 cobblestone"
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
