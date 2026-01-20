/**
 * Voxel Generator - Detailed Artistic 3D Objects
 * 
 * Creates complex, good-looking structures through layer-by-layer
 * voxel definitions. Each object is carefully designed to look
 * meaningful and visually appealing in Minecraft.
 * 
 * Design Principles:
 * - Use varied materials for visual interest
 * - Proper proportions that look natural
 * - Include details (windows, decorations)
 * - Good color coordination
 */

export interface VoxelDefinition {
  palette: Record<string, string>;
  layers: string[][];
}

/**
 * Generate fill/setblock commands from a voxel definition
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
        if (char === ' ' || char === '.' || char === '_') continue;
        
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

// ═══════════════════════════════════════════════════════════════
// DETAILED VOXEL OBJECTS
// ═══════════════════════════════════════════════════════════════

/**
 * Castle Tower - A medieval tower with battlements, windows, and door
 * Size: 9x20x9
 */
export function createCastleTower(x: number, y: number, z: number, scale: number = 1): string[] {
  const palette: Record<string, string> = {
    'S': 'stone_bricks',
    'M': 'mossy_stone_bricks',
    'C': 'cracked_stone_bricks',
    'D': 'dark_oak_planks',
    'W': 'glass_pane',
    'T': 'stone_brick_stairs',
    'L': 'lantern',
    'B': 'polished_blackstone',
  };
  
  const layers: string[][] = [
    // Y=0-1: Foundation (slightly wider)
    ...[0, 1].map(() => [
      '.MMMMMMM.',
      'MMSSSSSMM',
      'MSSSSSSSM',
      'MSSSSSSSM',
      'MSSSSSSSM',
      'MSSSSSSSM',
      'MSSSSSSSM',
      'MMSSSSSMM',
      '.MMMMMMM.',
    ]),
    // Y=2: Door level
    [
      '..SSSSS..',
      '.SSSSSSS.',
      'SSS...SSS',
      'SSD...DSS',  // Door
      'SSD...DSS',
      'SSS...SSS',
      '.SSSSSSS.',
      '..SSSSS..',
      '.........',
    ],
    // Y=3-5: Lower tower
    ...[3, 4, 5].map(() => [
      '..SCSCS..',
      '.SSSSSSS.',
      'SSS...SSS',
      'CS.....SC',
      'SS.....SS',
      'CS.....SC',
      'SSS...SSS',
      '.SSSSSSS.',
      '..SCSCS..',
    ]),
    // Y=6: Window level
    [
      '..SSSSS..',
      '.SSWSWSS.',
      'SSS...SSS',
      'SW.....WS',
      'SS.....SS',
      'SW.....WS',
      'SSS...SSS',
      '.SSWSWSS.',
      '..SSSSS..',
    ],
    // Y=7-10: Mid tower
    ...[7, 8, 9, 10].map(() => [
      '..SCSCS..',
      '.SSSSSSS.',
      'SSS...SSS',
      'CS.....SC',
      'SS.....SS',
      'CS.....SC',
      'SSS...SSS',
      '.SSSSSSS.',
      '..SCSCS..',
    ]),
    // Y=11: Upper window level
    [
      '..SSSSS..',
      '.SSWSWSS.',
      'SSW...WSS',
      'SW..L..WS',  // Lantern
      'SS.....SS',
      'SW.....WS',
      'SSW...WSS',
      '.SSWSWSS.',
      '..SSSSS..',
    ],
    // Y=12-14: Upper tower
    ...[12, 13, 14].map(() => [
      '..SSSSS..',
      '.SSSSSSS.',
      'SSS...SSS',
      'SS.....SS',
      'SS.....SS',
      'SS.....SS',
      'SSS...SSS',
      '.SSSSSSS.',
      '..SSSSS..',
    ]),
    // Y=15: Battlement floor
    [
      '.BBBBBBB.',
      'BBBBBBBBB',
      'BBBBBBBBB',
      'BBBBBBBBB',
      'BBBBBBBBB',
      'BBBBBBBBB',
      'BBBBBBBBB',
      'BBBBBBBBB',
      '.BBBBBBB.',
    ],
    // Y=16-17: Battlements (crenellations)
    ...[16, 17].map(() => [
      '.S.S.S.S.',
      'S.......S',
      '.........',
      'S.......S',
      '.........',
      'S.......S',
      '.........',
      'S.......S',
      '.S.S.S.S.',
    ]),
  ];
  
  return voxelToCommands({ palette, layers }, x, y, z, scale);
}

