import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type {
  WorldRequestRow,
  DeploymentRow,
  WorldRequestStatus,
  Difficulty,
  GameMode,
  WorldSize,
  WorldSpec,
} from '../types/index.js';

const DB_PATH = process.env.DATABASE_PATH || './data/coordinator.json';

// Database structure
interface Database {
  world_requests: WorldRequestRow[];
  deployments: DeploymentRow[];
}

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load database from file
function loadDatabase(): Database {
  if (fs.existsSync(DB_PATH)) {
    try {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(data);
    } catch {
      console.warn('Failed to load database, creating new one');
    }
  }
  return { world_requests: [], deployments: [] };
}

// Save database to file
function saveDatabase(db: Database): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// Global database instance
let db: Database = loadDatabase();

// Initialize database
export function initializeDatabase(): void {
  db = loadDatabase();
  console.log('Database initialized successfully');
  console.log(`  - ${db.world_requests.length} world requests`);
  console.log(`  - ${db.deployments.length} deployments`);
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

  db.world_requests.push(row);
  saveDatabase(db);

  return row;
}

export function getWorldRequestById(id: string): WorldRequestRow | undefined {
  return db.world_requests.find(r => r.id === id);
}

export function getWorldRequests(
  status?: WorldRequestStatus,
  limit = 50,
  offset = 0
): { requests: WorldRequestRow[]; total: number } {
  let results = [...db.world_requests];

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
  const request = db.world_requests.find(r => r.id === id);
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

  saveDatabase(db);
}

export function getRequestCountSince(userGithubId: string, sinceDate: Date): number {
  const sinceIso = sinceDate.toISOString();
  return db.world_requests.filter(
    r => r.user_github_id === userGithubId && r.created_at >= sinceIso
  ).length;
}

// Deployments
export function getCurrentDeployment(): DeploymentRow | undefined {
  return db.deployments.find(d => d.is_current === 1);
}

export function createDeployment(
  worldName: string,
  commitSha: string,
  worldspecJson?: string
): DeploymentRow {
  const id = `dep_${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();

  // Clear current deployment flag
  db.deployments.forEach(d => d.is_current = 0);

  // Create new deployment
  const row: DeploymentRow = {
    id,
    world_name: worldName,
    commit_sha: commitSha,
    deployed_at: now,
    worldspec_json: worldspecJson || null,
    is_current: 1,
  };

  db.deployments.push(row);
  saveDatabase(db);

  return row;
}

export function getDeploymentById(id: string): DeploymentRow | undefined {
  return db.deployments.find(d => d.id === id);
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
