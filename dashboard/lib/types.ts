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

// API Response types
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

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
}

// WorldSpec types
export interface WorldSpec {
  worldName: string;
  displayName?: string;
  theme: string;
  generation: WorldGeneration;
  rules: WorldRules;
  spawn?: SpawnConfig;
  datapacks?: string[];
  server?: ServerConfig;
  metadata?: WorldMetadata;
}

export interface WorldGeneration {
  strategy: 'new_seed' | 'fixed_seed' | 'flat' | 'void';
  seed?: string;
  levelType?: 'default' | 'flat' | 'large_biomes' | 'amplified';
  biomes?: string[];
  structures?: StructureConfig;
}

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

