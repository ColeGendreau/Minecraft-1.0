import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type {
  WorldRequestRow,
  DeploymentRow,
  AssetRow,
  AssetStatus,
  WorldRequestStatus,
  Difficulty,
  GameMode,
  WorldSize,
  WorldSpec,
} from '../types/index.js';

// Database structure
interface Database {
  world_requests: WorldRequestRow[];
  deployments: DeploymentRow[];
  assets: AssetRow[];
}

// Global database instance (lazy initialized)
let db: Database | null = null;
let dbInitialized = false;

function getDbPath(): string {
  return process.env.DATABASE_PATH || './data/coordinator.json';
}

// Ensure data directory exists
function ensureDataDir(): void {
  const dbPath = getDbPath();
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load database from file
function loadDatabase(): Database {
  const dbPath = getDbPath();
  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, 'utf-8');
      const parsed = JSON.parse(data);
      // Ensure assets array exists (migration for existing DBs)
      if (!parsed.assets) {
        parsed.assets = [];
      }
      return parsed;
    } catch {
      console.warn('Failed to load database, creating new one');
    }
  }
  return { world_requests: [], deployments: [], assets: [] };
}

// Save database to file
function saveDatabase(database: Database): void {
  const dbPath = getDbPath();
  ensureDataDir();
  fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
}

// Get database (lazy initialization)
function getDb(): Database {
  if (!db) {
    ensureDataDir();
    db = loadDatabase();
  }
  return db;
}

// Initialize database
export function initializeDatabase(): void {
  ensureDataDir();
  db = loadDatabase();
  dbInitialized = true;
  console.log('Database initialized successfully');
  console.log(`  - ${db.world_requests.length} world requests`);
  console.log(`  - ${db.deployments.length} deployments`);
  console.log(`  - ${db.assets.length} assets`);
}

