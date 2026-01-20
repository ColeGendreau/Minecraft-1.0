import Anthropic from '@anthropic-ai/sdk';
import type { WorldSpec, Difficulty, GameMode, WorldSize } from '../types/index.js';
import { validateWorldSpecJson } from './validator.js';

// Initialize Anthropic client (only if API key is set)
const anthropic = process.env.ANTHROPIC_API_KEY 
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const MOCK_AI = process.env.MOCK_AI === 'true';

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

// Theme interpretation mappings
// Maps user concepts to Minecraft primitives
const THEME_MAPPINGS: Record<string, {
  biomes: WorldSpec['generation']['biomes'];
  levelType: WorldSpec['generation']['levelType'];
  structures: Partial<WorldSpec['generation']['structures']>;
  motifWords: string[];
}> = {
  // Colors/aesthetic themes
  pink: {
    biomes: ['mushroom_fields', 'plains'],
    levelType: 'default',
    structures: { villages: true },
    motifWords: ['pink', 'cotton candy', 'bubblegum', 'rose', 'cherry blossom'],
  },
  candy: {
    biomes: ['mushroom_fields', 'plains', 'forest'],
    levelType: 'default',
    structures: { villages: true },
    motifWords: ['sweet', 'candy', 'chocolate', 'lollipop', 'gumdrop'],
  },
  dark: {
    biomes: ['dark_forest', 'swamp'],
    levelType: 'default',
    structures: { woodlandMansions: true, strongholds: true },
    motifWords: ['dark', 'gothic', 'shadow', 'night', 'ominous'],
  },
  
  // Branded/cultural themes (approximated)
  ferrari: {
    biomes: ['badlands', 'desert'],
    levelType: 'flat',
    structures: { villages: false },
    motifWords: ['racing', 'fast', 'red', 'checkered', 'track', 'speed'],
  },
  barbie: {
    biomes: ['plains', 'mushroom_fields'],
    levelType: 'default',
    structures: { villages: true },
    motifWords: ['glamorous', 'pink', 'sparkly', 'fashion', 'dream'],
  },
  military: {
    biomes: ['taiga', 'plains', 'forest'],
    levelType: 'default',
    structures: { villages: false, strongholds: true },
    motifWords: ['army', 'boot camp', 'tactical', 'bunker', 'obstacle'],
  },
  
  // Environmental themes
  space: {
    biomes: ['desert', 'badlands'],
    levelType: 'flat',
    structures: { villages: false, temples: false },
    motifWords: ['moon', 'space', 'lunar', 'crater', 'astronaut', 'futuristic'],
  },
  underwater: {
    biomes: ['ocean'],
    levelType: 'default',
    structures: { oceanMonuments: true },
    motifWords: ['underwater', 'atlantis', 'ocean', 'coral', 'aquatic'],
  },
  tropical: {
    biomes: ['jungle', 'ocean'],
    levelType: 'default',
    structures: { temples: true },
    motifWords: ['tropical', 'island', 'beach', 'palm', 'paradise'],
  },
  frozen: {
    biomes: ['ice_spikes', 'taiga'],
    levelType: 'default',
    structures: { villages: true },
    motifWords: ['frozen', 'ice', 'snow', 'arctic', 'winter'],
  },
  volcanic: {
    biomes: ['badlands', 'desert'],
    levelType: 'amplified',
    structures: { mineshafts: true },
    motifWords: ['volcanic', 'lava', 'fire', 'magma', 'inferno'],
  },
  
  // Structural themes
  megastructure: {
    biomes: ['plains'],
    levelType: 'flat',
    structures: { villages: false },
    motifWords: ['giant', 'massive', 'statue', 'monument', 'tower'],
  },
  city: {
    biomes: ['plains'],
    levelType: 'flat',
    structures: { villages: true },
    motifWords: ['city', 'urban', 'skyscraper', 'metropolis', 'downtown'],
  },
  
  // Mood/experience themes
  peaceful: {
    biomes: ['plains', 'birch_forest', 'forest'],
    levelType: 'default',
    structures: { villages: true },
    motifWords: ['peaceful', 'zen', 'calm', 'meditation', 'tranquil', 'garden'],
  },
  challenging: {
    biomes: ['mountains', 'dark_forest'],
    levelType: 'amplified',
    structures: { strongholds: true, mineshafts: true },
    motifWords: ['challenge', 'hardcore', 'difficult', 'survival', 'extreme'],
  },
  adventure: {
    biomes: ['jungle', 'mountains', 'desert'],
    levelType: 'large_biomes',
    structures: { temples: true, villages: true, strongholds: true },
    motifWords: ['adventure', 'explore', 'quest', 'journey', 'expedition'],
  },
};

