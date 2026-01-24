/**
 * Sophisticated WorldEdit Structure Generator
 * 
 * Generates procedural, unique structures using WorldEdit's advanced features:
 * - Mathematical expressions for organic shapes
 * - Pattern system for gradients and random distributions
 * - Complex geometric compositions
 * - Theme-aware material palettes
 * 
 * Every world should look hand-crafted by a skilled builder.
 */

import type {
  GeneratedStructure,
  WorldEditCommand,
  StructureCategory,
  MaterialPalette,
  StructureGenerationParams,
  StructurePosition,
} from '../types/index.js';

// ============== SEEDED RANDOM NUMBER GENERATOR ==============

/**
 * Mulberry32 - Simple, fast seeded PRNG
 */
function createSeededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  
  return function() {
    h |= 0;
    h = h + 0x6D2B79F5 | 0;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ============== MATERIAL PALETTES ==============

const PALETTES: Record<string, MaterialPalette> = {
  ethereal: {
    primary: ['white_concrete', 'light_gray_concrete', 'quartz_block'],
    secondary: ['light_blue_stained_glass', 'cyan_stained_glass', 'white_stained_glass'],
    detail: ['sea_lantern', 'end_rod', 'white_glazed_terracotta'],
    light: ['sea_lantern', 'end_rod', 'glowstone'],
    organic: ['azalea_leaves', 'flowering_azalea_leaves', 'moss_block'],
    special: ['beacon', 'end_crystal', 'amethyst_block'],
  },
  obsidian: {
    primary: ['obsidian', 'black_concrete', 'crying_obsidian'],
    secondary: ['purple_stained_glass', 'magenta_stained_glass', 'black_stained_glass'],
    detail: ['purple_glazed_terracotta', 'magenta_glazed_terracotta', 'purpur_block'],
    light: ['crying_obsidian', 'shroomlight', 'soul_lantern'],
    organic: ['crimson_nylium', 'warped_nylium', 'nether_wart_block'],
    special: ['dragon_egg', 'end_portal_frame', 'respawn_anchor'],
  },
  volcanic: {
    primary: ['blackstone', 'basalt', 'deepslate'],
    secondary: ['magma_block', 'orange_stained_glass', 'red_stained_glass'],
    detail: ['gilded_blackstone', 'polished_blackstone', 'cracked_deepslate_bricks'],
    light: ['magma_block', 'lava', 'shroomlight'],
    organic: ['crimson_stem', 'nether_wart_block', 'shroomlight'],
    special: ['ancient_debris', 'netherite_block', 'lodestone'],
  },
  celestial: {
    primary: ['gold_block', 'yellow_concrete', 'honeycomb_block'],
    secondary: ['yellow_stained_glass', 'orange_stained_glass', 'white_stained_glass'],
    detail: ['gold_block', 'raw_gold_block', 'yellow_glazed_terracotta'],
    light: ['glowstone', 'sea_lantern', 'jack_o_lantern'],
    organic: ['hay_block', 'honey_block', 'bee_nest'],
    special: ['beacon', 'bell', 'lightning_rod'],
  },
  aquatic: {
    primary: ['prismarine', 'dark_prismarine', 'prismarine_bricks'],
    secondary: ['light_blue_stained_glass', 'cyan_stained_glass', 'blue_stained_glass'],
    detail: ['sea_lantern', 'blue_glazed_terracotta', 'cyan_glazed_terracotta'],
    light: ['sea_lantern', 'conduit', 'glow_lichen'],
    organic: ['kelp', 'seagrass', 'coral_block'],
    special: ['conduit', 'heart_of_the_sea', 'nautilus_shell'],
  },
  forest: {
    primary: ['dark_oak_log', 'spruce_log', 'oak_log'],
    secondary: ['green_stained_glass', 'lime_stained_glass', 'brown_stained_glass'],
    detail: ['moss_block', 'mossy_cobblestone', 'mossy_stone_bricks'],
    light: ['shroomlight', 'glow_lichen', 'jack_o_lantern'],
    organic: ['oak_leaves', 'dark_oak_leaves', 'azalea_leaves'],
    special: ['bee_nest', 'mushroom_stem', 'brown_mushroom_block'],
  },
  crystalline: {
    primary: ['amethyst_block', 'purpur_block', 'white_concrete'],
    secondary: ['pink_stained_glass', 'magenta_stained_glass', 'purple_stained_glass'],
    detail: ['amethyst_cluster', 'budding_amethyst', 'calcite'],
    light: ['amethyst_cluster', 'end_rod', 'sea_lantern'],
    organic: ['chorus_flower', 'chorus_plant', 'pink_petals'],
    special: ['amethyst_cluster', 'tinted_glass', 'budding_amethyst'],
  },
  mechanical: {
    primary: ['iron_block', 'copper_block', 'exposed_copper'],
    secondary: ['gray_stained_glass', 'light_gray_stained_glass', 'orange_stained_glass'],
    detail: ['redstone_lamp', 'observer', 'piston'],
    light: ['redstone_lamp', 'copper_bulb', 'sea_lantern'],
    organic: ['oxidized_copper', 'weathered_copper', 'cut_copper'],
    special: ['beacon', 'conduit', 'lightning_rod'],
  },
  candy: {
    primary: ['pink_concrete', 'magenta_concrete', 'white_concrete'],
    secondary: ['pink_stained_glass', 'magenta_stained_glass', 'light_blue_stained_glass'],
    detail: ['pink_glazed_terracotta', 'magenta_glazed_terracotta', 'white_glazed_terracotta'],
    light: ['sea_lantern', 'glowstone', 'pink_candle'],
    organic: ['cherry_leaves', 'pink_petals', 'pearlescent_froglight'],
    special: ['cake', 'pink_candle', 'magenta_candle'],
  },
  arctic: {
    primary: ['packed_ice', 'blue_ice', 'snow_block'],
    secondary: ['light_blue_stained_glass', 'white_stained_glass', 'cyan_stained_glass'],
    detail: ['ice', 'frosted_ice', 'powder_snow'],
    light: ['sea_lantern', 'end_rod', 'verdant_froglight'],
    organic: ['snow', 'powder_snow', 'white_wool'],
    special: ['blue_ice', 'beacon', 'end_rod'],
  },
};

// ============== HELPER FUNCTIONS ==============

function pickRandom<T>(arr: T[], random: () => number): T {
  return arr[Math.floor(random() * arr.length)];
}

function pickMultiple<T>(arr: T[], count: number, random: () => number): T[] {
  const shuffled = [...arr].sort(() => random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function range(start: number, end: number, random: () => number): number {
  return Math.floor(random() * (end - start + 1)) + start;
}

function rangeFloat(start: number, end: number, random: () => number): number {
  return random() * (end - start) + start;
}

/**
 * Create a weighted block pattern string
 */
function createPattern(blocks: string[], weights?: number[]): string {
  if (!weights || weights.length !== blocks.length) {
    // Equal distribution
    return blocks.join(',');
  }
  return blocks.map((block, i) => `${weights[i]}%${block}`).join(',');
}

/**
 * Create a gradient pattern (vertical or horizontal)
 */
function createGradientPattern(
  blocks: string[],
  direction: 'vertical' | 'horizontal' = 'vertical'
): string {
  // WorldEdit expression pattern for gradients
  // Using y/height ratio for vertical, x/width for horizontal
  const axis = direction === 'vertical' ? 'y' : 'x';
  // Simplified gradient - just use weighted patterns for different heights
  return blocks.join(',');
}

/**
 * Create a noise-based random distribution
 */
function createNoisePattern(primary: string, secondary: string[], ratio: number): string {
  const primaryWeight = Math.floor(ratio * 100);
  const secondaryWeight = Math.floor((100 - primaryWeight) / secondary.length);
  
  const parts = [`${primaryWeight}%${primary}`];
  secondary.forEach(block => parts.push(`${secondaryWeight}%${block}`));
  
  return parts.join(',');
}

// ============== STRUCTURE GENERATORS ==============

/**
 * Generate a spiraling tower with organic elements
 */
function generateSpiralTower(
  params: StructureGenerationParams,
  position: StructurePosition,
  random: () => number
): GeneratedStructure {
  const palette = PALETTES[params.theme] || PALETTES.ethereal;
  const height = range(40, 80, random) * params.scale;
  const baseRadius = range(8, 15, random) * params.scale;
  const spiralTurns = range(2, 5, random);
  
  const commands: WorldEditCommand[] = [];
  const x = position.x;
  const y = position.y;
  const z = position.z;
  
  // Create the base using gradient materials
  const basePattern = createNoisePattern(
    pickRandom(palette.primary, random),
    pickMultiple(palette.secondary, 2, random),
    0.7
  );
  
  commands.push({
    command: `//pos1 ${x - baseRadius},${y},${z - baseRadius}`,
    description: 'Set first position for tower base',
  });
  
  commands.push({
    command: `//pos2 ${x + baseRadius},${y + 5},${z + baseRadius}`,
    description: 'Set second position for tower base',
  });
  
  commands.push({
    command: `//cyl ${basePattern} ${baseRadius} 5`,
    description: 'Create tower foundation',
    delayMs: 100,
  });
  
  // Build spiral segments up the tower
  const segments = Math.floor(height / 10);
  for (let i = 0; i < segments; i++) {
    const segmentY = y + 5 + (i * 10);
    const segmentRadius = baseRadius - (i * 0.5); // Taper
    const angle = (i * (360 / segments) * spiralTurns) * (Math.PI / 180);
    
    // Offset for spiral effect
    const offsetX = Math.cos(angle) * 2;
    const offsetZ = Math.sin(angle) * 2;
    
    const segmentPattern = createNoisePattern(
      pickRandom(palette.primary, random),
      [pickRandom(palette.detail, random)],
      0.8 - (i * 0.02)
    );
    
    commands.push({
      command: `//pos1 ${Math.round(x + offsetX)},${segmentY},${Math.round(z + offsetZ)}`,
      description: `Position for spiral segment ${i + 1}`,
    });
    
    commands.push({
      command: `//cyl ${segmentPattern} ${Math.max(3, Math.round(segmentRadius))} 10`,
      description: `Create spiral segment ${i + 1}`,
      delayMs: 50,
    });
    
    // Add decorative windows/openings
    if (random() > 0.5 && segmentRadius > 4) {
      const windowPattern = pickRandom(palette.secondary, random);
      const windowAngle = random() * Math.PI * 2;
      const windowX = Math.round(x + Math.cos(windowAngle) * (segmentRadius - 1));
      const windowZ = Math.round(z + Math.sin(windowAngle) * (segmentRadius - 1));
      
      commands.push({
        command: `//pos1 ${windowX},${segmentY + 2},${windowZ}`,
        description: 'Window position',
      });
      commands.push({
        command: `//pos2 ${windowX},${segmentY + 6},${windowZ}`,
        description: 'Window end',
      });
      commands.push({
        command: `//set ${windowPattern}`,
        description: 'Create window',
        delayMs: 20,
      });
    }
  }
  
  // Crown/top decoration
  const crownY = y + height;
  const crownPattern = createPattern(
    [pickRandom(palette.special, random), pickRandom(palette.light, random)],
    [60, 40]
  );
  
  commands.push({
    command: `//pos1 ${x},${crownY},${z}`,
    description: 'Crown position',
  });
  commands.push({
    command: `//hsphere ${crownPattern} ${Math.round(baseRadius * 0.6)}`,
    description: 'Create crown dome',
    delayMs: 100,
  });
  
  // Add floating lights around the top
  const lightBlock = pickRandom(palette.light, random);
  for (let i = 0; i < 8; i++) {
    const lightAngle = (i / 8) * Math.PI * 2;
    const lightRadius = baseRadius * 0.8;
    const lightX = Math.round(x + Math.cos(lightAngle) * lightRadius);
    const lightZ = Math.round(z + Math.sin(lightAngle) * lightRadius);
    const lightY = crownY + range(-3, 5, random);
    
    commands.push({
      command: `//pos1 ${lightX},${lightY},${lightZ}`,
      description: `Floating light ${i + 1}`,
    });
    commands.push({
      command: `//set ${lightBlock}`,
      description: 'Place light',
      delayMs: 10,
    });
  }
  
  return {
    id: `spiral-tower-${Date.now().toString(36)}`,
    name: 'Spiral Ascension Tower',
    description: `A ${Math.round(height)}-block tall spiraling tower with ${spiralTurns} turns, crowned with floating lights`,
    position,
    category: 'tower',
    commands,
    estimatedBlocks: Math.round(Math.PI * baseRadius * baseRadius * height * 0.3),
    tags: ['tower', 'spiral', 'vertical', params.theme],
  };
}

/**
 * Generate an organic floating island
 */
function generateFloatingIsland(
  params: StructureGenerationParams,
  position: StructurePosition,
  random: () => number
): GeneratedStructure {
  const palette = PALETTES[params.theme] || PALETTES.forest;
  const radius = range(20, 40, random) * params.scale;
  const thickness = range(8, 15, random) * params.scale;
  
  const commands: WorldEditCommand[] = [];
  const x = position.x;
  const y = position.y;
  const z = position.z;
  
  // Main island body - use expression for organic shape
  const stonePattern = createNoisePattern(
    'stone',
    ['cobblestone', 'andesite', 'diorite'],
    0.6
  );
  
  // Create the bottom (inverted dome with noise)
  commands.push({
    command: `//pos1 ${x},${y - thickness},${z}`,
    description: 'Island center bottom',
  });
  
  // Use a sphere and then modify it
  commands.push({
    command: `//sphere ${stonePattern} ${Math.round(radius)},${Math.round(thickness)},${Math.round(radius)}`,
    description: 'Create base island shape',
    delayMs: 200,
  });
  
  // Carve out the top half to make it island-like
  commands.push({
    command: `//pos1 ${x - radius - 5},${y + 3},${z - radius - 5}`,
    description: 'Top removal start',
  });
  commands.push({
    command: `//pos2 ${x + radius + 5},${y + thickness + 5},${z + radius + 5}`,
    description: 'Top removal end',
  });
  commands.push({
    command: `//replace ${stonePattern} air`,
    description: 'Carve top of island',
    delayMs: 100,
  });
  
  // Add grass/surface layer
  const surfacePattern = createNoisePattern(
    'grass_block',
    ['podzol', 'coarse_dirt'],
    0.85
  );
  
  commands.push({
    command: `//pos1 ${x - radius},${y},${z - radius}`,
    description: 'Surface layer start',
  });
  commands.push({
    command: `//pos2 ${x + radius},${y + 2},${z + radius}`,
    description: 'Surface layer end',
  });
  commands.push({
    command: `//replace stone,cobblestone,andesite,diorite ${surfacePattern}`,
    description: 'Add grass surface',
    delayMs: 100,
  });
  
  // Add hanging vines/roots underneath
  const vineBlock = pickRandom(['vine', 'weeping_vines', ...palette.organic], random);
  const vineCount = range(15, 30, random);
  
  for (let i = 0; i < vineCount; i++) {
    const vineAngle = random() * Math.PI * 2;
    const vineRadius = random() * radius * 0.8;
    const vineX = Math.round(x + Math.cos(vineAngle) * vineRadius);
    const vineZ = Math.round(z + Math.sin(vineAngle) * vineRadius);
    const vineLength = range(5, 20, random);
    
    commands.push({
      command: `//pos1 ${vineX},${y - thickness + 2},${vineZ}`,
      description: `Vine ${i + 1} top`,
    });
    commands.push({
      command: `//pos2 ${vineX},${y - thickness - vineLength},${vineZ}`,
      description: `Vine ${i + 1} bottom`,
    });
    commands.push({
      command: `//set ${vineBlock}`,
      description: 'Create hanging vine',
      delayMs: 10,
      optional: true,
    });
  }
  
  // Add trees/features on top
  const treeCount = range(3, 8, random);
  for (let i = 0; i < treeCount; i++) {
    const treeAngle = random() * Math.PI * 2;
    const treeRadius = random() * radius * 0.6;
    const treeX = Math.round(x + Math.cos(treeAngle) * treeRadius);
    const treeZ = Math.round(z + Math.sin(treeAngle) * treeRadius);
    
    // Simple custom tree
    const logBlock = pickRandom(palette.primary, random);
    const leafBlock = pickRandom(palette.organic, random);
    const treeHeight = range(6, 12, random);
    
    // Trunk
    commands.push({
      command: `//pos1 ${treeX},${y + 1},${treeZ}`,
      description: `Tree ${i + 1} base`,
    });
    commands.push({
      command: `//pos2 ${treeX},${y + treeHeight},${treeZ}`,
      description: `Tree ${i + 1} top`,
    });
    commands.push({
      command: `//set ${logBlock}`,
      description: 'Create tree trunk',
      delayMs: 20,
      optional: true,
    });
    
    // Canopy
    commands.push({
      command: `//pos1 ${treeX},${y + treeHeight - 2},${treeZ}`,
      description: `Tree ${i + 1} canopy center`,
    });
    commands.push({
      command: `//sphere ${leafBlock} ${range(3, 5, random)}`,
      description: 'Create tree canopy',
      delayMs: 30,
      optional: true,
    });
  }
  
  // Add glowing elements
  const glowBlock = pickRandom(palette.light, random);
  const glowCount = range(5, 15, random);
  
  for (let i = 0; i < glowCount; i++) {
    const glowAngle = random() * Math.PI * 2;
    const glowRadius = random() * radius * 0.9;
    const glowX = Math.round(x + Math.cos(glowAngle) * glowRadius);
    const glowZ = Math.round(z + Math.sin(glowAngle) * glowRadius);
    const glowY = y + range(-thickness + 3, 1, random);
    
    commands.push({
      command: `//pos1 ${glowX},${glowY},${glowZ}`,
      description: `Glow point ${i + 1}`,
    });
    commands.push({
      command: `//set ${glowBlock}`,
      description: 'Add glow block',
      delayMs: 5,
      optional: true,
    });
  }
  
  return {
    id: `floating-island-${Date.now().toString(36)}`,
    name: 'Ethereal Floating Island',
    description: `A ${Math.round(radius * 2)}-block wide floating island with hanging vines and ${treeCount} custom trees`,
    position,
    category: 'floating',
    commands,
    estimatedBlocks: Math.round(Math.PI * radius * radius * thickness * 0.4),
    tags: ['floating', 'island', 'organic', params.theme],
  };
}

/**
 * Generate an organic archway with mathematical curves
 */
function generateOrganicArch(
  params: StructureGenerationParams,
  position: StructurePosition,
  random: () => number
): GeneratedStructure {
  const palette = PALETTES[params.theme] || PALETTES.crystalline;
  const height = range(25, 50, random) * params.scale;
  const width = range(30, 60, random) * params.scale;
  const thickness = range(3, 6, random) * params.scale;
  
  const commands: WorldEditCommand[] = [];
  const x = position.x;
  const y = position.y;
  const z = position.z;
  
  // Create arch using cylinder segments along a parabolic curve
  const segments = Math.floor(width / 3);
  const pattern = createNoisePattern(
    pickRandom(palette.primary, random),
    pickMultiple(palette.secondary, 2, random),
    0.75
  );
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments; // 0 to 1
    const archX = x - width / 2 + (t * width);
    
    // Parabolic curve: y = height * (1 - (2t-1)^2)
    const normalizedT = 2 * t - 1; // -1 to 1
    const archY = y + height * (1 - normalizedT * normalizedT);
    
    // Add some organic waviness
    const waveOffset = Math.sin(t * Math.PI * 4 + random() * 2) * 2;
    
    commands.push({
      command: `//pos1 ${Math.round(archX)},${Math.round(archY + waveOffset)},${z}`,
      description: `Arch segment ${i + 1} position`,
    });
    commands.push({
      command: `//cyl ${pattern} ${Math.round(thickness)},${Math.round(thickness)},${Math.round(thickness * 2)}`,
      description: `Create arch segment ${i + 1}`,
      delayMs: 30,
    });
  }
  
  // Add decorative crystal clusters at apex
  const crystalPattern = createPattern(
    [pickRandom(palette.special, random), pickRandom(palette.detail, random)],
    [70, 30]
  );
  
  commands.push({
    command: `//pos1 ${x},${y + height + 2},${z}`,
    description: 'Apex decoration position',
  });
  commands.push({
    command: `//sphere ${crystalPattern} ${Math.round(thickness * 1.5)}`,
    description: 'Create apex decoration',
    delayMs: 50,
  });
  
  // Add hanging elements
  const hangCount = range(8, 15, random);
  const hangBlock = pickRandom([...palette.light, ...palette.special], random);
  
  for (let i = 0; i < hangCount; i++) {
    const t = random();
    const hangX = x - width / 2 + (t * width);
    const normalizedT = 2 * t - 1;
    const hangY = y + height * (1 - normalizedT * normalizedT) - range(2, 8, random);
    
    commands.push({
      command: `//pos1 ${Math.round(hangX)},${Math.round(hangY)},${z + range(-2, 2, random)}`,
      description: `Hanging element ${i + 1}`,
    });
    commands.push({
      command: `//set ${hangBlock}`,
      description: 'Place hanging element',
      delayMs: 10,
      optional: true,
    });
  }
  
  // Ground pillars at base
  const pillarPattern = createNoisePattern(
    pickRandom(palette.primary, random),
    [pickRandom(palette.detail, random)],
    0.85
  );
  
  // Left pillar
  commands.push({
    command: `//pos1 ${x - Math.round(width / 2)},${y},${z}`,
    description: 'Left pillar base',
  });
  commands.push({
    command: `//cyl ${pillarPattern} ${Math.round(thickness * 1.5)} ${range(5, 12, random)}`,
    description: 'Create left pillar',
    delayMs: 50,
  });
  
  // Right pillar
  commands.push({
    command: `//pos1 ${x + Math.round(width / 2)},${y},${z}`,
    description: 'Right pillar base',
  });
  commands.push({
    command: `//cyl ${pillarPattern} ${Math.round(thickness * 1.5)} ${range(5, 12, random)}`,
    description: 'Create right pillar',
    delayMs: 50,
  });
  
  return {
    id: `organic-arch-${Date.now().toString(36)}`,
    name: 'Crystalline Gateway Arch',
    description: `A ${Math.round(width)}-block wide organic arch reaching ${Math.round(height)} blocks high with hanging decorations`,
    position,
    category: 'architectural',
    commands,
    estimatedBlocks: Math.round(segments * Math.PI * thickness * thickness * 4 + 500),
    tags: ['arch', 'gateway', 'organic', params.theme],
  };
}

/**
 * Generate a massive monument/statue base
 */
function generateMonument(
  params: StructureGenerationParams,
  position: StructurePosition,
  random: () => number
): GeneratedStructure {
  const palette = PALETTES[params.theme] || PALETTES.celestial;
  const baseSize = range(30, 50, random) * params.scale;
  const height = range(60, 100, random) * params.scale;
  
  const commands: WorldEditCommand[] = [];
  const x = position.x;
  const y = position.y;
  const z = position.z;
  
  // Tiered base platform
  const tiers = range(3, 5, random);
  const basePattern = createNoisePattern(
    pickRandom(palette.primary, random),
    pickMultiple(palette.detail, 2, random),
    0.8
  );
  
  for (let tier = 0; tier < tiers; tier++) {
    const tierSize = baseSize - (tier * 5);
    const tierHeight = 4;
    const tierY = y + (tier * tierHeight);
    
    commands.push({
      command: `//pos1 ${x - tierSize},${tierY},${z - tierSize}`,
      description: `Tier ${tier + 1} corner 1`,
    });
    commands.push({
      command: `//pos2 ${x + tierSize},${tierY + tierHeight},${z + tierSize}`,
      description: `Tier ${tier + 1} corner 2`,
    });
    commands.push({
      command: `//set ${basePattern}`,
      description: `Create tier ${tier + 1}`,
      delayMs: 100,
    });
    
    // Add corner pillars for each tier
    const pillarBlock = pickRandom(palette.secondary, random);
    const corners = [
      [-tierSize, -tierSize],
      [-tierSize, tierSize],
      [tierSize, -tierSize],
      [tierSize, tierSize],
    ];
    
    for (const [dx, dz] of corners) {
      commands.push({
        command: `//pos1 ${x + dx},${tierY},${z + dz}`,
        description: 'Corner pillar base',
      });
      commands.push({
        command: `//cyl ${pillarBlock} 2 ${tierHeight + 2}`,
        description: 'Create corner pillar',
        delayMs: 20,
      });
    }
  }
  
  // Central spire
  const spireBaseY = y + (tiers * 4);
  const spireRadius = Math.round(baseSize * 0.3);
  const spirePattern = createNoisePattern(
    pickRandom(palette.primary, random),
    [pickRandom(palette.special, random)],
    0.7
  );
  
  // Spire segments that taper
  const spireSegments = Math.floor(height / 15);
  for (let i = 0; i < spireSegments; i++) {
    const segmentY = spireBaseY + (i * 15);
    const segmentRadius = spireRadius * (1 - (i / spireSegments) * 0.7);
    
    commands.push({
      command: `//pos1 ${x},${segmentY},${z}`,
      description: `Spire segment ${i + 1}`,
    });
    commands.push({
      command: `//cyl ${spirePattern} ${Math.max(2, Math.round(segmentRadius))} 15`,
      description: `Create spire segment ${i + 1}`,
      delayMs: 80,
    });
    
    // Add ring decorations
    if (i > 0 && random() > 0.4) {
      const ringBlock = pickRandom(palette.detail, random);
      commands.push({
        command: `//pos1 ${x},${segmentY},${z}`,
        description: 'Ring decoration center',
      });
      commands.push({
        command: `//hcyl ${ringBlock} ${Math.round(segmentRadius + 2)} 1`,
        description: 'Add ring decoration',
        delayMs: 30,
      });
    }
  }
  
  // Beacon/crown at top
  const crownY = spireBaseY + height - 10;
  const crownPattern = createPattern(
    [pickRandom(palette.special, random), pickRandom(palette.light, random)],
    [50, 50]
  );
  
  commands.push({
    command: `//pos1 ${x},${crownY},${z}`,
    description: 'Crown position',
  });
  commands.push({
    command: `//sphere ${crownPattern} ${range(5, 8, random)}`,
    description: 'Create glowing crown',
    delayMs: 50,
  });
  
  // Floating rings around the monument
  const ringCount = range(3, 6, random);
  for (let i = 0; i < ringCount; i++) {
    const ringY = spireBaseY + (i + 1) * (height / (ringCount + 1));
    const ringRadius = spireRadius + range(8, 15, random);
    const ringBlock = pickRandom([...palette.light, ...palette.secondary], random);
    
    commands.push({
      command: `//pos1 ${x},${Math.round(ringY)},${z}`,
      description: `Floating ring ${i + 1}`,
    });
    commands.push({
      command: `//hcyl ${ringBlock} ${ringRadius} 1`,
      description: 'Create floating ring',
      delayMs: 40,
    });
  }
  
  return {
    id: `monument-${Date.now().toString(36)}`,
    name: 'Celestial Monument',
    description: `A ${tiers}-tiered monument reaching ${Math.round(height)} blocks with ${ringCount} floating rings`,
    position,
    category: 'monument',
    commands,
    estimatedBlocks: Math.round(baseSize * baseSize * tiers * 4 + Math.PI * spireRadius * spireRadius * height * 0.3),
    tags: ['monument', 'vertical', 'majestic', params.theme],
  };
}

/**
 * Generate terrain features (mountains, valleys, etc.)
 */
function generateTerrainFeature(
  params: StructureGenerationParams,
  position: StructurePosition,
  random: () => number
): GeneratedStructure {
  const palette = PALETTES[params.theme] || PALETTES.volcanic;
  const radius = range(40, 80, random) * params.scale;
  const height = range(30, 60, random) * params.scale;
  
  const commands: WorldEditCommand[] = [];
  const x = position.x;
  const y = position.y;
  const z = position.z;
  
  // Determine terrain type
  const terrainTypes = ['mountain', 'crater', 'ridge', 'canyon'];
  const terrainType = pickRandom(terrainTypes, random);
  
  if (terrainType === 'mountain' || terrainType === 'ridge') {
    // Create mountain/ridge using cone shape
    const pattern = createNoisePattern(
      'stone',
      ['cobblestone', 'andesite', pickRandom(palette.primary, random)],
      0.5
    );
    
    commands.push({
      command: `//pos1 ${x},${y},${z}`,
      description: 'Mountain peak position',
    });
    commands.push({
      command: `//pyramid ${pattern} ${Math.round(radius)}`,
      description: 'Create mountain base shape',
      delayMs: 200,
    });
    
    // Add snow cap
    const snowCapY = y + height * 0.7;
    commands.push({
      command: `//pos1 ${x - radius * 0.4},${Math.round(snowCapY)},${z - radius * 0.4}`,
      description: 'Snow cap area start',
    });
    commands.push({
      command: `//pos2 ${x + radius * 0.4},${y + height},${z + radius * 0.4}`,
      description: 'Snow cap area end',
    });
    commands.push({
      command: `//replace stone,cobblestone,andesite snow_block,powder_snow`,
      description: 'Add snow cap',
      delayMs: 100,
    });
    
    // Add lava/glow features if volcanic theme
    if (params.theme === 'volcanic') {
      commands.push({
        command: `//pos1 ${x},${y + height - 3},${z}`,
        description: 'Crater center',
      });
      commands.push({
        command: `//cyl magma_block,lava 3 -5`,
        description: 'Add volcanic crater',
        delayMs: 50,
      });
    }
  } else if (terrainType === 'crater') {
    // Create crater using hollow sphere carving
    const rimPattern = createNoisePattern(
      pickRandom(palette.primary, random),
      pickMultiple(palette.detail, 2, random),
      0.6
    );
    
    // Rim
    commands.push({
      command: `//pos1 ${x},${y},${z}`,
      description: 'Crater center',
    });
    commands.push({
      command: `//hcyl ${rimPattern} ${Math.round(radius)} ${range(5, 10, random)}`,
      description: 'Create crater rim',
      delayMs: 150,
    });
    
    // Inner depression (air to carve out)
    commands.push({
      command: `//pos1 ${x},${y},${z}`,
      description: 'Crater interior',
    });
    commands.push({
      command: `//cyl air ${Math.round(radius * 0.8)} -${range(10, 20, random)}`,
      description: 'Carve crater interior',
      delayMs: 150,
    });
    
    // Special floor
    const floorBlock = pickRandom([...palette.light, ...palette.special], random);
    commands.push({
      command: `//pos1 ${x},${y - range(15, 25, random)},${z}`,
      description: 'Crater floor center',
    });
    commands.push({
      command: `//cyl ${floorBlock} ${Math.round(radius * 0.5)} 2`,
      description: 'Create special crater floor',
      delayMs: 50,
    });
  } else {
    // Canyon/valley
    const wallPattern = createNoisePattern(
      'stone',
      ['cobblestone', pickRandom(palette.primary, random)],
      0.65
    );
    
    // Carve out a long valley
    const length = radius * 2;
    commands.push({
      command: `//pos1 ${x - 10},${y},${z - length}`,
      description: 'Canyon start',
    });
    commands.push({
      command: `//pos2 ${x + 10},${y - height},${z + length}`,
      description: 'Canyon end',
    });
    commands.push({
      command: `//set air`,
      description: 'Carve canyon',
      delayMs: 200,
    });
    
    // Add some wall detail
    commands.push({
      command: `//pos1 ${x - 12},${y},${z - length}`,
      description: 'Wall detail start',
    });
    commands.push({
      command: `//pos2 ${x - 10},${y - height},${z + length}`,
      description: 'Wall detail end',
    });
    commands.push({
      command: `//set ${wallPattern}`,
      description: 'Add wall texture',
      delayMs: 100,
    });
  }
  
  return {
    id: `terrain-${terrainType}-${Date.now().toString(36)}`,
    name: `${terrainType.charAt(0).toUpperCase() + terrainType.slice(1)} Formation`,
    description: `A ${terrainType} formation spanning ${Math.round(radius * 2)} blocks with ${params.theme} theming`,
    position,
    category: 'terrain',
    commands,
    estimatedBlocks: Math.round(Math.PI * radius * radius * height * 0.2),
    tags: ['terrain', terrainType, 'landscape', params.theme],
  };
}

/**
 * Generate decorative paths and gardens
 */
function generateDecoration(
  params: StructureGenerationParams,
  position: StructurePosition,
  random: () => number
): GeneratedStructure {
  const palette = PALETTES[params.theme] || PALETTES.forest;
  const size = range(20, 40, random) * params.scale;
  
  const commands: WorldEditCommand[] = [];
  const x = position.x;
  const y = position.y;
  const z = position.z;
  
  const decorType = pickRandom(['garden', 'plaza', 'pathway', 'fountain'], random);
  
  if (decorType === 'garden') {
    // Create a circular garden with flowers
    const groundPattern = createNoisePattern(
      'grass_block',
      ['podzol', 'moss_block'],
      0.7
    );
    
    commands.push({
      command: `//pos1 ${x},${y},${z}`,
      description: 'Garden center',
    });
    commands.push({
      command: `//cyl ${groundPattern} ${Math.round(size)} 1`,
      description: 'Create garden ground',
      delayMs: 50,
    });
    
    // Add flower patches
    const flowers = ['poppy', 'dandelion', 'blue_orchid', 'allium', 'azure_bluet', 
                     'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip', 
                     'oxeye_daisy', 'cornflower', 'lily_of_the_valley'];
    
    const patchCount = range(5, 12, random);
    for (let i = 0; i < patchCount; i++) {
      const angle = random() * Math.PI * 2;
      const dist = random() * size * 0.8;
      const patchX = Math.round(x + Math.cos(angle) * dist);
      const patchZ = Math.round(z + Math.sin(angle) * dist);
      const flower = pickRandom(flowers, random);
      
      commands.push({
        command: `//pos1 ${patchX},${y + 1},${patchZ}`,
        description: `Flower patch ${i + 1}`,
      });
      commands.push({
        command: `//cyl ${flower} ${range(2, 4, random)} 1`,
        description: 'Plant flowers',
        delayMs: 20,
        optional: true,
      });
    }
    
    // Central feature
    const centralBlock = pickRandom(palette.special, random);
    commands.push({
      command: `//pos1 ${x},${y + 1},${z}`,
      description: 'Central feature',
    });
    commands.push({
      command: `//set ${centralBlock}`,
      description: 'Place central decoration',
      delayMs: 10,
    });
  } else if (decorType === 'fountain') {
    // Create a fountain
    const stonePattern = createNoisePattern(
      pickRandom(palette.primary, random),
      pickMultiple(palette.detail, 2, random),
      0.8
    );
    
    // Basin
    commands.push({
      command: `//pos1 ${x},${y},${z}`,
      description: 'Fountain basin center',
    });
    commands.push({
      command: `//hcyl ${stonePattern} ${Math.round(size * 0.5)} 3`,
      description: 'Create fountain basin',
      delayMs: 50,
    });
    
    // Water
    commands.push({
      command: `//pos1 ${x},${y + 1},${z}`,
      description: 'Water fill',
    });
    commands.push({
      command: `//cyl water ${Math.round(size * 0.5 - 1)} 1`,
      description: 'Fill with water',
      delayMs: 30,
    });
    
    // Central spout
    commands.push({
      command: `//pos1 ${x},${y},${z}`,
      description: 'Spout base',
    });
    commands.push({
      command: `//cyl ${stonePattern} 2 ${range(8, 15, random)}`,
      description: 'Create central spout',
      delayMs: 30,
    });
    
    // Water streams (represented as glass panes for visual effect)
    const streamBlock = pickRandom(['light_blue_stained_glass', 'water'], random);
    commands.push({
      command: `//pos1 ${x},${y + range(6, 12, random)},${z}`,
      description: 'Water stream source',
    });
    commands.push({
      command: `//hcyl ${streamBlock} 3 1`,
      description: 'Add water effect',
      delayMs: 20,
    });
  } else if (decorType === 'plaza') {
    // Create a paved plaza
    const pavingPattern = createPattern(
      [pickRandom(palette.primary, random), pickRandom(palette.detail, random), 'smooth_stone'],
      [50, 30, 20]
    );
    
    commands.push({
      command: `//pos1 ${x - size},${y},${z - size}`,
      description: 'Plaza corner 1',
    });
    commands.push({
      command: `//pos2 ${x + size},${y},${z + size}`,
      description: 'Plaza corner 2',
    });
    commands.push({
      command: `//set ${pavingPattern}`,
      description: 'Create plaza paving',
      delayMs: 80,
    });
    
    // Add lamp posts
    const lampBlock = pickRandom(palette.light, random);
    const lampCount = 4;
    for (let i = 0; i < lampCount; i++) {
      const lampAngle = (i / lampCount) * Math.PI * 2;
      const lampDist = size * 0.7;
      const lampX = Math.round(x + Math.cos(lampAngle) * lampDist);
      const lampZ = Math.round(z + Math.sin(lampAngle) * lampDist);
      
      // Post
      commands.push({
        command: `//pos1 ${lampX},${y + 1},${lampZ}`,
        description: `Lamp post ${i + 1} base`,
      });
      commands.push({
        command: `//pos2 ${lampX},${y + 5},${lampZ}`,
        description: `Lamp post ${i + 1} top`,
      });
      commands.push({
        command: `//set ${pickRandom(palette.primary, random)}`,
        description: 'Create lamp post',
        delayMs: 10,
      });
      
      // Light
      commands.push({
        command: `//pos1 ${lampX},${y + 6},${lampZ}`,
        description: `Lamp ${i + 1}`,
      });
      commands.push({
        command: `//set ${lampBlock}`,
        description: 'Add lamp light',
        delayMs: 5,
      });
    }
  } else {
    // Pathway - winding path
    const pathPattern = createPattern(
      ['gravel', 'coarse_dirt', pickRandom(palette.detail, random)],
      [50, 30, 20]
    );
    
    const pathLength = range(30, 60, random);
    const segments = Math.floor(pathLength / 5);
    let pathX = x;
    let pathZ = z;
    let angle = random() * Math.PI * 2;
    
    for (let i = 0; i < segments; i++) {
      // Vary the angle slightly for a winding effect
      angle += (random() - 0.5) * 0.5;
      pathX += Math.cos(angle) * 5;
      pathZ += Math.sin(angle) * 5;
      
      commands.push({
        command: `//pos1 ${Math.round(pathX)},${y},${Math.round(pathZ)}`,
        description: `Path segment ${i + 1}`,
      });
      commands.push({
        command: `//cyl ${pathPattern} 2 1`,
        description: 'Create path segment',
        delayMs: 15,
        optional: true,
      });
    }
  }
  
  return {
    id: `decoration-${decorType}-${Date.now().toString(36)}`,
    name: `${decorType.charAt(0).toUpperCase() + decorType.slice(1)} Decoration`,
    description: `A ${decorType} spanning approximately ${Math.round(size * 2)} blocks`,
    position,
    category: 'decoration',
    commands,
    estimatedBlocks: Math.round(size * size * 0.5),
    tags: ['decoration', decorType, params.theme],
  };
}

// ============== MAIN GENERATION FUNCTION ==============

/**
 * Map theme keywords to palette names
 */
function detectPalette(theme: string): string {
  const themeLower = theme.toLowerCase();
  
  const mappings: Record<string, string[]> = {
    ethereal: ['ethereal', 'heaven', 'angel', 'cloud', 'sky', 'divine', 'pure', 'light'],
    obsidian: ['obsidian', 'dark', 'shadow', 'void', 'gothic', 'ender', 'night'],
    volcanic: ['volcanic', 'lava', 'fire', 'inferno', 'magma', 'nether', 'hell', 'flame'],
    celestial: ['celestial', 'gold', 'sun', 'solar', 'royal', 'divine', 'majestic'],
    aquatic: ['aquatic', 'ocean', 'water', 'sea', 'underwater', 'atlantis', 'coral'],
    forest: ['forest', 'nature', 'tree', 'wood', 'jungle', 'green', 'natural'],
    crystalline: ['crystal', 'gem', 'amethyst', 'purple', 'magic', 'mystical', 'enchanted'],
    mechanical: ['mechanical', 'machine', 'steampunk', 'iron', 'copper', 'industrial'],
    candy: ['candy', 'pink', 'sweet', 'barbie', 'cute', 'pastel', 'bubblegum'],
    arctic: ['arctic', 'ice', 'snow', 'frozen', 'winter', 'cold', 'frost'],
  };
  
  for (const [palette, keywords] of Object.entries(mappings)) {
    for (const keyword of keywords) {
      if (themeLower.includes(keyword)) {
        return palette;
      }
    }
  }
  
  // Default to ethereal if no match
  return 'ethereal';
}

/**
 * Determine structure types based on theme
 */
function selectStructureTypes(
  theme: string,
  count: number,
  random: () => number
): StructureCategory[] {
  const themeLower = theme.toLowerCase();
  
  // Weight structure types based on theme
  let weights: Record<StructureCategory, number> = {
    tower: 1,
    monument: 1,
    terrain: 1,
    organic: 1,
    architectural: 1,
    decoration: 1,
    megastructure: 0.3,
    floating: 0.5,
    underground: 0.3,
    water: 0.3,
  };
  
  // Adjust weights based on theme keywords
  if (themeLower.includes('tower') || themeLower.includes('spire')) weights.tower = 3;
  if (themeLower.includes('monument') || themeLower.includes('statue')) weights.monument = 3;
  if (themeLower.includes('mountain') || themeLower.includes('terrain')) weights.terrain = 3;
  if (themeLower.includes('organic') || themeLower.includes('natural')) weights.organic = 3;
  if (themeLower.includes('city') || themeLower.includes('build')) weights.architectural = 3;
  if (themeLower.includes('garden') || themeLower.includes('park')) weights.decoration = 3;
  if (themeLower.includes('mega') || themeLower.includes('giant')) weights.megastructure = 3;
  if (themeLower.includes('float') || themeLower.includes('sky')) weights.floating = 3;
  if (themeLower.includes('underground') || themeLower.includes('cave')) weights.underground = 2;
  if (themeLower.includes('water') || themeLower.includes('ocean')) weights.water = 3;
  
  const types = Object.keys(weights) as StructureCategory[];
  const selected: StructureCategory[] = [];
  
  // Always include one monument-type centerpiece
  if (random() > 0.3) {
    selected.push(pickRandom(['monument', 'tower', 'megastructure'], random) as StructureCategory);
  }
  
  // Fill remaining with weighted random selection
  while (selected.length < count) {
    const totalWeight = types.reduce((sum, t) => sum + weights[t], 0);
    let roll = random() * totalWeight;
    
    for (const type of types) {
      roll -= weights[type];
      if (roll <= 0) {
        selected.push(type);
        // Reduce weight to add variety
        weights[type] *= 0.5;
        break;
      }
    }
  }
  
  return selected;
}

/**
 * Generate positions for structures around spawn
 */
function generatePositions(
  count: number,
  spawnX: number,
  spawnY: number,
  spawnZ: number,
  random: () => number
): StructurePosition[] {
  const positions: StructurePosition[] = [];
  
  // First structure at spawn (or very close)
  positions.push({
    x: spawnX,
    y: spawnY,
    z: spawnZ + 30, // Slightly ahead of spawn
    relativeToSpawn: true,
  });
  
  // Remaining structures in a rough circle/spiral around spawn
  for (let i = 1; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.5;
    const distance = 100 + (i * 50) + (random() * 50);
    
    positions.push({
      x: Math.round(spawnX + Math.cos(angle) * distance),
      y: spawnY + range(-10, 20, random), // Vary elevation
      z: Math.round(spawnZ + Math.sin(angle) * distance),
      relativeToSpawn: true,
    });
  }
  
  return positions;
}

/**
 * Main structure generation function
 * 
 * Takes a theme/description and generates a collection of unique structures
 */
export function generateStructures(
  params: StructureGenerationParams
): GeneratedStructure[] {
  const random = createSeededRandom(params.seed);
  const paletteName = detectPalette(params.theme);
  
  // Determine how many structures based on complexity
  const structureCount = Math.max(3, Math.min(10, Math.floor(params.complexity * 1.5)));
  
  // Select structure types
  const structureTypes = selectStructureTypes(params.theme, structureCount, random);
  
  // Generate positions
  const positions = generatePositions(structureCount, 0, 64, 0, random);
  
  // Generate each structure
  const structures: GeneratedStructure[] = [];
  const generatorParams: StructureGenerationParams = {
    ...params,
    theme: paletteName,
  };
  
  for (let i = 0; i < structureCount; i++) {
    const type = structureTypes[i];
    const position = positions[i];
    
    let structure: GeneratedStructure;
    
    switch (type) {
      case 'tower':
        structure = generateSpiralTower(generatorParams, position, random);
        break;
      case 'floating':
        structure = generateFloatingIsland(generatorParams, position, random);
        break;
      case 'architectural':
        structure = generateOrganicArch(generatorParams, position, random);
        break;
      case 'monument':
      case 'megastructure':
        structure = generateMonument(generatorParams, position, random);
        break;
      case 'terrain':
        structure = generateTerrainFeature(generatorParams, position, random);
        break;
      case 'decoration':
      case 'organic':
        structure = generateDecoration(generatorParams, position, random);
        break;
      default:
        // Default to tower for any unhandled types
        structure = generateSpiralTower(generatorParams, position, random);
    }
    
    structures.push(structure);
  }
  
  return structures;
}

/**
 * Generate structures from a world description
 */
export function generateStructuresFromDescription(
  description: string,
  worldName: string,
  complexity: number = 5
): GeneratedStructure[] {
  return generateStructures({
    seed: worldName + description.slice(0, 50),
    theme: description,
    scale: 1.0,
    complexity,
  });
}