// World Requests
export function createWorldRequest(
  userGithubId: string,
  userGithubUsername: string,
  description: string,
  difficulty?: Difficulty,
  gameMode?: GameMode,
  size?: WorldSize
): WorldRequestRow {
  const id = `req_${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();

  const row: WorldRequestRow = {
    id,
    status: 'pending',
    user_github_id: userGithubId,
    user_github_username: userGithubUsername,
    description,
    difficulty: difficulty || null,
    game_mode: gameMode || null,
    size: size || null,
    worldspec_json: null,
    pr_url: null,
    commit_sha: null,
    error: null,
    created_at: now,
    updated_at: now,
  };

  const database = getDb();
  database.world_requests.push(row);
  saveDatabase(database);

  return row;
}

export function getWorldRequestById(id: string): WorldRequestRow | undefined {
  return getDb().world_requests.find(r => r.id === id);
}

export function getWorldRequests(
  status?: WorldRequestStatus,
  limit = 50,
  offset = 0
): { requests: WorldRequestRow[]; total: number } {
  const database = getDb();
  let results = [...database.world_requests];

  // Filter by status if provided
  if (status) {
    results = results.filter(r => r.status === status);
  }

  const total = results.length;

  // Sort by created_at DESC
  results.sort((a, b) => b.created_at.localeCompare(a.created_at));

  // Apply pagination
  results = results.slice(offset, offset + limit);

  return { requests: results, total };
}

export function updateWorldRequestStatus(
  id: string,
  status: WorldRequestStatus,
  updates?: {
    worldspecJson?: string;
    prUrl?: string;
    commitSha?: string;
    error?: string;
  }
): void {
  const database = getDb();
  const request = database.world_requests.find(r => r.id === id);
  if (!request) return;

  request.status = status;
  request.updated_at = new Date().toISOString();

  if (updates?.worldspecJson !== undefined) {
    request.worldspec_json = updates.worldspecJson;
  }
  if (updates?.prUrl !== undefined) {
    request.pr_url = updates.prUrl;
  }
  if (updates?.commitSha !== undefined) {
    request.commit_sha = updates.commitSha;
  }
  if (updates?.error !== undefined) {
    request.error = updates.error;
  }

  saveDatabase(database);
}

export function getRequestCountSince(userGithubId: string, sinceDate: Date): number {
  const sinceIso = sinceDate.toISOString();
  return getDb().world_requests.filter(
    r => r.user_github_id === userGithubId && r.created_at >= sinceIso
  ).length;
}

export function deleteWorldRequest(id: string): boolean {
  const database = getDb();
  const index = database.world_requests.findIndex(r => r.id === id);
  if (index === -1) return false;
  
  database.world_requests.splice(index, 1);
  saveDatabase(database);
  return true;
}

// Deployments
export function getCurrentDeployment(): DeploymentRow | undefined {
  return getDb().deployments.find(d => d.is_current === 1);
}

export function createDeployment(
  worldName: string,
  commitSha: string,
  worldspecJson?: string
): DeploymentRow {
  const id = `dep_${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();
  const database = getDb();

  // Clear current deployment flag
  database.deployments.forEach(d => d.is_current = 0);

  // Create new deployment
  const row: DeploymentRow = {
    id,
    world_name: worldName,
    commit_sha: commitSha,
    deployed_at: now,
    worldspec_json: worldspecJson || null,
    is_current: 1,
  };

  database.deployments.push(row);
  saveDatabase(database);

  return row;
}

export function getDeploymentById(id: string): DeploymentRow | undefined {
  return getDb().deployments.find(d => d.id === id);
}

// Seed mock data for development
export function seedMockDeployment(): void {
  const current = getCurrentDeployment();
  if (!current) {
    // Create a mock current deployment using the example worldspec
    const mockWorldSpec: WorldSpec = {
      worldName: 'floating-isles',
      displayName: 'Floating Isles Adventure',
      theme: 'A survival world featuring dramatic floating islands at various heights, connected by natural stone bridges and waterfalls.',
      generation: {
        strategy: 'fixed_seed',
        seed: 'FLOATING',
        levelType: 'amplified',
        biomes: ['mountains', 'plains', 'forest'],
        structures: {
          villages: true,
          strongholds: true,
          mineshafts: true,
          temples: false,
          oceanMonuments: false,
          woodlandMansions: false,
        },
      },
      rules: {
        difficulty: 'normal',
        gameMode: 'survival',
        hardcore: false,
        pvp: false,
        keepInventory: false,
        naturalRegeneration: true,
        doDaylightCycle: true,
        doWeatherCycle: true,
        doMobSpawning: true,
        announceAdvancements: true,
        spawnRadius: 10,
      },
      spawn: {
        protection: true,
        radius: 16,
        forceGamemode: false,
      },
      datapacks: ['coordinates_hud', 'player_head_drops'],
      server: {
        maxPlayers: 20,
        viewDistance: 12,
        simulationDistance: 10,
        motd: 'Floating Isles - Survival Adventure!',
      },
      metadata: {
        requestedBy: 'ColeGendreau',
        requestedAt: '2026-01-16T20:30:00Z',
        userDescription: 'I want a world with floating islands that feel magical and challenging to navigate.',
        aiModel: 'mock',
        version: '1.0.0',
      },
    };

    createDeployment('floating-isles', 'a1b2c3d', JSON.stringify(mockWorldSpec));
    console.log('Seeded mock deployment: floating-isles');
  }
}

// ============================================================
// ASSETS
// ============================================================

export interface CreateAssetParams {
  name: string;
  imageUrl?: string;
  prompt?: string;
  generatedImageUrl?: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  width: number;
  height: number;
  depth: number;
  scale: number;
  facing: 'north' | 'south' | 'east' | 'west';
  createdBy: string;
}

export function createAsset(params: CreateAssetParams): AssetRow {
  const id = `asset_${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();

  const row: AssetRow = {
    id,
    name: params.name,
    image_url: params.imageUrl || null,
    prompt: params.prompt || null,
    generated_image_url: params.generatedImageUrl || null,
    position_x: params.positionX,
    position_y: params.positionY,
    position_z: params.positionZ,
    width: params.width,
    height: params.height,
    depth: params.depth,
    scale: params.scale,
    facing: params.facing,
    status: 'active',
    created_by: params.createdBy,
    created_at: now,
    deleted_at: null,
  };

  const database = getDb();
  database.assets.push(row);
  saveDatabase(database);

  return row;
}

export function getAssetById(id: string): AssetRow | undefined {
  return getDb().assets.find(a => a.id === id);
}

export function getAssets(
  status?: AssetStatus,
  limit = 50,
  offset = 0
): { assets: AssetRow[]; total: number } {
  const database = getDb();
  let results = [...database.assets];

  // Filter by status if provided (default to active only)
  if (status) {
    results = results.filter(a => a.status === status);
  } else {
    // By default, only show active assets
    results = results.filter(a => a.status === 'active');
  }

  const total = results.length;

  // Sort by created_at DESC
  results.sort((a, b) => b.created_at.localeCompare(a.created_at));

  // Apply pagination
  results = results.slice(offset, offset + limit);

  return { assets: results, total };
}

export function getActiveAssets(): AssetRow[] {
  return getDb().assets.filter(a => a.status === 'active');
}

export function updateAssetStatus(id: string, status: AssetStatus): void {
  const database = getDb();
  const asset = database.assets.find(a => a.id === id);
  if (!asset) return;

  asset.status = status;
  if (status === 'deleted') {
    asset.deleted_at = new Date().toISOString();
  }

  saveDatabase(database);
}

export function deleteAsset(id: string): boolean {
  const database = getDb();
  const asset = database.assets.find(a => a.id === id);
  if (!asset) return false;

  // Soft delete - mark as deleted
  asset.status = 'deleted';
  asset.deleted_at = new Date().toISOString();
  saveDatabase(database);
  return true;
}

export function nukeAllAssets(): number {
  const database = getDb();
  const activeAssets = database.assets.filter(a => a.status === 'active');
  const count = activeAssets.length;
  
  // Soft delete all active assets
  const now = new Date().toISOString();
  activeAssets.forEach(a => {
    a.status = 'deleted';
    a.deleted_at = now;
  });
  
  saveDatabase(database);
  return count;
}

// Get the next available position for a new asset (to avoid overlap)
// All assets are placed in a single row along the X axis at Z=50
// When assets are deleted, new ones can fill those gaps
export function getNextAssetPosition(): { x: number; y: number; z: number } {
  const ASSET_Z = 50;        // All assets at same Z
  const ASSET_Y = 65;        // Ground level
  const GAP = 20;            // Space between assets
  const START_X = 0;         // Starting position
  
  const activeAssets = getActiveAssets();
  
  if (activeAssets.length === 0) {
    return { x: START_X, y: ASSET_Y, z: ASSET_Z };
  }
  
  // Build a list of occupied X ranges
  const occupiedRanges: Array<{ start: number; end: number }> = [];
  for (const asset of activeAssets) {
    occupiedRanges.push({
      start: asset.position_x - GAP, // Include gap before
      end: asset.position_x + asset.width + GAP, // Include gap after
    });
  }
  
  // Sort by start position
  occupiedRanges.sort((a, b) => a.start - b.start);
  
  // Look for a gap big enough (we'll use a minimum width of 50 blocks as estimate)
  const MIN_WIDTH = 50;
  
  // Check if there's space at the beginning
  if (occupiedRanges.length > 0 && occupiedRanges[0].start > START_X + MIN_WIDTH) {
    return { x: START_X, y: ASSET_Y, z: ASSET_Z };
  }
  
  // Check for gaps between occupied ranges
  for (let i = 0; i < occupiedRanges.length - 1; i++) {
    const gapStart = occupiedRanges[i].end;
    const gapEnd = occupiedRanges[i + 1].start;
    const gapSize = gapEnd - gapStart;
    
    if (gapSize >= MIN_WIDTH) {
      // Found a gap! Place asset here
      return { x: Math.round(gapStart), y: ASSET_Y, z: ASSET_Z };
    }
  }
  
  // No gaps found - place at the end
  const lastRange = occupiedRanges[occupiedRanges.length - 1];
  return {
    x: Math.round(lastRange.end),
    y: ASSET_Y,
    z: ASSET_Z
  };
}