// Generate a creative world name from the description
function generateWorldName(description: string): string {
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['the', 'and', 'with', 'for', 'that', 'this', 'want', 'like'].includes(w))
    .slice(0, 3);

  if (words.length === 0) {
    return `world-${Date.now().toString(36)}`;
  }

  return words.join('-').slice(0, 32);
}

// Generate a display name from the description
function generateDisplayName(description: string): string {
  // Take the first meaningful phrase
  const cleaned = description
    .replace(/^(i want|create|make|build|generate)\s+(a\s+)?/i, '')
    .split(/[.!?]/)[0]
    .trim();

  // Capitalize first letter of each word, limit length
  return cleaned
    .split(' ')
    .slice(0, 6)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .slice(0, 64) || 'Custom World';
}

// Detect themes from user description
function detectThemes(description: string): string[] {
  const descLower = description.toLowerCase();
  const detectedThemes: string[] = [];

  for (const [themeName, themeData] of Object.entries(THEME_MAPPINGS)) {
    // Check if any motif words match
    for (const motif of themeData.motifWords) {
      if (descLower.includes(motif)) {
        if (!detectedThemes.includes(themeName)) {
          detectedThemes.push(themeName);
        }
        break;
      }
    }
  }

  return detectedThemes;
}

// Interpret creative/abstract descriptions
function interpretDescription(description: string): {
  theme: string;
  biomes: WorldSpec['generation']['biomes'];
  levelType: WorldSpec['generation']['levelType'];
  structures: WorldSpec['generation']['structures'];
  difficulty: Difficulty;
  gameMode: GameMode;
  motd: string;
} {
  const descLower = description.toLowerCase();
  const detectedThemes = detectThemes(description);

  // Merge properties from all detected themes
  let biomes: WorldSpec['generation']['biomes'] = [];
  let levelType: WorldSpec['generation']['levelType'] = 'default';
  let structures: WorldSpec['generation']['structures'] = {
    villages: true,
    strongholds: true,
    mineshafts: true,
    temples: true,
    oceanMonuments: true,
    woodlandMansions: true,
  };

  for (const themeName of detectedThemes) {
    const themeData = THEME_MAPPINGS[themeName];
    if (themeData) {
      // Merge biomes (unique)
      for (const biome of themeData.biomes || []) {
        if (!biomes.includes(biome)) {
          biomes.push(biome);
        }
      }
      // Take the most dramatic level type
      if (themeData.levelType === 'amplified') levelType = 'amplified';
      else if (themeData.levelType === 'flat' && levelType !== 'amplified') levelType = 'flat';
      else if (themeData.levelType === 'large_biomes' && levelType === 'default') levelType = 'large_biomes';

      // Merge structure settings
      structures = { ...structures, ...themeData.structures };
    }
  }

  // Limit biomes to 5
  biomes = biomes.slice(0, 5);

  // Default biomes if none detected
  if (biomes.length === 0) {
    biomes = ['plains', 'forest', 'mountains'];
  }

  // Detect difficulty
  let difficulty: Difficulty = 'normal';
  if (descLower.includes('peaceful') || descLower.includes('relaxed') || descLower.includes('easy')) {
    difficulty = 'peaceful';
  } else if (descLower.includes('easy') || descLower.includes('beginner')) {
    difficulty = 'easy';
  } else if (descLower.includes('hard') || descLower.includes('challenging') || descLower.includes('difficult') || descLower.includes('extreme')) {
    difficulty = 'hard';
  }

  // Detect game mode
  let gameMode: GameMode = 'survival';
  if (descLower.includes('creative') || descLower.includes('build') || descLower.includes('unlimited')) {
    gameMode = 'creative';
  } else if (descLower.includes('adventure') || descLower.includes('explore') || descLower.includes('story')) {
    gameMode = 'adventure';
  }

  // Generate a creative MOTD based on detected themes
  const displayName = generateDisplayName(description);
  const motd = `${displayName.slice(0, 40)} - AI Generated`;

  // Create a theme description that explains AI's interpretation
  const themeDescription = detectedThemes.length > 0
    ? `AI interpreted this as a ${detectedThemes.join(' + ')} themed world. ${description}`
    : `Custom world based on: ${description}`;

  return {
    theme: themeDescription.slice(0, 500),
    biomes,
    levelType,
    structures,
    difficulty,
    gameMode,
    motd,
  };
}