/**
 * Cottage - A cozy house with chimney, windows, and pitched roof
 * Size: 11x10x9
 */
export function createCottage(x: number, y: number, z: number, scale: number = 1): string[] {
  const palette: Record<string, string> = {
    'S': 'stone_bricks',
    'W': 'oak_planks',
    'L': 'oak_log',
    'G': 'glass_pane',
    'D': 'oak_door',
    'R': 'bricks',       // Roof
    'C': 'cobblestone',  // Chimney
    'F': 'campfire',
  };
  
  const layers: string[][] = [
    // Y=0: Foundation
    [
      'SSSSSSSSSSS',
      'SSSSSSSSSSS',
      'SSSSSSSSSSS',
      'SSSSSSSSSSS',
      'SSSSSSSSSSS',
      'SSSSSSSSSSS',
      'SSSSSSSSSSS',
      'SSSSSSSSSSS',
      'SSSSSSSSSSS',
    ],
    // Y=1: Floor level with door
    [
      'LWWWWWWWWWL',
      'W.........W',
      'W.........W',
      'W.........W',
      '...........',  // Door opening
      'W.........W',
      'W.........W',
      'W.........W',
      'LWWWWWWWWWL',
    ],
    // Y=2: Walls with windows
    [
      'LWGWWWWGWWL',
      'W.........W',
      'G.........G',
      'W.........W',
      '...........',
      'W.........W',
      'G.........G',
      'W.........W',
      'LWGWWWWGWWL',
    ],
    // Y=3: Upper walls
    [
      'LWWWWWWWWWL',
      'W.........W',
      'W.........W',
      'W.........W',
      'W.........W',
      'W.........W',
      'W.........W',
      'W.........W',
      'LWWWCWWWWWL', // Chimney start
    ],
    // Y=4: Roof start
    [
      '.RRRRRRRRR.',
      'RRRRRRRRRRR',
      'RR.......RR',
      'RR.......RR',
      'RR.......RR',
      'RR.......RR',
      'RR.......RR',
      'RRRRRRRRRRR',
      '.RRRRCRRRR.',
    ],
    // Y=5: Roof middle
    [
      '..RRRRRRR..',
      '.RRRRRRRRR.',
      'RR.......RR',
      'R.........R',
      'R.........R',
      'R.........R',
      'RR.......RR',
      '.RRRRRRRRR.',
      '..RRRCRRRR.',
    ],
    // Y=6: Roof upper
    [
      '...RRRRR...',
      '..RRRRRRR..',
      '.RR.....RR.',
      'R.........R',
      'R.........R',
      'R.........R',
      '.RR.....RR.',
      '..RRRRRRR..',
      '...RRCRR...',
    ],
    // Y=7: Roof peak
    [
      '....RRR....',
      '...RRRRR...',
      '..RRRRRRR..',
      '.RRRRRRRRR.',
      '.RRRRRRRRR.',
      '.RRRRRRRRR.',
      '..RRRRRRR..',
      '...RRRRR...',
      '....RCR....',
    ],
    // Y=8-9: Chimney top
    ...[8, 9].map(() => [
      '...........',
      '...........',
      '...........',
      '...........',
      '...........',
      '...........',
      '...........',
      '...........',
      '....CCC....',
    ]),
  ];
  
  return voxelToCommands({ palette, layers }, x, y, z, scale);
}

/**
 * Ship/Boat - A sailing ship with hull, mast, and sails
 * Size: 7x15x20 (width x height x length)
 */
