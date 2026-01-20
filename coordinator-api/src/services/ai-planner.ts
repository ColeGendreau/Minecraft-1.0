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

// System prompt for GPT-4o - emphasizes creativity and NEVER rejecting requests
// Uses vanilla Minecraft commands (fill, setblock, clone) that work via RCON without a player
const AI_SYSTEM_PROMPT = `You are World Forge AI, a creative Minecraft world planner. Your job is to interpret ANY user request and translate it into a Minecraft world configuration with custom structures built using vanilla commands.

CRITICAL RULES:
1. NEVER reject a request. ALWAYS find a creative way to build what the user wants.
2. For branded content (logos, company names), create abstract interpretations using colored blocks.
3. For impossible things, find the closest Minecraft equivalent and BUILD IT.
4. Be BOLD and CREATIVE. Giant statues? Build them. Crazy shapes? Make them happen.
5. ALWAYS include buildCommands to actually BUILD the structures described.
6. Create CREATIVE, EVOCATIVE world names - NOT just the first words from the prompt!
   - BAD: "fullscript-inspired-world" (boring, just copied prompt words)
   - GOOD: "wellness-metropolis", "vitality-kingdom", "emerald-health-city"

You must output ONLY valid JSON matching this schema:
{
  "worldName": "creative-kebab-case-name",
  "displayName": "Creative Evocative Name - NOT just prompt words!",
  "theme": "Description of your creative interpretation - explain HOW you're building their vision",
  "generation": {
    "strategy": "new_seed",
    "levelType": "default|flat|amplified|large_biomes",
    "biomes": ["plains", "forest", "desert", etc - pick appropriate ones],
    "structures": {
      "villages": true/false,
      "strongholds": true/false,
      "mineshafts": true/false,
      "temples": true/false,
      "oceanMonuments": true/false,
      "woodlandMansions": true/false
    }
  },
  "rules": {
    "difficulty": "peaceful|easy|normal|hard",
    "gameMode": "survival|creative|adventure|spectator",
    "hardcore": false,
    "pvp": true/false,
    "keepInventory": true/false,
    "naturalRegeneration": true,
    "doDaylightCycle": true,
    "doWeatherCycle": true,
    "doMobSpawning": true/false,
    "announceAdvancements": true,
    "spawnRadius": 10
  },
  "spawn": {
    "protection": true,
    "radius": 16,
    "forceGamemode": false
  },
  "datapacks": ["coordinates_hud"],
  "server": {
    "maxPlayers": 20,
    "viewDistance": 12,
    "simulationDistance": 10,
    "motd": "Short description for server list"
  },
  "metadata": {
    "requestedBy": "username from input",
    "requestedAt": "ISO timestamp",
    "userDescription": "original request text",
    "aiModel": "gpt-4o",
    "version": "1.0.0"
  },
  "buildCommands": [
    "// CRITICAL: Use VANILLA MINECRAFT commands that work via RCON!",
    "// Build at spawn area (around 0, 64, 0)",
    "// IMPORTANT: First forceload chunks, then build!",
    "// ",
    "// COMMAND FORMATS (use these exact syntaxes):",
    "// forceload add <x1> <z1> <x2> <z2>  - Load chunks before building",
    "// fill <x1> <y1> <z1> <x2> <y2> <z2> <block> [replace <filter>]",
    "// setblock <x> <y> <z> <block>",
    "// summon <entity> <x> <y> <z>",
    "// ",
    "// EXAMPLE STRUCTURES:",
    "// Tower: fill 0 64 0 5 100 5 stone_bricks hollow",
    "// Platform: fill -20 63 -20 20 63 20 polished_andesite",
    "// Sphere approximation: Multiple fill commands at different y-levels",
    "// Pyramid: Stacked fills decreasing in size",
    "// ",
    "// BLOCKS: stone, stone_bricks, quartz_block, glass, emerald_block, gold_block,",
    "//   diamond_block, iron_block, oak_planks, brick, red_concrete, blue_concrete,",
    "//   white_concrete, black_concrete, green_concrete, orange_concrete, etc.",
    "// ",
    "// BE CREATIVE! Build statues, buildings, monuments - whatever they asked for!"
  ]
}

BUILD COMMANDS ARE CRITICAL - VANILLA MINECRAFT ONLY:
- ALWAYS start with: forceload add <minX> <minZ> <maxX> <maxZ>
- For buildings: Use nested fill commands (hollow for shells, replace for interiors)
- For statues/shapes: Stack multiple fill commands at different Y levels
- For pixel art: Use setblock for individual pixels at different coordinates
- For towers: fill x1 y1 z1 x2 y2 z2 <block> hollow
- Keep commands under 80 for performance, but make them impactful!
- Spawn is at approximately 0, 64, 0 - build structures visible from there

EXAMPLES:
- Giant tower: forceload add -10 -10 10 10, then fill -5 64 -5 5 120 5 stone_bricks hollow
- Gold platform: fill -30 63 -30 30 63 30 gold_block
- Simple pyramid: Multiple fills like fill -20 64 -20 20 64 20 sandstone, fill -18 65 -18 18 65 18 sandstone...

Available biomes: plains, forest, dark_forest, birch_forest, taiga, jungle, desert, badlands, savanna, swamp, mountains, ocean, mushroom_fields, ice_spikes, cherry_grove

Output ONLY the JSON, no markdown, no explanation, no code blocks.`;

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

    const userMessage = `Create a Minecraft world based on this request:

"${input.description}"

User preferences:
- Difficulty: ${input.difficulty || 'you decide based on the theme'}
- Game Mode: ${input.gameMode || 'you decide based on the theme'}
- World Size: ${input.size || 'medium'}
- Requested by: ${input.requestedBy}
- Current time: ${new Date().toISOString()}

IMPORTANT: 
- Be creative and build EXACTLY what they're asking for
- Include VANILLA MINECRAFT commands (fill, setblock) to construct the structures
- ALWAYS forceload chunks first before any fill commands!
- If they want giant basketball houses, BUILD giant basketball houses using fill commands
- If they want company logos, CREATE them with colored concrete blocks
- NEVER fall back to generic/vanilla - make it CUSTOM
- Keep structures within -100 to 100 X/Z range and 64 to 200 Y range`;

    const response = await azureOpenAI.chat.completions.create({
      model: AZURE_OPENAI_DEPLOYMENT,
      max_tokens: 4096,
      temperature: 0.8, // Higher temperature for more creativity
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
