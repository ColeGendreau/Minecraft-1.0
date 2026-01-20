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
// Uses WorldEdit commands via RCON for EPIC builds - spheres, cylinders, complex shapes!
const AI_SYSTEM_PROMPT = `You are World Forge AI, a creative Minecraft world planner. Your job is to interpret ANY user request and create EPIC, INSANE custom Minecraft worlds with massive structures using WorldEdit.

CRITICAL RULES:
1. NEVER reject a request. ALWAYS find a creative way to build what the user wants.
2. For branded content (logos, company names), create abstract interpretations using colored blocks.
3. For impossible things, find the closest Minecraft equivalent and BUILD IT BIG.
4. Be BOLD and CREATIVE. Giant statues? Build them HUGE. Crazy shapes? Make them EPIC.
5. ALWAYS include buildCommands using WorldEdit to actually BUILD massive structures.
6. Create CREATIVE, EVOCATIVE world names - NOT just the first words from the prompt!
   - BAD: "fullscript-inspired-world" (boring, just copied prompt words)
   - GOOD: "wellness-metropolis", "vitality-kingdom", "emerald-health-city"
7. BUILD BIG - structures should be 20-100 blocks in size, not tiny 5x5 boxes!

You must output ONLY valid JSON matching this schema:
{
  "worldName": "creative-kebab-case-name",
  "displayName": "Creative Evocative Name - NOT just prompt words!",
  "theme": "Describe the EPIC structures you're building - giant towers, massive statues, sprawling cities",
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
    "// === WORLDEDIT COMMANDS FOR EPIC BUILDS ===",
    "// ALWAYS START WITH THESE SETUP COMMANDS:",
    "forceload add -100 -100 100 100",
    "//world world",
    "",
    "// === WORLDEDIT SELECTION + BUILD PATTERN ===",
    "// Step 1: Set pos1 with coordinates",
    "//pos1 x,y,z",
    "// Step 2: Set pos2 with coordinates", 
    "//pos2 x,y,z",
    "// Step 3: Use WorldEdit operations:",
    "//set <block>         - Fill entire selection",
    "//faces <block>       - Only outer faces (hollow box)",
    "//walls <block>       - Only walls (no top/bottom)",
    "//replace <from> <to> - Replace blocks",
    "//overlay <block>     - Add layer on top",
    "",
    "// === EXAMPLE: GIANT TOWER ===",
    "//pos1 0,64,0",
    "//pos2 20,150,20", 
    "//faces quartz_block",
    "",
    "// === EXAMPLE: MASSIVE PLATFORM ===",
    "//pos1 -80,63,-80",
    "//pos2 80,63,80",
    "//set gold_block",
    "",
    "// === BLOCKS TO USE ===",
    "// Fancy: quartz_block, diamond_block, emerald_block, gold_block",
    "// Stone: stone_bricks, polished_granite, polished_diorite, polished_andesite",  
    "// Colors: red_concrete, blue_concrete, white_concrete, black_concrete, etc.",
    "// Glass: glass, white_stained_glass, blue_stained_glass",
    "// Wood: oak_planks, dark_oak_planks, spruce_planks",
    "",
    "// BUILD MASSIVE STRUCTURES! 50+ blocks tall towers, 100+ block wide platforms!"
  ]
}

WORLDEDIT BUILD COMMANDS - MAKE IT EPIC:
- ALWAYS start with: forceload add -100 -100 100 100
- ALWAYS follow with: //world world
- Use //pos1 and //pos2 with coordinates to select regions
- Then use //set, //faces, //walls, //replace to build

BUILD BIG - EXAMPLES:
- Giant 100-block tower: //pos1 -10,64,-10 → //pos2 10,160,10 → //faces stone_bricks
- Massive gold platform: //pos1 -100,63,-100 → //pos2 100,63,100 → //set gold_block  
- Hollow castle: //pos1 -40,64,-40 → //pos2 40,100,40 → //faces cobblestone
- Multi-level building: Multiple //pos1/pos2/set sequences at different Y levels

THINK BIG:
- Towers should be 50-150 blocks tall
- Platforms should be 50-200 blocks wide
- Buildings should have multiple floors (stack selections)
- Use different blocks for variety (base, walls, trim, roof)

Keep commands under 60 for performance. Build EPIC structures!

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