export function createShip(x: number, y: number, z: number, scale: number = 1): string[] {
  const palette: Record<string, string> = {
    'W': 'oak_planks',      // Hull
    'D': 'dark_oak_planks', // Deck details
    'L': 'oak_log',         // Mast
    'S': 'white_wool',      // Sails
    'R': 'red_wool',        // Sail stripe
    'F': 'oak_fence',       // Railings
    'B': 'barrel',
  };
  
  const layers: string[][] = [
    // Y=0: Hull bottom (keel)
    [
      '.......',
      '.......',
      '.......',
      '...W...',
      '...W...',
      '...W...',
      '...W...',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '...W...',
      '...W...',
      '...W...',
      '.......',
      '.......',
      '.......',
    ],
    // Y=1: Lower hull
    [
      '.......',
      '.......',
      '...W...',
      '..WWW..',
      '..WWW..',
      '.WWWWW.',
      '.WWWWW.',
      '.WWWWW.',
      'WWWWWWW',
      'WWWWWWW',
      'WWWWWWW',
      'WWWWWWW',
      '.WWWWW.',
      '.WWWWW.',
      '.WWWWW.',
      '..WWW..',
      '..WWW..',
      '...W...',
      '.......',
      '.......',
    ],
    // Y=2: Mid hull
    [
      '.......',
      '...W...',
      '..WWW..',
      '.WW.WW.',
      '.W...W.',
      'WW...WW',
      'W.....W',
      'W.....W',
      'W.....W',
      'W..B..W',
      'W..B..W',
      'W.....W',
      'W.....W',
      'W.....W',
      'WW...WW',
      '.W...W.',
      '.WW.WW.',
      '..WWW..',
      '...W...',
      '.......',
    ],
    // Y=3: Deck level
    [
      '.......',
      '..FWF..',
      '.FWDWF.',
      'FWD.DWF',
      'WD...DW',
      'WD...DW',
      'W..L..W',  // Mast
      'WD...DW',
      'WD...DW',
      'WD...DW',
      'WD...DW',
      'WD...DW',
      'W..L..W',  // Mast
      'WD...DW',
      'WD...DW',
      'FWD.DWF',
      '.FWDWF.',
      '..FWF..',
      '.......',
      '.......',
    ],
    // Y=4-6: Masts
    ...[4, 5, 6].map(() => [
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '...L...',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '...L...',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
    ]),
    // Y=7-9: Lower sails
    ...[7, 8, 9].map(() => [
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.SSSSS.',
      '.SSLSS.',
      '.SSSSS.',
      '.SRSSS.',
      '.SSSSS.',
      '.SSSSS.',
      '.SSLSS.',
      '.SSSSS.',
      '.SRSSS.',
      '.SSSSS.',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
    ]),
    // Y=10-12: Upper masts and sails
    ...[10, 11, 12].map(() => [
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '..SSS..',
      '..SLS..',
      '..SSS..',
      '..SSS..',
      '..SSS..',
      '..SSS..',
      '..SLS..',
      '..SSS..',
      '..SSS..',
      '..SSS..',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
    ]),
    // Y=13-14: Mast tops
    ...[13, 14].map(() => [
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '...L...',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '...L...',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
    ]),
  ];
  
  return voxelToCommands({ palette, layers }, x, y, z, scale);
}

/**
 * Statue on Pedestal - A heroic figure standing on a stone base
 * Size: 5x12x5
 */
export function createStatue(x: number, y: number, z: number, scale: number = 1): string[] {
  const palette: Record<string, string> = {
    'S': 'smooth_stone',      // Pedestal
    'Q': 'quartz_block',      // Statue body
    'G': 'gold_block',        // Accents
    'C': 'chiseled_stone_bricks',
  };
  
  const layers: string[][] = [
    // Y=0-1: Pedestal base
    ...[0, 1].map(() => [
      'SSSSS',
      'SCSCS',
      'SCSCS',
      'SCSCS',
      'SSSSS',
    ]),
    // Y=2: Pedestal top
    [
      '.SSS.',
      'SGGGS',
      'SGSGS',
      'SGGGS',
      '.SSS.',
    ],
    // Y=3-4: Feet/legs
    ...[3, 4].map(() => [
      '.....',
      '.Q.Q.',
      '.....',
      '.Q.Q.',
      '.....',
    ]),
    // Y=5-6: Lower body/robe
    ...[5, 6].map(() => [
      '.....',
      '.QQQ.',
      '.QQQ.',
      '.QQQ.',
      '.....',
    ]),
    // Y=7: Torso
    [
      '.....',
      '.QQQ.',
      'QQQQQ',
      '.QQQ.',
      '.....',
    ],
    // Y=8: Shoulders and arms
    [
      '.....',
      'QQQQQ',
      'Q.Q.Q',
      'QQQQQ',
      '.....',
    ],
    // Y=9: Neck
    [
      '.....',
      '..Q..',
      '.QQQ.',
      '..Q..',
      '.....',
    ],
    // Y=10: Head
    [
      '.....',
      '.QQQ.',
      '.QQQ.',
      '.QQQ.',
      '.....',
    ],
    // Y=11: Crown/top
    [
      '..G..',
      '.GQG.',
      'G.Q.G',
      '.GQG.',
      '..G..',
    ],
  ];
  
  return voxelToCommands({ palette, layers }, x, y, z, scale);
}

/**
 * Lighthouse - A tall lighthouse with light at top
 * Size: 7x18x7
 */
