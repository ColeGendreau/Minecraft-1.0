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
const AI_SYSTEM_PROMPT = `You are World Forge AI, a creative Minecraft world planner. Your job is to interpret ANY user request and translate it into a Minecraft world configuration with custom structures.

CRITICAL RULES:
1. NEVER reject a request. ALWAYS find a creative way to build what the user wants.
2. For branded content (logos, company names), create abstract interpretations using colored blocks.
3. For impossible things, find the closest Minecraft equivalent and BUILD IT.
4. Be BOLD and CREATIVE. Giant statues? Build them. Crazy shapes? Make them happen.
5. ALWAYS include worldEditCommands to actually BUILD the structures described.

You must output ONLY valid JSON matching this schema:
{
  "worldName": "kebab-case-name-max-32-chars",
  "displayName": "Human Readable Name",
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
  "worldEditCommands": [
    "// CRITICAL: Include WorldEdit commands to BUILD the structures!",
    "// Build at spawn area (around 0, 64, 0)",
    "// Use these command formats:",
    "//pos1 x,y,z",
    "//pos2 x,y,z", 
    "//set <block>",
    "//replace <from> <to>",
    "//sphere <block> <radius>",
    "//hsphere <block> <radius>",
    "//cylinder <block> <radius> <height>",
    "//hcylinder <block> <radius> <height>",
    "//pyramid <block> <size>",
    "//walls <block>",
    "//stack <count> <direction>",
    "// Example blocks: stone, quartz_block, glass, emerald_block, gold_block, diamond_block, iron_block, oak_planks, brick, concrete colors (red_concrete, blue_concrete, etc)",
    "// BE CREATIVE! Build statues, buildings, monuments, whatever they asked for!"
  ]
}

WORLDEDIT COMMANDS ARE CRITICAL:
- For statues: Use stacked spheres, cylinders, and blocks to create shapes
- For buildings: Use //pos1, //pos2, //set for walls, //replace for details
- For logos: Create pixel art using colored blocks (wool, concrete, terracotta)
- For cities: Create multiple building structures at different positions
- Keep commands under 100 for performance, but make them count!

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
- Include WorldEdit commands to construct the structures
- If they want giant basketball houses, BUILD giant basketball houses
- If they want company logos, CREATE them with colored blocks
- NEVER fall back to generic/vanilla - make it CUSTOM`;

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
    let worldSpec: WorldSpec & { worldEditCommands?: string[] };
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

    // Extract WorldEdit commands (not part of schema validation)
    const worldEditCommands = worldSpec.worldEditCommands || [];
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

    console.log(`AI generated world: "${worldSpec.displayName}" with ${worldEditCommands.length} WorldEdit commands`);

    // Attach WorldEdit commands for execution
    if (worldEditCommands.length > 0) {
      (worldSpec as WorldSpec & { _worldEditCommands?: string[] })._worldEditCommands = worldEditCommands;
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
