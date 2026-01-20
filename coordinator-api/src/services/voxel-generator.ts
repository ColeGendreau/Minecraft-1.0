/**
 * Voxel Generator - Layer-by-Layer Custom Object Creation
 * 
 * Allows the AI to define custom objects by specifying each layer (Y level)
 * as a 2D grid of blocks. This enables creation of any shape without
 * needing predefined components.
 * 
 * The AI specifies:
 * 1. A character palette (A=stone, B=gold, etc.)
 * 2. Layers from bottom to top, each as a 2D string grid
 */

export interface VoxelDefinition {
  palette: Record<string, string>;  // Character to block mapping
  layers: string[][];               // [y][z] where each string is X row
}

/**
 * Parse a voxel definition from AI output and generate commands
 * 
 * Input format:
 * voxel(x, y, z, scale, {
 *   palette: { W: "white_concrete", B: "blue_concrete", G: "glass" },
 *   layers: [
 *     ["WWW", "WBW", "WWW"],  // Y=0
 *     ["W.W", "...", "W.W"],  // Y=1
 *     ["WWW", "WGW", "WWW"],  // Y=2
 *   ]
 * })
 */
export function voxelToCommands(
  definition: VoxelDefinition,
  x: number,
  y: number,
  z: number,
  scale: number = 1
): string[] {
  const commands: string[] = [];
  const { palette, layers } = definition;
  
  for (let ly = 0; ly < layers.length; ly++) {
    const layer = layers[ly];
    for (let lz = 0; lz < layer.length; lz++) {
      const row = layer[lz];
      for (let lx = 0; lx < row.length; lx++) {
        const char = row[lx];
        
        // Skip air/empty
        if (char === ' ' || char === '.' || char === '_') continue;
        
        const block = palette[char];
        if (!block) {
          console.warn(`Unknown palette character: ${char}`);
          continue;
        }
        
        const worldX = x + lx * scale;
        const worldY = y + ly * scale;
        const worldZ = z + lz * scale;
        
        if (scale === 1) {
          commands.push(`setblock ${worldX} ${worldY} ${worldZ} ${block}`);
        } else {
          commands.push(`fill ${worldX} ${worldY} ${worldZ} ${worldX + scale - 1} ${worldY + scale - 1} ${worldZ + scale - 1} ${block}`);
        }
      }
    }
  }
  
  return commands;
}

/**
 * Parse a voxel command string
 * Format: voxel(x, y, z, scale, definition)
 * Where definition is a JSON object with palette and layers
 */
export function parseVoxelCommand(cmd: string): { commands: string[]; error?: string } {
  // Extract parameters from voxel(...) command
  const match = cmd.match(/^voxel\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(\d+)\s*,\s*(\{[\s\S]*\})\s*\)$/);
  
  if (!match) {
    return { commands: [], error: 'Invalid voxel command format' };
  }
  
  const x = parseInt(match[1]);
  const y = parseInt(match[2]);
  const z = parseInt(match[3]);
  const scale = parseInt(match[4]);
  const definitionStr = match[5];
  
  try {
    const definition = JSON.parse(definitionStr) as VoxelDefinition;
    const commands = voxelToCommands(definition, x, y, z, scale);
    return { commands };
  } catch (e) {
    return { commands: [], error: `Failed to parse voxel definition: ${e}` };
  }
}

/**
 * Simplified voxel definition using a more compact format
 * This is easier for the AI to generate
 * 
 * Format:
 * voxelLayers(x, y, z, scale, palette_string, layer1, layer2, ...)
 * 
 * palette_string: "W=white_concrete,B=blue_concrete,G=glass"
 * layers: each layer is a string with rows separated by |
 *   "WWW|WBW|WWW" = 3x3 layer
 */
export function parseVoxelLayers(
  x: number,
  y: number,
  z: number,
  scale: number,
  paletteStr: string,
  ...layerStrs: string[]
): string[] {
  // Parse palette
  const palette: Record<string, string> = {};
  for (const pair of paletteStr.split(',')) {
    const [char, block] = pair.trim().split('=');
    if (char && block) {
      palette[char.trim()] = block.trim();
    }
  }
  
  // Parse layers
  const layers: string[][] = layerStrs.map(layerStr => 
    layerStr.split('|').map(row => row.trim())
  );
  
  return voxelToCommands({ palette, layers }, x, y, z, scale);
}

/**
 * Create a unicorn shape using voxel layers
 * This demonstrates how complex organic shapes can be built
 */
