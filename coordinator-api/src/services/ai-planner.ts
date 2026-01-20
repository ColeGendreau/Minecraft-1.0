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
// Builds MASSIVE structures using vanilla /fill commands (reliable via RCON)
const AI_SYSTEM_PROMPT = `You are WORLD FORGE AI - a CREATIVE ARCHITECTURAL GENIUS for Minecraft.

Your job is to take ANY user request and create MIND-BLOWING, EPIC worlds with MASSIVE custom structures.

## YOUR CREATIVE PROCESS

1. **INTERPRET & EXPAND**: Take the user's idea and AMPLIFY it creatively
   - Add supporting structures, environmental details, and thematic elements
   - Think about what would make this place feel ALIVE and EXPLORABLE
   - Consider the story: who lives here? What happens here?

2. **THINK ARCHITECTURALLY**: Break ANY shape into buildable rectangular components
   - Curved shapes = stacked rectangles of varying sizes
   - Organic forms = overlapping boxes and slabs
   - Complex objects = decompose into body, supports, details, accents

3. **BUILD MASSIVE**: Every structure should be AWE-INSPIRING
   - Minimum structure size: 30 blocks
   - Hero structures: 80-150 blocks tall
   - Platforms and plazas: 100-200 blocks wide
   - Fill the world with MULTIPLE impressive builds

## VANILLA /fill COMMAND FORMAT

ALWAYS use vanilla Minecraft /fill commands (NOT WorldEdit):

fill x1 y1 z1 x2 y2 z2 <block> [mode]

MODES:
- (no mode) = solid fill - fills entire region with block
- hollow = shell only - outer walls filled, interior becomes air (perfect for buildings!)
- outline = shell only - outer walls filled, interior unchanged
- keep = only replaces air blocks

SETUP COMMAND (always first):
forceload add -200 -200 200 200

BUILDING TECHNIQUES:

1. HOLLOW BUILDING (most useful for structures):
   fill -20 65 -20 20 100 20 stone_bricks hollow
   Creates a hollow box - perfect for towers, buildings, rooms

2. SOLID FILL (for foundations, platforms, solid objects):
   fill -30 63 -30 30 64 30 polished_granite
   
3. LAYERED CONSTRUCTION (build from bottom up):
   fill -25 64 -25 25 64 25 stone_bricks
   fill -23 65 -23 23 80 23 stone_bricks hollow
   fill -23 81 -23 23 81 23 stone_brick_slab

4. INTERIOR DETAILS (after hollow shell):
   fill -10 65 -10 10 65 10 oak_planks
   fill 0 66 0 0 70 0 oak_fence

## BLOCK PALETTE

NATURAL: grass_block, dirt, stone, cobblestone, sand, gravel, oak_log, oak_leaves, water
BUILDING: stone_bricks, polished_granite, polished_diorite, bricks, quartz_block, smooth_stone
GLASS: glass, white_stained_glass, light_blue_stained_glass, tinted_glass
WOOD: oak_planks, spruce_planks, dark_oak_planks, oak_log, spruce_log
METAL: iron_block, gold_block, copper_block, netherite_block
DECORATIVE: glowstone, sea_lantern, shroomlight, lantern, torch

CONCRETE COLORS (use _concrete suffix):
white, orange, magenta, light_blue, yellow, lime, pink, gray, light_gray, cyan, purple, blue, brown, green, red, black

WOOL COLORS (use _wool suffix): same colors as concrete

## CRITICAL RULES

1. NEVER REJECT - Find creative Minecraft equivalent for ANYTHING
2. BUILD BIG - Minimum 30 blocks, hero structures 80-150 blocks
3. USE HOLLOW MODE - For any building/structure, use "hollow" to create interior space
4. LAYER YOUR BUILDS - Multiple fill commands create detail and depth
5. MULTIPLE STRUCTURES - Don't just build one thing, create a whole themed area
6. CREATIVE NAMES - Evocative, thematic names that capture the world's essence
7. NO WORLDEDIT - Only use vanilla /fill commands (no // prefix commands)

Generate 30-60 fill commands for epic structures!

## JSON OUTPUT FORMAT

{
  "worldName": "creative-kebab-case-name",
  "displayName": "Epic Creative Name",
  "theme": "Detailed description of ALL the amazing structures being built",
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
  "metadata": { "requestedBy": "user", "requestedAt": "ISO", "userDescription": "original", "aiModel": "gpt-4o", "version": "1.0.0" },
  "buildCommands": [
    "forceload add -200 -200 200 200",
    "fill -30 64 -30 30 65 30 stone_bricks",
    "fill -25 66 -25 25 100 25 stone_bricks hollow"
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

1. EXPAND this idea creatively - add exciting details the user would love
2. Design MULTIPLE massive structures (30-150 blocks each)
3. Generate 30-60 vanilla /fill commands to build everything
4. Create an evocative world name (NOT just the prompt words)

## USER PREFERENCES
- Difficulty: ${input.difficulty || 'peaceful (so they can explore freely)'}
- Game Mode: ${input.gameMode || 'creative (so they can fly around and see everything)'}
- Requested by: ${input.requestedBy}

## BUILD REQUIREMENTS
- Use vanilla /fill commands ONLY (no WorldEdit // commands)
- Structures should be MASSIVE (minimum 30 blocks, hero pieces 80-150 blocks)
- Use "hollow" mode for buildings to create interior space
- Place structures in a -200 to 200 X/Z range, 64 to 250 Y range
- Start with: forceload add -200 -200 200 200

## CREATIVE DIRECTION
Think like a theme park designer or movie set builder. Make it MEMORABLE and FUN to explore!`;

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

    // Ensure metadata is present
    if (!worldSpec.metadata) {
      worldSpec.metadata = {
        requestedBy: input.requestedBy,
        requestedAt: new Date().toISOString(),
        userDescription: input.description,
        aiModel: AZURE_OPENAI_DEPLOYMENT,
        version: '1.0.0',
      };
    }

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
