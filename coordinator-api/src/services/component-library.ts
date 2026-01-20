/**
 * Component Library - Detailed Pre-Built Objects
 * 
 * Contains layer-by-layer voxel definitions for complex objects
 * that can't be easily represented with geometric primitives.
 * 
 * Each component is defined as layers from bottom (Y=0) to top,
 * using a 2D character grid where each character maps to a block.
 */

export interface ComponentDefinition {
  name: string;
  description: string;
  width: number;   // X dimension
  height: number;  // Y dimension (layers)
  depth: number;   // Z dimension
  layers: string[][]; // [y][z][x] - each string is a row in X direction
  palette: Record<string, string>; // Character to block mapping
  variants?: Record<string, Record<string, string>>; // Color variants
}

/**
 * Generate fill commands from a component definition
 */
export function componentToCommands(
  component: ComponentDefinition,
  x: number,
  y: number,
  z: number,
  variant?: string,
  scale: number = 1
): string[] {
  const commands: string[] = [];
  const palette = variant && component.variants?.[variant] 
    ? { ...component.palette, ...component.variants[variant] }
    : component.palette;
  
  for (let ly = 0; ly < component.layers.length; ly++) {
    const layer = component.layers[ly];
    for (let lz = 0; lz < layer.length; lz++) {
      const row = layer[lz];
      for (let lx = 0; lx < row.length; lx++) {
        const char = row[lx];
        if (char === ' ' || char === '.') continue; // Air/skip
        
        const block = palette[char];
        if (!block) continue;
        
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
 * Optimize commands by grouping same-block adjacent setblocks into fills
 */
export function optimizeSetblocks(commands: string[]): string[] {
  // Parse all setblock commands
  const blocks: { x: number; y: number; z: number; block: string }[] = [];
  const otherCommands: string[] = [];
  
  for (const cmd of commands) {
    const match = cmd.match(/^setblock\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(\S+)/);
    if (match) {
      blocks.push({
        x: parseInt(match[1]),
        y: parseInt(match[2]),
        z: parseInt(match[3]),
        block: match[4]
      });
    } else {
      otherCommands.push(cmd);
    }
  }
  
  // Group by Y level and block type, merge horizontal runs
  const optimized: string[] = [...otherCommands];
  
  // Simple optimization: group by block type and Y
  const byBlockAndY = new Map<string, { x: number; y: number; z: number }[]>();
  for (const b of blocks) {
    const key = `${b.block}:${b.y}`;
    if (!byBlockAndY.has(key)) byBlockAndY.set(key, []);
    byBlockAndY.get(key)!.push(b);
  }
  
  for (const [key, positions] of byBlockAndY) {
    const block = key.split(':')[0];
    
    // For now, just output as setblocks (full optimization is complex)
    // Could merge into fills for runs of same Z
    for (const pos of positions) {
      optimized.push(`setblock ${pos.x} ${pos.y} ${pos.z} ${block}`);
    }
  }
  
  return optimized;
}

// ============================================================
// COMPONENT DEFINITIONS
// ============================================================

/**
 * Throne - A royal throne fit for a king
 * Size: 3x5x2 (width x height x depth)
 */
export const THRONE: ComponentDefinition = {
  name: 'throne',
  description: 'A royal throne with armrests and high back',
  width: 3,
  height: 5,
  depth: 2,
  layers: [
    // Y=0: Base/feet
    [
      'G.G',
      'GGG',
    ],
    // Y=1: Seat
    [
      'RRR',
      'RRR',
    ],
    // Y=2: Armrests and back start
    [
      'G.G',
      'RRR',
    ],
    // Y=3: Back
    [
      '...',
      'RGR',
    ],
    // Y=4: Back top with jewel
    [
      '...',
      'GDG',
    ],
  ],
  palette: {
    'G': 'gold_block',
    'R': 'red_wool',
    'D': 'diamond_block',
    '.': 'air',
  },
  variants: {
    iron: { 'G': 'iron_block', 'R': 'blue_wool' },
    emerald: { 'G': 'emerald_block', 'R': 'green_wool' },
    obsidian: { 'G': 'obsidian', 'R': 'purple_wool', 'D': 'amethyst_block' },
  }
};

/**
 * Bathtub - A clawfoot bathtub with water
 * Size: 6x3x3
 */
export const BATHTUB: ComponentDefinition = {
  name: 'bathtub',
  description: 'A clawfoot bathtub filled with water',
  width: 6,
  height: 3,
  depth: 3,
  layers: [
    // Y=0: Feet/legs
    [
      'I....I',
      '......',
      'I....I',
    ],
    // Y=1: Tub base with water
    [
      'QQQQQQ',
      'QWWWWQ',
      'QQQQQQ',
    ],
    // Y=2: Tub sides
    [
      'Q....Q',
      '......',
      'Q....Q',
    ],
  ],
  palette: {
    'Q': 'quartz_block',
    'W': 'water',
    'I': 'iron_bars',
    '.': 'air',
  }
};

/**
 * Chair - A simple wooden chair
 * Size: 2x3x2
 */
export const CHAIR: ComponentDefinition = {
  name: 'chair',
  description: 'A wooden chair',
  width: 2,
  height: 3,
  depth: 2,
  layers: [
    // Y=0: Legs
    [
      'P.P',
      'P.P',
    ],
    // Y=1: Seat
    [
      'PPP',
      'PPP',
    ],
    // Y=2: Back
    [
      '...',
      'PPP',
    ],
  ],
  palette: {
    'P': 'oak_planks',
    '.': 'air',
  },
  variants: {
    spruce: { 'P': 'spruce_planks' },
    dark_oak: { 'P': 'dark_oak_planks' },
    birch: { 'P': 'birch_planks' },
  }
};

/**
 * Table - A dining table
 * Size: 4x2x2
 */
export const TABLE: ComponentDefinition = {
  name: 'table',
  description: 'A wooden dining table',
  width: 4,
  height: 2,
  depth: 2,
  layers: [
    // Y=0: Legs
    [
      'F..F',
      'F..F',
    ],
    // Y=1: Top
    [
      'PPPP',
      'PPPP',
    ],
  ],
  palette: {
    'P': 'oak_planks',
    'F': 'oak_fence',
    '.': 'air',
  }
};

/**
 * Bed - A cozy bed
 * Size: 2x2x4
 */
export const BED: ComponentDefinition = {
  name: 'bed',
  description: 'A cozy bed with pillows',
  width: 2,
  height: 2,
  depth: 4,
  layers: [
    // Y=0: Frame
    [
      'PP',
      'PP',
      'PP',
      'PP',
    ],
    // Y=1: Mattress and pillows
    [
      'WW',  // Pillows (white)
      'RR',  // Red blanket
      'RR',
      'PP',  // Footboard
    ],
  ],
  palette: {
    'P': 'oak_planks',
    'W': 'white_wool',
    'R': 'red_wool',
    '.': 'air',
  },
  variants: {
    blue: { 'R': 'blue_wool' },
    green: { 'R': 'green_wool' },
    pink: { 'R': 'pink_wool' },
  }
};

/**
 * Lamp - A floor lamp
 * Size: 1x5x1
 */
export const LAMP: ComponentDefinition = {
  name: 'lamp',
  description: 'A tall floor lamp',
  width: 1,
  height: 5,
  depth: 1,
  layers: [
    ['S'], // Base
    ['F'], // Pole
    ['F'], // Pole
    ['F'], // Pole
    ['G'], // Light
  ],
  palette: {
    'S': 'stone_slab',
    'F': 'oak_fence',
    'G': 'glowstone',
  }
};

/**
 * Fountain - A decorative water fountain
 * Size: 7x4x7
 */
export const FOUNTAIN: ComponentDefinition = {
  name: 'fountain',
  description: 'A decorative water fountain',
  width: 7,
  height: 4,
  depth: 7,
  layers: [
    // Y=0: Base pool
    [
      '.SSSSS.',
      'SWWWWWS',
      'SWWWWWS',
      'SWWWWWS',
      'SWWWWWS',
      'SWWWWWS',
      '.SSSSS.',
    ],
    // Y=1: Pool walls and center column
    [
      '.S...S.',
      'S.....S',
      '...Q...',
      '...Q...',
      '...Q...',
      'S.....S',
      '.S...S.',
    ],
    // Y=2: Upper basin
    [
      '.......',
      '.......',
      '..QQQ..',
      '..QWQ..',
      '..QQQ..',
      '.......',
      '.......',
    ],
    // Y=3: Water spout
    [
      '.......',
      '.......',
      '.......',
      '...W...',
      '.......',
      '.......',
      '.......',
    ],
  ],
  palette: {
    'S': 'stone_bricks',
    'Q': 'quartz_block',
    'W': 'water',
    '.': 'air',
  }
};

/**
 * Tree - A simple oak tree
 * Size: 5x7x5
 */
export const TREE: ComponentDefinition = {
  name: 'tree',
  description: 'An oak tree with leaves',
  width: 5,
  height: 7,
  depth: 5,
  layers: [
    // Y=0-2: Trunk
    ...[0, 1, 2].map(() => [
      '.....',
      '.....',
      '..L..',
      '.....',
      '.....',
    ]),
    // Y=3: Lower leaves and trunk
    [
      '.GGG.',
      'GGGGG',
      'GGLGG',
      'GGGGG',
      '.GGG.',
    ],
    // Y=4: Middle leaves and trunk
    [
      '.GGG.',
      'GGGGG',
      'GGLGG',
      'GGGGG',
      '.GGG.',
    ],
    // Y=5: Upper leaves
    [
      '..G..',
      '.GGG.',
      '.GGG.',
      '.GGG.',
      '..G..',
    ],
    // Y=6: Top
    [
      '.....',
      '..G..',
      '.GGG.',
      '..G..',
      '.....',
    ],
  ],
  palette: {
    'L': 'oak_log',
    'G': 'oak_leaves',
    '.': 'air',
  }
};

/**
 * Car - A simple car/vehicle
 * Size: 3x3x6
 */
export const CAR: ComponentDefinition = {
  name: 'car',
  description: 'A simple car',
  width: 3,
  height: 3,
  depth: 6,
  layers: [
    // Y=0: Wheels
    [
      'B.B',
      '...',
      '...',
      '...',
      'B.B',
      '...',
    ],
    // Y=1: Body
    [
      'RRR',
      'RRR',
      'RRR',
      'RRR',
      'RRR',
      'RRR',
    ],
    // Y=2: Cabin
    [
      '...',
      'GGG',
      'GGG',
      'GGG',
      '...',
      '...',
    ],
  ],
  palette: {
    'R': 'red_concrete',
    'B': 'black_concrete',
    'G': 'light_blue_stained_glass',
    '.': 'air',
  },
  variants: {
    blue: { 'R': 'blue_concrete' },
    yellow: { 'R': 'yellow_concrete' },
    white: { 'R': 'white_concrete' },
  }
};

/**
 * Rocket - A space rocket
 * Size: 5x15x5
 */
export const ROCKET: ComponentDefinition = {
  name: 'rocket',
  description: 'A space rocket ready for launch',
  width: 5,
  height: 15,
  depth: 5,
  layers: [
    // Y=0-1: Engines/flames
    ...[0, 1].map(() => [
      '..O..',
      '.O.O.',
      'O...O',
      '.O.O.',
      '..O..',
    ]),
    // Y=2-3: Base fins
    ...[2, 3].map(() => [
      'R.W.R',
      '.WWW.',
      'WWWWW',
      '.WWW.',
      'R.W.R',
    ]),
    // Y=4-10: Body
    ...[4, 5, 6, 7, 8, 9, 10].map(() => [
      '..W..',
      '.WWW.',
      'WWWWW',
      '.WWW.',
      '..W..',
    ]),
    // Y=11: Window section
    [
      '..W..',
      '.WBW.',
      'WBBBW',
      '.WBW.',
      '..W..',
    ],
    // Y=12-13: Nose cone
    ...[12, 13].map(() => [
      '.....',
      '..W..',
      '.WWW.',
      '..W..',
      '.....',
    ]),
    // Y=14: Tip
    [
      '.....',
      '.....',
      '..R..',
      '.....',
      '.....',
    ],
  ],
  palette: {
    'W': 'white_concrete',
    'R': 'red_concrete',
    'B': 'light_blue_stained_glass',
    'O': 'orange_concrete', // Engine flames
    '.': 'air',
  }
};

/**
 * Windmill - A classic windmill
 * Size: 7x12x7 (plus blades extending out)
 */
export const WINDMILL: ComponentDefinition = {
  name: 'windmill',
  description: 'A classic windmill with spinning blades',
  width: 7,
  height: 12,
  depth: 7,
  layers: [
    // Y=0-2: Base (wider)
    ...[0, 1, 2].map(() => [
      '.SSSSS.',
      'SSSSSSS',
      'SSSSSSS',
      'SSSSSSS',
      'SSSSSSS',
      'SSSSSSS',
      '.SSSSS.',
    ]),
    // Y=3-8: Tower (narrowing)
    ...[3, 4, 5, 6, 7, 8].map(() => [
      '..SSS..',
      '.SSSSS.',
      'SSSSSSS',
      'SSSSSSS',
      'SSSSSSS',
      '.SSSSS.',
      '..SSS..',
    ]),
    // Y=9: Window level
    [
      '..SSS..',
      '.SGSGS.',
      'SGSSSGS',
      'SSSSSSS',
      'SGSSSGS',
      '.SGSGS.',
      '..SSS..',
    ],
    // Y=10-11: Roof
    [
      '...S...',
      '..SSS..',
      '.SSSSS.',
      'SSSSSSS',
      '.SSSSS.',
      '..SSS..',
      '...S...',
    ],
    [
      '.......',
      '...D...',
      '..DDD..',
      '.DDDDD.',
      '..DDD..',
      '...D...',
      '.......',
    ],
  ],
  palette: {
    'S': 'stone_bricks',
    'D': 'dark_oak_planks',
    'G': 'glass_pane',
    '.': 'air',
  }
};

// ============================================================
// COMPONENT REGISTRY
// ============================================================

export const COMPONENTS: Record<string, ComponentDefinition> = {
  throne: THRONE,
  bathtub: BATHTUB,
  chair: CHAIR,
  table: TABLE,
  bed: BED,
  lamp: LAMP,
  fountain: FOUNTAIN,
  tree: TREE,
  car: CAR,
  rocket: ROCKET,
  windmill: WINDMILL,
};

/**
 * Get a component by name
 */
export function getComponent(name: string): ComponentDefinition | null {
  return COMPONENTS[name.toLowerCase()] || null;
}

/**
 * List all available components
 */
export function listComponents(): string[] {
  return Object.keys(COMPONENTS);
}

/**
 * Process a component command
 * Format: component(name, x, y, z, [variant], [scale])
 */
export function processComponentCommand(
  name: string,
  x: number,
  y: number,
  z: number,
  variant?: string,
  scale: number = 1
): string[] {
  const component = getComponent(name);
  if (!component) {
    console.warn(`Unknown component: ${name}`);
    return [];
  }
  
  return componentToCommands(component, x, y, z, variant, scale);
}

