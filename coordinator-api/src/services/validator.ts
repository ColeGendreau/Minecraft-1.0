import type { WorldSpec } from '../types/index.js';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import AjvModule from 'ajv';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import addFormatsModule from 'ajv-formats';

// Handle ESM/CJS interop - use any to bypass type issues with CJS modules
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ajv = ((AjvModule as any).default || AjvModule) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any  
const addFormats = ((addFormatsModule as any).default || addFormatsModule) as any;

// WorldSpec JSON Schema (inline to avoid file reading issues)
const worldSpecSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://github.com/ColeGendreau/Minecraft-1.0/schemas/worldspec.schema.json',
  title: 'Minecraft WorldSpec',
  description: 'Structured specification for AI-generated Minecraft worlds',
  type: 'object',
  required: ['worldName', 'theme', 'generation', 'rules'],
  additionalProperties: false,
  properties: {
    worldName: {
      type: 'string',
      pattern: '^[a-z0-9-]+$',
      minLength: 3,
      maxLength: 32,
    },
    displayName: {
      type: 'string',
      minLength: 3,
      maxLength: 64,
    },
    theme: {
      type: 'string',
      minLength: 10,
      maxLength: 500,
    },
    generation: {
      type: 'object',
      required: ['strategy'],
      additionalProperties: false,
      properties: {
        strategy: {
          type: 'string',
          enum: ['new_seed', 'fixed_seed', 'flat', 'void'],
        },
        seed: { type: 'string' },
        levelType: {
          type: 'string',
          enum: ['default', 'flat', 'large_biomes', 'amplified'],
        },
        biomes: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'plains', 'forest', 'mountains', 'desert', 'taiga',
              'ocean', 'jungle', 'savanna', 'swamp', 'ice_spikes',
              'mushroom_fields', 'badlands', 'dark_forest', 'birch_forest',
              'cherry_grove', 'snowy_plains', 'beach', 'river',
            ],
          },
          uniqueItems: true,
          maxItems: 5,
        },
        structures: {
          type: 'object',
          additionalProperties: false,
          properties: {
            villages: { type: 'boolean' },
            strongholds: { type: 'boolean' },
            mineshafts: { type: 'boolean' },
            temples: { type: 'boolean' },
            oceanMonuments: { type: 'boolean' },
            woodlandMansions: { type: 'boolean' },
          },
        },
      },
    },
    rules: {
      type: 'object',
      required: ['difficulty', 'gameMode'],
      additionalProperties: false,
      properties: {
        difficulty: {
          type: 'string',
          enum: ['peaceful', 'easy', 'normal', 'hard'],
        },
        gameMode: {
          type: 'string',
          enum: ['survival', 'creative', 'adventure', 'spectator'],
        },
        hardcore: { type: 'boolean' },
        pvp: { type: 'boolean' },
        keepInventory: { type: 'boolean' },
        naturalRegeneration: { type: 'boolean' },
        doDaylightCycle: { type: 'boolean' },
        doWeatherCycle: { type: 'boolean' },
        doMobSpawning: { type: 'boolean' },
        announceAdvancements: { type: 'boolean' },
        spawnRadius: {
          type: 'integer',
          minimum: 0,
          maximum: 100,
        },
      },
    },
    spawn: {
      type: 'object',
      additionalProperties: false,
      properties: {
        protection: { type: 'boolean' },
        radius: {
          type: 'integer',
          minimum: 0,
          maximum: 100,
        },
        forceGamemode: { type: 'boolean' },
      },
    },
    datapacks: {
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'anti_enderman_grief',
          'more_mob_heads',
          'player_head_drops',
          'silence_mobs',
          'wandering_trades',
          'custom_crafting',
          'coordinates_hud',
        ],
      },
      uniqueItems: true,
      maxItems: 10,
    },
    server: {
      type: 'object',
      additionalProperties: false,
      properties: {
        maxPlayers: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
        },
        viewDistance: {
          type: 'integer',
          minimum: 3,
          maximum: 32,
        },
        simulationDistance: {
          type: 'integer',
          minimum: 3,
          maximum: 32,
        },
        motd: {
          type: 'string',
          maxLength: 100,
        },
      },
    },
    metadata: {
      type: 'object',
      additionalProperties: false,
      properties: {
        requestedBy: { type: 'string' },
        requestedAt: { type: 'string', format: 'date-time' },
        userDescription: { type: 'string', maxLength: 2000 },
        aiModel: { type: 'string' },
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
      },
    },
  },
};

// Initialize AJV
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validateWorldSpec = ajv.compile(worldSpecSchema);

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export function validateWorldSpecJson(data: unknown): ValidationResult {
  const valid = validateWorldSpec(data);
  
  if (!valid) {
    const errors = validateWorldSpec.errors?.map((err: { instancePath?: string; message?: string }) => {
      const path = err.instancePath || 'root';
      return `${path}: ${err.message}`;
    }) || ['Unknown validation error'];
    
    return { valid: false, errors };
  }
  
  return { valid: true };
}

export function parseAndValidateWorldSpec(jsonString: string): { worldSpec?: WorldSpec; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    const result = validateWorldSpecJson(parsed);
    
    if (!result.valid) {
      return { error: `Invalid WorldSpec: ${result.errors?.join('; ')}` };
    }
    
    return { worldSpec: parsed as WorldSpec };
  } catch (e) {
    return { error: `Invalid JSON: ${(e as Error).message}` };
  }
}

