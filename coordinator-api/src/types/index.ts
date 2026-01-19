// World Request Status Lifecycle
export type WorldRequestStatus =
  | 'pending'
  | 'planned'
  | 'building'
  | 'pr_created'
  | 'deployed'
  | 'failed';

// User input toggles
export type Difficulty = 'peaceful' | 'easy' | 'normal' | 'hard';
export type GameMode = 'survival' | 'creative' | 'adventure' | 'spectator';
export type WorldSize = 'small' | 'medium' | 'large';

// Database row types
export interface WorldRequestRow {
  id: string;
  status: WorldRequestStatus;
  user_github_id: string;
  user_github_username: string;
  description: string;
  difficulty: Difficulty | null;
  game_mode: GameMode | null;
  size: WorldSize | null;
  worldspec_json: string | null;
  pr_url: string | null;
  commit_sha: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeploymentRow {
  id: string;
  world_name: string;
  commit_sha: string;
  deployed_at: string;
  worldspec_json: string | null;
  is_current: number;
}

// API Request/Response types
export interface CreateWorldRequest {
  description: string;
  difficulty?: Difficulty;
  gameMode?: GameMode;
  size?: WorldSize;
}

export interface CreateWorldResponse {
  id: string;
  status: WorldRequestStatus;
  message: string;
  estimatedTime: string;
}

export interface WorldListItem {
  id: string;
  worldName: string | null;
  displayName: string | null;
  status: WorldRequestStatus;
  requestedBy: string;
  requestedAt: string;
  deployedAt: string | null;
  prUrl: string | null;
}

export interface WorldListResponse {
  worlds: WorldListItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface WorldDetailResponse {
  id: string;
  status: WorldRequestStatus;
  requestedBy: string;
  requestedAt: string;
  updatedAt: string;
  request: {
    description: string;
    difficulty: Difficulty | null;
    gameMode: GameMode | null;
    size: WorldSize | null;
  };
  worldSpec: WorldSpec | null;
  prUrl: string | null;
  commitSha: string | null;
  error: ErrorDetail | null;
}

export interface ErrorDetail {
  message: string;
  details?: string;
}

export interface CurrentWorldResponse {
  worldName: string;
  displayName: string;
  deployedAt: string;
  commitSha: string;
  commitUrl: string;
  spec: WorldSpec;
}

// WorldSpec Schema Types (matches schemas/worldspec.schema.json)
export interface WorldSpec {
  worldName: string;
  displayName?: string;
  theme: string;
  generation: WorldGeneration;
  rules: WorldRules;
  spawn?: SpawnConfig;
  datapacks?: DatapackName[];
  server?: ServerConfig;
  metadata?: WorldMetadata;
  // AI-generated WorldEdit structures
  structures?: GeneratedStructure[];
}

// ============== WORLDEDIT STRUCTURE TYPES ==============

/**
 * A generated structure with WorldEdit commands
 * Each structure is procedurally generated based on theme and parameters
 */
export interface GeneratedStructure {
  id: string;
  name: string;
  description: string;
  // Relative position from spawn (or absolute coordinates)
  position: StructurePosition;
  // Category affects generation style
  category: StructureCategory;
  // The sequence of WorldEdit commands to execute
  commands: WorldEditCommand[];
  // Estimated block count for progress tracking
  estimatedBlocks: number;
  // Tags for filtering and organization
  tags: string[];
}

export interface StructurePosition {
  x: number;
  y: number;
  z: number;
  // If true, position is relative to spawn point
  relativeToSpawn: boolean;
}

export type StructureCategory =
  | 'tower'           // Vertical structures
  | 'monument'        // Large centerpiece structures
  | 'terrain'         // Landscape modifications
  | 'organic'         // Natural/curved shapes
  | 'architectural'   // Buildings, arches, walls
  | 'decoration'      // Details, paths, gardens
  | 'megastructure'   // Massive world-defining builds
  | 'floating'        // Suspended/flying structures
  | 'underground'     // Subterranean structures
  | 'water';          // Aquatic features

/**
 * A single WorldEdit command with metadata
 */
export interface WorldEditCommand {
  // The raw command (e.g., "//cyl stone 10 50")
  command: string;
  // Human-readable description for logging
  description?: string;
  // Delay in ms before executing (for visual effect or server stability)
  delayMs?: number;
  // If true, failure of this command won't stop the sequence
  optional?: boolean;
}

/**
 * WorldEdit pattern string (e.g., "50%stone,30%cobblestone,20%andesite")
 */
export type BlockPattern = string;

/**
 * Parameters for procedural structure generation
 */
export interface StructureGenerationParams {
  // Seed for reproducible randomness
  seed: string;
  // Theme influences material palette and style
  theme: string;
  // Scale factor (0.5 = half size, 2.0 = double)
  scale: number;
  // Complexity level (1-10, affects detail density)
  complexity: number;
  // Material palette override
  palette?: MaterialPalette;
}

/**
 * A curated material palette for consistent theming
 */
export interface MaterialPalette {
  primary: string[];      // Main structural blocks
  secondary: string[];    // Accent blocks
  detail: string[];       // Fine detail blocks
  light: string[];        // Light-emitting blocks
  organic: string[];      // Natural/plant blocks
  special: string[];      // Rare/magical blocks
}

/**
 * Result of structure execution
 */
export interface StructureExecutionResult {
  structureId: string;
  success: boolean;
  commandsExecuted: number;
  commandsFailed: number;
  executionTimeMs: number;
  errors: string[];
}

export interface WorldGeneration {
  strategy: 'new_seed' | 'fixed_seed' | 'flat' | 'void';
  seed?: string;
  levelType?: 'default' | 'flat' | 'large_biomes' | 'amplified';
  biomes?: BiomeName[];
  structures?: StructureConfig;
}

export type BiomeName =
  | 'plains'
  | 'forest'
  | 'mountains'
  | 'desert'
  | 'taiga'
  | 'ocean'
  | 'jungle'
  | 'savanna'
  | 'swamp'
  | 'ice_spikes'
  | 'mushroom_fields'
  | 'badlands'
  | 'dark_forest'
  | 'birch_forest';

export interface StructureConfig {
  villages?: boolean;
  strongholds?: boolean;
  mineshafts?: boolean;
  temples?: boolean;
  oceanMonuments?: boolean;
  woodlandMansions?: boolean;
}

export interface WorldRules {
  difficulty: Difficulty;
  gameMode: GameMode;
  hardcore?: boolean;
  pvp?: boolean;
  keepInventory?: boolean;
  naturalRegeneration?: boolean;
  doDaylightCycle?: boolean;
  doWeatherCycle?: boolean;
  doMobSpawning?: boolean;
  announceAdvancements?: boolean;
  spawnRadius?: number;
}

export interface SpawnConfig {
  protection?: boolean;
  radius?: number;
  forceGamemode?: boolean;
}

export type DatapackName =
  | 'anti_enderman_grief'
  | 'more_mob_heads'
  | 'player_head_drops'
  | 'silence_mobs'
  | 'wandering_trades'
  | 'custom_crafting'
  | 'coordinates_hud';

export interface ServerConfig {
  maxPlayers?: number;
  viewDistance?: number;
  simulationDistance?: number;
  motd?: string;
}

export interface WorldMetadata {
  requestedBy?: string;
  requestedAt?: string;
  userDescription?: string;
  aiModel?: string;
  version?: string;
  // Structure generation metadata
  structureCount?: number;
  totalWorldEditCommands?: number;
}

// Auth types
export interface AuthUser {
  githubId: string;
  username: string;
}

// Express extensions
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