export function createLighthouse(x: number, y: number, z: number, scale: number = 1): string[] {
  const palette: Record<string, string> = {
    'W': 'white_concrete',
    'R': 'red_concrete',
    'S': 'stone_bricks',
    'G': 'glass',
    'L': 'glowstone',
    'B': 'polished_blackstone',
  };
  
  const layers: string[][] = [
    // Y=0-1: Foundation
    ...[0, 1].map(() => [
      '.SSSSS.',
      'SSSSSSS',
      'SSSSSSS',
      'SSSSSSS',
      'SSSSSSS',
      'SSSSSSS',
      '.SSSSS.',
    ]),
    // Y=2-4: Base (white)
    ...[2, 3, 4].map(() => [
      '..WWW..',
      '.WWWWW.',
      'WWW.WWW',
      'WW...WW',
      'WWW.WWW',
      '.WWWWW.',
      '..WWW..',
    ]),
    // Y=5-7: Red stripe
    ...[5, 6, 7].map(() => [
      '..RRR..',
      '.RRRRR.',
      'RRR.RRR',
      'RR...RR',
      'RRR.RRR',
      '.RRRRR.',
      '..RRR..',
    ]),
    // Y=8-10: White section
    ...[8, 9, 10].map(() => [
      '..WWW..',
      '.WWWWW.',
      'WWW.WWW',
      'WW...WW',
      'WWW.WWW',
      '.WWWWW.',
      '..WWW..',
    ]),
    // Y=11-13: Red section
    ...[11, 12, 13].map(() => [
      '...R...',
      '..RRR..',
      '.RR.RR.',
      'RR...RR',
      '.RR.RR.',
      '..RRR..',
      '...R...',
    ]),
    // Y=14: Glass observation deck
    [
      '..BBB..',
      '.BGGGB.',
      'BGG.GGB',
      'BG...GB',
      'BGG.GGB',
      '.BGGGB.',
      '..BBB..',
    ],
    // Y=15: Light level
    [
      '..BBB..',
      '.BLLB.',
      'BL.L.LB',
      'B.LLL.B',
      'BL.L.LB',
      '.BLLB.',
      '..BBB..',
    ],
    // Y=16-17: Roof
    [
      '...B...',
      '..BBB..',
      '.BBBBB.',
      'BBBBBBB',
      '.BBBBB.',
      '..BBB..',
      '...B...',
    ],
    [
      '.......',
      '...B...',
      '..BBB..',
      '.BBBBB.',
      '..BBB..',
      '...B...',
      '.......',
    ],
  ];
  
  return voxelToCommands({ palette, layers }, x, y, z, scale);
}

/**
 * Giant Mushroom House - A fantasy mushroom you can live inside
 * Size: 11x12x11
 */
export function createMushroomHouse(x: number, y: number, z: number, scale: number = 1): string[] {
  const palette: Record<string, string> = {
    'M': 'mushroom_stem',
    'R': 'red_mushroom_block',
    'W': 'white_concrete',   // Spots
    'D': 'oak_door',
    'G': 'glass_pane',
    'L': 'lantern',
  };
  
  const layers: string[][] = [
    // Y=0-1: Stem base
    ...[0, 1].map(() => [
      '...........',
      '...........',
      '...........',
      '....MMM....',
      '...MMMMM...',
      '...MMMMM...',
      '...MMMMM...',
      '....MMM....',
      '...........',
      '...........',
      '...........',
    ]),
    // Y=2: Door level
    [
      '...........',
      '...........',
      '...........',
      '....M.M....',
      '...M...M...',
      '........... ',  // Door
      '...M...M...',
      '....MMM....',
      '...........',
      '...........',
      '...........',
    ],
    // Y=3-4: Inside stem
    ...[3, 4].map(() => [
      '...........',
      '...........',
      '...........',
      '....M.M....',
      '...M...M...',
      '...M.L.M...',  // Lantern inside
      '...M...M...',
      '....M.M....',
      '...........',
      '...........',
      '...........',
    ]),
    // Y=5: Cap start (wide)
    [
      '..RRRRRRR..',
      '.RRRRRRRRR.',
      'RRRRWRRWRRR',
      'RRRR.M.RRRR',
      'RRW..M..WRR',
      'RRR..M..RRR',
      'RRW..M..WRR',
      'RRRR.M.RRRR',
      'RRRRWRRWRRR',
      '.RRRRRRRRR.',
      '..RRRRRRR..',
    ],
    // Y=6-7: Cap middle
    ...[6, 7].map(() => [
      '.RRWRRRRWR.',
      'RRRRRRRRRR.',
      'RWRRRRRRRWR',
      'RRRR...RRRR',
      'RRR.....RRR',
      'RRR.....RRR',
      'RRR.....RRR',
      'RRRR...RRRR',
      'RWRRRRRRRWR',
      '.RRRRRRRRR.',
      '.RRWRRRRWR.',
    ]),
    // Y=8-9: Cap upper
    ...[8, 9].map(() => [
      '..RRWWWRR..',
      '.RRRRRRRR..',
      'RRRRRRRRRR.',
      'RRRR...RRRR',
      'WRR.....RRW',
      'WRR.....RRW',
      'WRR.....RRW',
      'RRRR...RRRR',
      'RRRRRRRRRR.',
      '.RRRRRRRR..',
      '..RRWWWRR..',
    ]),
    // Y=10: Cap top
    [
      '...RRRRR...',
      '..RRRRRRR..',
      '.RRRRWRRRR.',
      'RRRRRRRRRR.',
      'RRWRRRRRWRR',
      'RRRRRRRRRR.',
      'RRWRRRRRWRR',
      'RRRRRRRRRR.',
      '.RRRRWRRRR.',
      '..RRRRRRR..',
      '...RRRRR...',
    ],
    // Y=11: Cap peak
    [
      '...........',
      '...RRRRR...',
      '..RRWWWRR..',
      '.RRRRRRRR..',
      '.RWRRRRRW..',
      '.RRRRRRRR..',
      '.RWRRRRRW..',
      '.RRRRRRRR..',
      '..RRWWWRR..',
      '...RRRRR...',
      '...........',
    ],
  ];
  
  return voxelToCommands({ palette, layers }, x, y, z, scale);
}

