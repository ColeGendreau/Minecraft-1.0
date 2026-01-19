import type { WorldSpec, Difficulty, GameMode, WorldSize, GeneratedStructure } from '../types/index.js';
import { validateWorldSpecJson } from './validator.js';
import { generateStructuresFromDescription } from './structure-generator.js';

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

  // Generate WorldEdit structures based on the description
  const complexity = determineComplexity(input.size, input.description);
  let structures: GeneratedStructure[] = [];
  
  try {
    console.log(`Generating structures for "${displayName}" with complexity ${complexity}...`);
    structures = generateStructuresFromDescription(
      input.description,
      worldName,
      complexity
    );
    console.log(`Generated ${structures.length} unique structures with ${structures.reduce((sum, s) => sum + s.commands.length, 0)} WorldEdit commands`);
  } catch (error) {
    console.error('Structure generation failed, continuing without structures:', error);
    structures = [];
  }

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
      structureCount: structures.length,
      totalWorldEditCommands: structures.reduce((sum, s) => sum + s.commands.length, 0),
    },
    // Include the generated structures
    structures: structures.length > 0 ? structures : undefined,
  };

  return worldSpec;
}

// Real AI planner (placeholder for future implementation)
async function realPlan(input: PlannerInput): Promise<PlannerResult> {
  // TODO: Implement real OpenAI/Azure OpenAI integration
  // The system prompt would emphasize:
  // 1. NEVER reject user input
  // 2. Always interpret creatively using available primitives
  // 3. Output ONLY valid WorldSpec JSON
  // 4. Approximate branded/abstract concepts using colors, biomes, structures
  
  return {
    success: false,
    error: 'Real AI planner not implemented. Set MOCK_AI=true for development.',
  };
}

export async function planWorld(input: PlannerInput): Promise<PlannerResult> {
  console.log(`Planning world for: "${input.description.slice(0, 100)}..."`);
  
  if (MOCK_AI) {
    console.log('Using mock AI planner (creative interpretation mode)');
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

  return realPlan(input);
}