export function createUnicornLayers(x: number, y: number, z: number, scale: number = 1): string[] {
  const palette: Record<string, string> = {
    'W': 'white_concrete',    // Body
    'P': 'pink_concrete',     // Mane/tail
    'G': 'gold_block',        // Horn
    'B': 'black_concrete',    // Eyes/hooves
    'L': 'light_blue_concrete', // Magical sparkles
  };
  
  // Simplified unicorn - 12 wide, 10 tall, 6 deep
  const layers: string[][] = [
    // Y=0: Hooves
    [
      '..B.....B...',
      '..B.....B...',
      '............',
      '..B.....B...',
      '..B.....B...',
      '............',
    ],
    // Y=1-3: Legs
    ...[1, 2, 3].map(() => [
      '..W.....W...',
      '..W.....W...',
      '............',
      '..W.....W...',
      '..W.....W...',
      '............',
    ]),
    // Y=4-5: Body
    ...[4, 5].map(() => [
      '..WWWWWWW...',
      '.WWWWWWWWW..',
      '.WWWWWWWWW..',
      '.WWWWWWWWW..',
      '..WWWWWWW...',
      '............',
    ]),
    // Y=6: Body with tail start
    [
      '..WWWWWWW.PP',
      '.WWWWWWWWWPP',
      '.WWWWWWWWW.P',
      '.WWWWWWWWW..',
      '..WWWWWWW...',
      '............',
    ],
    // Y=7: Neck and body
    [
      'WWW.......PP',
      'WWWWWWWWW..P',
      '.WWWWWWWW...',
      '..WWWWWW....',
      '............',
      '............',
    ],
    // Y=8: Head and mane
    [
      'WWWW....PPPP',
      'WWWW......PP',
      'WBWW........',
      '.WW.........',
      '............',
      '............',
    ],
    // Y=9: Head top and horn base
    [
      '.WWW....PPP.',
      'PWWWP....PP.',
      '.WWW........',
      '............',
      '............',
      '............',
    ],
    // Y=10: Horn
    [
      '..G.........',
      'PPWPP.......',
      '..W.........',
      '............',
      '............',
      '............',
    ],
    // Y=11: Horn tip
    [
      '..G.........',
      '.P.P........',
      '............',
      '............',
      '............',
      '............',
    ],
    // Y=12: Horn tip
    [
      '..G.........',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
  ];
  
  return voxelToCommands({ palette, layers }, x, y, z, scale);
}

/**
 * Create a dragon shape
 */
export function createDragonLayers(x: number, y: number, z: number, scale: number = 1): string[] {
  const palette: Record<string, string> = {
    'R': 'red_concrete',      // Body
    'O': 'orange_concrete',   // Belly/accents
    'B': 'black_concrete',    // Eyes
    'Y': 'yellow_concrete',   // Eyes glow
    'G': 'gray_concrete',     // Claws
  };
  
  // Dragon - side view, 15 wide, 8 tall, 5 deep
  const layers: string[][] = [
    // Y=0: Feet/claws
    [
      '..G.........G..',
      '..G.........G..',
      '..G.........G..',
      '..G.........G..',
      '..G.........G..',
    ],
    // Y=1: Legs
    [
      '..R.........R..',
      '..R.........R..',
      '..R.........R..',
      '..R.........R..',
      '..R.........R..',
    ],
    // Y=2-3: Body
    ...[2, 3].map(() => [
      '..RRRRRRRRRRR..',
      '.RRRRRRRRRRRR..',
      '.RROOOOOOOORRR.',
      '.RRRRRRRRRRRR..',
      '..RRRRRRRRRRR..',
    ]),
    // Y=4: Body with wings start
    [
      'RRRRRRRRRRRRRR.',
      'RRRRRRRRRRRRRRR',
      '.RRRRRRRRRRRR..',
      'RRRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRR.',
    ],
    // Y=5: Wings and neck
    [
      'RRR..........RR',
      'RRRRRRRRRRRR...',
      '..RRRRRRRR.....',
      'RRRRRRRRRRRR...',
      'RRR..........RR',
    ],
    // Y=6: Head
    [
      '...............',
      'RRRRR..........',
      'RBYRRR.........',
      'RRRRR..........',
      '...............',
    ],
    // Y=7: Head top and horns
    [
      '...............',
      '.RRR...........',
      'R..R...........',
      '.RRR...........',
      '...............',
    ],
  ];
  
  return voxelToCommands({ palette, layers }, x, y, z, scale);
}

/**
 * Map of special voxel objects that can be referenced by name
 */
export const VOXEL_OBJECTS: Record<string, (x: number, y: number, z: number, scale: number) => string[]> = {
  unicorn: createUnicornLayers,
  dragon: createDragonLayers,
};

/**
 * Process a voxelObject command
 * Format: voxelObject(name, x, y, z, scale)
 */
export function processVoxelObjectCommand(
  name: string,
  x: number,
  y: number,
  z: number,
  scale: number = 1
): string[] {
  const generator = VOXEL_OBJECTS[name.toLowerCase()];
  if (!generator) {
    console.warn(`Unknown voxel object: ${name}`);
    return [];
  }
  return generator(x, y, z, scale);
}