/**
 * Airplane - A simple airplane
 * Size: 7x5x15
 */
export function createAirplane(x: number, y: number, z: number, scale: number = 1): string[] {
  const palette: Record<string, string> = {
    'W': 'white_concrete',
    'B': 'blue_concrete',
    'G': 'glass',
    'R': 'red_concrete',
    'I': 'iron_block',
  };
  
  const layers: string[][] = [
    // Y=0: Landing gear
    [
      '.......',
      '.......',
      '.......',
      '.......',
      '..I.I..',
      '..I.I..',
      '.......',
      '.......',
      '.......',
      '.......',
      '..I.I..',
      '.......',
      '.......',
      '.......',
      '.......',
    ],
    // Y=1: Fuselage bottom
    [
      '.......',
      '.......',
      '...W...',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '...W...',
      '.......',
      '.......',
    ],
    // Y=2: Fuselage with wings
    [
      '.......',
      '...R...',
      '..WWW..',
      '.WGGGW.',
      'WWGGGWW',
      'WWWWWWW',
      'WWWWWWW',
      'WWWWWWW',
      'WWWWWWW',
      'WWWWWWW',
      'WWGGGWW',
      '.WGGGW.',
      '..WWW..',
      '...W...',
      '.......',
    ],
    // Y=3: Top with tail start
    [
      '...B...',
      '...B...',
      '...W...',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '..WWW..',
      '...W...',
      '.......',
      '.......',
    ],
    // Y=4: Tail fin
    [
      '...B...',
      '...B...',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
    ],
  ];
  
  return voxelToCommands({ palette, layers }, x, y, z, scale);
}

// ═══════════════════════════════════════════════════════════════
// VOXEL OBJECT REGISTRY
// ═══════════════════════════════════════════════════════════════

export const VOXEL_OBJECTS: Record<string, (x: number, y: number, z: number, scale: number) => string[]> = {
  castletower: createCastleTower,
  castle_tower: createCastleTower,
  tower: createCastleTower,
  cottage: createCottage,
  house: createCottage,
  ship: createShip,
  boat: createShip,
  statue: createStatue,
  lighthouse: createLighthouse,
  mushroom: createMushroomHouse,
  mushroomhouse: createMushroomHouse,
  airplane: createAirplane,
  plane: createAirplane,
};

/**
 * Process a voxel object command
 */
export function processVoxelObjectCommand(
  name: string,
  x: number,
  y: number,
  z: number,
  scale: number = 1
): string[] {
  const generator = VOXEL_OBJECTS[name.toLowerCase().replace(/[_-]/g, '')];
  if (!generator) {
    console.warn(`Unknown voxel object: ${name}`);
    return [];
  }
  return generator(x, y, z, scale);
}