// Determine structure complexity from size and description
function determineComplexity(size: WorldSize | undefined, description: string): number {
  const descLower = description.toLowerCase();
  
  // Base complexity from size
  let complexity = size === 'large' ? 8 : size === 'small' ? 3 : 5;
  
  // Adjust based on keywords
  if (descLower.includes('mega') || descLower.includes('massive') || descLower.includes('huge')) {
    complexity += 2;
  }
  if (descLower.includes('simple') || descLower.includes('minimal') || descLower.includes('basic')) {
    complexity -= 2;
  }
  if (descLower.includes('complex') || descLower.includes('intricate') || descLower.includes('detailed')) {
    complexity += 2;
  }
  if (descLower.includes('epic') || descLower.includes('legendary') || descLower.includes('grand')) {
    complexity += 3;
  }
  
  return Math.max(2, Math.min(10, complexity));
}

// Mock AI planner - interprets ANY user input creatively
function mockPlan(input: PlannerInput): WorldSpec {
  const worldName = generateWorldName(input.description);
  const displayName = generateDisplayName(input.description);
  const interpretation = interpretDescription(input.description);

  console.log(`Mock planning world: "${displayName}" with ${interpretation.levelType} level type`);

  // Build the WorldSpec - NEVER reject, always approximate
  const worldSpec: WorldSpec = {
    worldName,
    displayName,
    theme: interpretation.theme,
    generation: {
      strategy: 'new_seed',
      levelType: interpretation.levelType,
      biomes: interpretation.biomes,
      structures: interpretation.structures,
    },
    rules: {
      difficulty: input.difficulty || interpretation.difficulty,
      gameMode: input.gameMode || interpretation.gameMode,
      hardcore: input.description.toLowerCase().includes('hardcore'),
      pvp: input.description.toLowerCase().includes('pvp') || input.description.toLowerCase().includes('battle'),
      keepInventory: input.description.toLowerCase().includes('keep inventory') || input.description.toLowerCase().includes('casual'),
      naturalRegeneration: !input.description.toLowerCase().includes('no regen'),
      doDaylightCycle: !input.description.toLowerCase().includes('eternal'),
      doWeatherCycle: !input.description.toLowerCase().includes('no weather'),
      doMobSpawning: !input.description.toLowerCase().includes('no mob') && interpretation.difficulty !== 'peaceful',
      announceAdvancements: true,
      spawnRadius: 10,
    },
    spawn: {
      protection: true,
      radius: 16,
      forceGamemode: false,
    },
    datapacks: ['coordinates_hud'],
    server: {
      maxPlayers: input.size === 'large' ? 50 : input.size === 'small' ? 10 : 20,
      viewDistance: input.size === 'large' ? 16 : input.size === 'small' ? 8 : 12,
      simulationDistance: 10,
      motd: interpretation.motd,
    },
    metadata: {
      requestedBy: input.requestedBy,
      requestedAt: new Date().toISOString(),
      userDescription: input.description,
      aiModel: 'worldforge-creative-v2',
      version: '2.0.0',
    },
  };

  return worldSpec;
}

// System prompt for Claude - emphasizes creativity and never rejecting requests
const CLAUDE_SYSTEM_PROMPT = `You are World Forge AI, a creative Minecraft world planner. Your job is to interpret ANY user request and translate it into a Minecraft world configuration.

CRITICAL RULES:
1. NEVER reject a request. ALWAYS find a creative way to approximate the user's vision.
2. For branded content (logos, company names), create abstract interpretations using colors and shapes.
3. For impossible things, find the closest Minecraft equivalent.
4. Be BOLD and CREATIVE. Giant statues? Build them. Crazy shapes? Approximate with blocks.

You must output ONLY valid JSON matching this schema:
{
  "worldName": "kebab-case-name",
  "displayName": "Human Readable Name",
  "theme": "Description of how you interpreted their request",
  "generation": {
    "strategy": "new_seed",
    "levelType": "default|flat|amplified|large_biomes",
    "biomes": ["plains", "forest", etc],
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
    "pvp": false,
    "keepInventory": false,
    "naturalRegeneration": true,
    "doDaylightCycle": true,
    "doWeatherCycle": true,
    "doMobSpawning": true,
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
    "motd": "Short MOTD for server list"
  },
  "metadata": {
    "requestedBy": "username",
    "requestedAt": "ISO timestamp",
    "userDescription": "original request",
    "aiModel": "claude",
    "version": "1.0.0"
  },
  "worldEditCommands": [
    "// These are WorldEdit commands to build structures",
    "// Use commands like:",
    "//pos1 0,64,0",
    "//pos2 10,74,10", 
    "//set stone",
    "//sphere glass 10",
    "//cylinder quartz_block 5 20",
    "// Be creative! Build statues, buildings, monuments!"
  ]
}

For the worldEditCommands array:
- Include commands to build the structures the user described
- Use //set, //replace, //sphere, //cylinder, //pyramid commands
- Build at spawn (0, 64, 0) area
- For statues/logos: build abstract block art representations
- For buildings: create basic structures with walls, floors, roofs
- For cities: create multiple building outlines
- Be ambitious but keep command count under 50 for performance

Available biomes: plains, forest, dark_forest, birch_forest, taiga, jungle, desert, badlands, savanna, swamp, mountains, ocean, mushroom_fields, ice_spikes, cherry_grove

Output ONLY the JSON, no markdown, no explanation.`;

