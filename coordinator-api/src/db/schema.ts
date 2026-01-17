import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || './data/coordinator.json';

// In-memory database with JSON file persistence
interface Database {
  world_requests: WorldRequestRow[];
  deployments: DeploymentRow[];
}

interface WorldRequestRow {
  id: string;
  status: string;
  user_github_id: string;
  user_github_username: string;
  description: string;
  difficulty: string | null;
  game_mode: string | null;
  size: string | null;
  worldspec_json: string | null;
  pr_url: string | null;
  commit_sha: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

interface DeploymentRow {
  id: string;
  world_name: string;
  commit_sha: string;
  deployed_at: string;
  worldspec_json: string | null;
  is_current: number;
}

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load or initialize database
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

function saveDatabase(db: Database): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// Global database instance
let db: Database = loadDatabase();

// Simple query builder mimicking SQLite interface
export const database = {
  prepare: (sql: string) => {
    return {
      run: (...params: unknown[]) => {
        // Handle INSERT, UPDATE, DELETE
        if (sql.includes('INSERT INTO world_requests')) {
          const row: WorldRequestRow = {
            id: params[0] as string,
            status: 'pending',
            user_github_id: params[1] as string,
            user_github_username: params[2] as string,
            description: params[3] as string,
            difficulty: params[4] as string | null,
            game_mode: params[5] as string | null,
            size: params[6] as string | null,
            worldspec_json: null,
            pr_url: null,
            commit_sha: null,
            error: null,
            created_at: params[7] as string,
            updated_at: params[8] as string,
          };
          db.world_requests.push(row);
          saveDatabase(db);
        } else if (sql.includes('INSERT INTO deployments')) {
          const row: DeploymentRow = {
            id: params[0] as string,
            world_name: params[1] as string,
            commit_sha: params[2] as string,
            deployed_at: params[3] as string,
            worldspec_json: params[4] as string | null,
            is_current: 1,
          };
          db.deployments.push(row);
          saveDatabase(db);
        } else if (sql.includes('UPDATE deployments SET is_current = 0')) {
          db.deployments.forEach(d => d.is_current = 0);
          saveDatabase(db);
        } else if (sql.includes('UPDATE world_requests SET')) {
          // Parse dynamic update - params are in order of the SET clause, then WHERE
          const id = params[params.length - 1] as string;
          const request = db.world_requests.find(r => r.id === id);
          if (request) {
            // Extract field updates from params based on SQL structure
            let paramIndex = 0;
            if (sql.includes('status = ?')) request.status = params[paramIndex++] as string;
            if (sql.includes('updated_at = ?')) request.updated_at = params[paramIndex++] as string;
            if (sql.includes('worldspec_json = ?')) request.worldspec_json = params[paramIndex++] as string | null;
            if (sql.includes('pr_url = ?')) request.pr_url = params[paramIndex++] as string | null;
            if (sql.includes('commit_sha = ?')) request.commit_sha = params[paramIndex++] as string | null;
            if (sql.includes('error = ?')) request.error = params[paramIndex++] as string | null;
            saveDatabase(db);
          }
        }
      },
      get: (...params: unknown[]) => {
        if (sql.includes('FROM world_requests WHERE id')) {
          return db.world_requests.find(r => r.id === params[0]);
        }
        if (sql.includes('FROM deployments WHERE is_current = 1')) {
          return db.deployments.find(d => d.is_current === 1);
        }
        if (sql.includes('FROM deployments WHERE id')) {
          return db.deployments.find(d => d.id === params[0]);
        }
        if (sql.includes('COUNT(*)')) {
          if (sql.includes('world_requests') && sql.includes('user_github_id')) {
            const userId = params[0] as string;
            const since = params[1] as string;
            const count = db.world_requests.filter(
              r => r.user_github_id === userId && r.created_at >= since
            ).length;
            return { count };
          }
          if (sql.includes('world_requests')) {
            if (params.length > 0) {
              return { count: db.world_requests.filter(r => r.status === params[0]).length };
            }
            return { count: db.world_requests.length };
          }
        }
        return undefined;
      },
      all: (...params: unknown[]) => {
        if (sql.includes('FROM world_requests')) {
          let results = [...db.world_requests];
          
          // Filter by status if WHERE clause exists
          if (sql.includes('WHERE status = ?') && params.length > 0) {
            results = results.filter(r => r.status === params[0]);
          }
          
          // Sort by created_at DESC
          results.sort((a, b) => b.created_at.localeCompare(a.created_at));
          
          // Apply LIMIT and OFFSET
          const limitMatch = sql.match(/LIMIT (\?|\d+)/);
          const offsetMatch = sql.match(/OFFSET (\?|\d+)/);
          
          let limit = 50;
          let offset = 0;
          
          if (limitMatch) {
            limit = typeof params[params.length - 2] === 'number' 
              ? params[params.length - 2] as number 
              : 50;
          }
          if (offsetMatch) {
            offset = typeof params[params.length - 1] === 'number' 
              ? params[params.length - 1] as number 
              : 0;
          }
          
          return results.slice(offset, offset + limit);
        }
        return [];
      },
    };
  },
  exec: (_sql: string) => {
    // Schema creation - no-op for JSON store
  },
  pragma: (_pragma: string) => {
    // SQLite pragma - no-op for JSON store
  },
  function: (_name: string, _fn: () => string) => {
    // SQLite function - no-op for JSON store
  },
};

export const initializeDatabase = (): void => {
  db = loadDatabase();
  console.log('Database initialized successfully');
  console.log(`  - ${db.world_requests.length} world requests`);
  console.log(`  - ${db.deployments.length} deployments`);
};

// Alias for compatibility
export const db = database;
