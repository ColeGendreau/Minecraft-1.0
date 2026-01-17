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