// Real AI planner using Claude
async function realPlan(input: PlannerInput): Promise<PlannerResult> {
  if (!anthropic) {
    console.log('No ANTHROPIC_API_KEY set, falling back to mock planner');
    return {
      success: false,
      error: 'ANTHROPIC_API_KEY not configured. Using mock planner instead.',
    };
  }

  try {
    console.log('Calling Claude AI for world planning...');
    
    const userMessage = `Create a Minecraft world based on this request:

"${input.description}"

Additional preferences:
- Difficulty: ${input.difficulty || 'let AI decide'}
- Game Mode: ${input.gameMode || 'let AI decide'}
- World Size: ${input.size || 'medium'}
- Requested by: ${input.requestedBy}
- Current time: ${new Date().toISOString()}

Remember: Be creative! If they want statues, logos, or custom structures - design them using WorldEdit commands. Never say no, always find a way.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: CLAUDE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text from response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return { success: false, error: 'No text response from Claude' };
    }

    // Parse JSON response
    let worldSpec: WorldSpec & { worldEditCommands?: string[] };
    try {
      // Clean up response (remove any markdown if present)
      let jsonStr = textContent.text.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      }
      worldSpec = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', textContent.text);
      return { success: false, error: `Failed to parse AI response: ${parseError}` };
    }

    // Extract and store worldEditCommands separately (not part of schema)
    const worldEditCommands = worldSpec.worldEditCommands || [];
    delete worldSpec.worldEditCommands;

    // Validate against schema
    const validation = validateWorldSpecJson(worldSpec);
    if (!validation.valid) {
      console.error('Claude output validation failed:', validation.errors);
      // Try to fix common issues
      if (!worldSpec.metadata) {
        worldSpec.metadata = {
          requestedBy: input.requestedBy,
          requestedAt: new Date().toISOString(),
          userDescription: input.description,
          aiModel: 'claude-sonnet-4-20250514',
          version: '1.0.0',
        };
      }
      
      // Re-validate
      const revalidation = validateWorldSpecJson(worldSpec);
      if (!revalidation.valid) {
        return { success: false, error: `AI produced invalid WorldSpec: ${revalidation.errors?.join('; ')}` };
      }
    }

    console.log(`Claude generated world: ${worldSpec.worldName} with ${worldEditCommands.length} WorldEdit commands`);
    
    // Store worldEditCommands in the result for later execution
    // We'll pass them through the worldSpec metadata as a workaround
    if (worldEditCommands.length > 0) {
      (worldSpec as WorldSpec & { _worldEditCommands?: string[] })._worldEditCommands = worldEditCommands;
    }

    return { success: true, worldSpec };

  } catch (error) {
    console.error('Claude API error:', error);
    return {
      success: false,
      error: `AI planning failed: ${(error as Error).message}`,
    };
  }
}

export async function planWorld(input: PlannerInput): Promise<PlannerResult> {
  console.log(`Planning world for: "${input.description.slice(0, 100)}..."`);
  
  // If MOCK_AI is explicitly set, use mock planner
  if (MOCK_AI) {
    console.log('MOCK_AI=true, using mock planner');
    return useMockPlanner(input);
  }

  // Try real Claude AI first if API key is configured
  if (anthropic) {
    console.log('Using Claude AI for creative world planning...');
    const result = await realPlan(input);
    
    if (result.success) {
      return result;
    }
    
    // If Claude failed, fall back to mock
    console.warn(`Claude failed: ${result.error}, falling back to mock planner`);
    return useMockPlanner(input);
  }

  // No API key, use mock
  console.log('No ANTHROPIC_API_KEY set, using mock planner');
  return useMockPlanner(input);
}

function useMockPlanner(input: PlannerInput): PlannerResult {
  const worldSpec = mockPlan(input);

  // Validate the mock output
  const validation = validateWorldSpecJson(worldSpec);
  if (!validation.valid) {
    console.error('Mock planner validation failed:', validation.errors);
    return {
      success: false,
      error: `Mock planner produced invalid WorldSpec: ${validation.errors?.join('; ')}`,
    };
  }

  console.log(`Generated world: ${worldSpec.worldName} (${worldSpec.generation.levelType})`);
  return { success: true, worldSpec };
}
