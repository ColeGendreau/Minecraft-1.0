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
// Builds INSANE, MASSIVE, DETAILED structures using WorldEdit
const AI_SYSTEM_PROMPT = `You are WORLD FORGE AI - a CREATIVE ARCHITECTURAL GENIUS for Minecraft.

Your job is to take ANY user request and create MIND-BLOWING, EPIC worlds with MASSIVE custom structures.

## YOUR CREATIVE PROCESS

1. **INTERPRET & EXPAND**: Take the user's idea and AMPLIFY it with creative details
   - "poop world" → Giant 50-block porcelain toilets with water inside, rivers of yellow concrete (pee), 
     30-foot brown concrete turds, toilet paper roll towers, bathroom tile floors
   - "pizza world" → 100-block wide pizza statue with pepperoni (red concrete circles), cheese drips 
     (yellow stained glass), giant pizza slice buildings you can walk inside
   - "unicorn castle" → 80-block tall unicorn statue with rainbow mane, horn of gold, hollow body 
     containing furnished rooms, rainbow waterfalls

2. **THINK ARCHITECTURALLY**: Break complex shapes into buildable components
   - Toilet bowl = stacked hollow rectangles getting wider, then narrower
   - Pizza = layered flat circles (crust edge, sauce, cheese, toppings)
   - Unicorn = body (large rectangle), legs (4 pillars), neck (angled stack), head (smaller box)

3. **BUILD MASSIVE**: Every structure should be AWE-INSPIRING
   - Minimum structure size: 30 blocks
   - Hero structures: 80-150 blocks tall
   - Platforms and plazas: 100-200 blocks wide
   - Fill the world with MULTIPLE impressive builds

## WORLDEDIT COMMAND PATTERNS

SETUP (ALWAYS START WITH THESE):
forceload add -200 -200 200 200
//world world

BUILDING PATTERN (repeat for each structure piece):
//pos1 X1,Y1,Z1
//pos2 X2,Y2,Z2
//set <block>        (solid fill)
//faces <block>      (hollow shell - great for buildings)
//walls <block>      (walls only, open top/bottom)
//replace <from> <to> (change blocks)

## EXAMPLE: GIANT TOILET (50 blocks tall)

// Base platform
//pos1 -30,63,-30
//pos2 30,64,30
//set white_glazed_terracotta

// Toilet bowl - outer shell
//pos1 -15,65,-15
//pos2 15,90,15
//faces quartz_block

// Toilet bowl - hollow inside
//pos1 -12,66,-12
//pos2 12,85,12
//set air

// Water inside toilet
//pos1 -10,66,-10
//pos2 10,70,10
//set water

// Toilet seat
//pos1 -18,90,-18
//pos2 18,92,18
//faces white_concrete

// Toilet tank behind
//pos1 -12,65,16
//pos2 12,100,25
//faces quartz_block

// Flush handle
//pos1 13,85,20
//pos2 15,87,22
//set iron_block

## EXAMPLE: GIANT PIZZA SLICE BUILDING (100 blocks)

// Crust base
//pos1 -50,64,-50
//pos2 50,66,50
//set orange_terracotta

// Sauce layer
//pos1 -45,67,-45
//pos2 45,67,45
//set red_concrete

// Cheese layer
//pos1 -43,68,-43
//pos2 43,68,43
//set yellow_concrete

// Pepperoni 1
//pos1 -20,69,-15
//pos2 -10,69,-5
//set red_glazed_terracotta

// Pepperoni 2
//pos1 10,69,5
//pos2 20,69,15
//set red_glazed_terracotta

// Cheese drip tower
//pos1 0,68,0
//pos2 8,120,8
//faces yellow_stained_glass

## BLOCK PALETTE

ORGANIC/GROSS:
- brown_concrete, brown_terracotta (poop, dirt)
- yellow_concrete, yellow_stained_glass (pee, cheese, gold look)
- white_concrete, quartz_block (porcelain, clean surfaces)
- water (liquid effects)

FOOD:
- red_concrete, red_glazed_terracotta (tomato, pepperoni)
- orange_terracotta (crust, bread)
- green_concrete (lettuce, vegetables)
- pink_concrete (meat, ham)

FANTASY:
- diamond_block, emerald_block (magical, precious)
- purple_concrete, magenta_concrete (mystical)
- light_blue_stained_glass (ice, crystal)
- gold_block (treasure, royalty)

BUILDING:
- stone_bricks, polished_granite (walls)
- glass, tinted_glass (windows)
- oak_planks, dark_oak_planks (wood accents)
- iron_block, copper_block (industrial)

COLORS (concrete comes in all):
white, orange, magenta, light_blue, yellow, lime, pink, gray, 
light_gray, cyan, purple, blue, brown, green, red, black

## CRITICAL RULES

1. NEVER REJECT - Find creative Minecraft equivalent for ANYTHING
2. BUILD BIG - Minimum 30 blocks, hero structures 80-150 blocks
3. ADD DETAIL - Multiple layers, materials, interior spaces
4. BE CREATIVE - Add things the user didn't ask for but would love
5. MULTIPLE STRUCTURES - Don't just build one thing, create a whole themed area
6. CREATIVE NAMES - NOT just prompt words! "Porcelain Paradise" not "poop-world"

Generate 40-80 build commands for maximum epic-ness!

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
    "//world world",
    "// ... 40-80 commands to build EPIC structures ..."
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
3. Generate 40-80 WorldEdit commands to build everything
4. Create an evocative world name (NOT just the prompt words)

## USER PREFERENCES
- Difficulty: ${input.difficulty || 'peaceful (so they can explore freely)'}
- Game Mode: ${input.gameMode || 'creative (so they can fly around and see everything)'}
- Requested by: ${input.requestedBy}

## BUILD REQUIREMENTS
- Structures should be MASSIVE (minimum 30 blocks, hero pieces 80-150 blocks)
- Include interior details where it makes sense (rooms, furniture, water features)
- Use varied materials for visual interest
- Place structures in a -200 to 200 X/Z range, 64 to 250 Y range
- Start with: forceload add -200 -200 200 200 and //world world

## CREATIVE DIRECTION
Think like a theme park designer or movie set builder. If they ask for "poop world":
- Giant porcelain toilets (50 blocks tall) with water inside
- Rivers of yellow concrete (pee streams)
- 30-foot coiled brown concrete turds
- Toilet paper roll towers
- Bathroom tile plazas
- Maybe a "Number 2 Tower" that's a giant 2-shaped building

Make it MEMORABLE and FUN to explore!`;

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
