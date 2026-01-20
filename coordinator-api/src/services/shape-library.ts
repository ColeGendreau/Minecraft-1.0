/**
 * Shape Library - Converts high-level shape specifications into Minecraft /fill commands
 * 
 * The AI specifies WHAT to build using simple shape functions.
 * This library generates the actual commands needed to build those shapes.
 * 
 * Supported shapes:
 * - sphere(x, y, z, radius, block) - solid sphere
 * - hollowSphere(x, y, z, radius, block) - hollow sphere shell
 * - dome(x, y, z, radius, block) - half sphere (top half)
 * - hollowDome(x, y, z, radius, block) - hollow dome shell
 * - cylinder(x, y, z, radius, height, block) - solid cylinder
 * - hollowCylinder(x, y, z, radius, height, block) - hollow cylinder (tube)
 * - pyramid(x, y, z, baseSize, height, block) - 4-sided pyramid
 * - hollowPyramid(x, y, z, baseSize, height, block) - hollow pyramid shell
 * - cone(x, y, z, radius, height, block) - cone shape
 * - arch(x, y, z, width, height, depth, block) - archway
 * - wall(x1, y1, z1, x2, y2, z2, block) - simple wall (fill alias)
 * - floor(x1, z1, x2, z2, y, block) - floor/platform
 * - box(x, y, z, width, height, depth, block, hollow?) - rectangular building
 * - stairs(x, y, z, direction, width, height, block) - staircase
 * - ring(x, y, z, innerRadius, outerRadius, block) - flat ring/donut
 */

// Import other libraries for the unified command processor
import { processComponentCommand, getComponent } from './component-library.js';
import { processImageCommand, PIXEL_ART_LIBRARY } from './image-to-voxel.js';
import { processVoxelObjectCommand, VOXEL_OBJECTS, voxelToCommands, VoxelDefinition } from './voxel-generator.js';

export interface ShapeCommand {
  shape: string;
  params: (number | string | boolean)[];
}

/**
 * Parse a shape command string into structured data
 * Example: "sphere(0, 80, 0, 15, orange_concrete)" -> { shape: "sphere", params: [0, 80, 0, 15, "orange_concrete"] }
 */
export function parseShapeCommand(cmd: string): ShapeCommand | null {
  const match = cmd.match(/^(\w+)\s*\((.*)\)$/);
  if (!match) return null;
  
  const shape = match[1].toLowerCase();
  const paramsStr = match[2];
  
  // Parse parameters - handle numbers, strings, and booleans
  const params: (number | string | boolean)[] = [];
  let current = '';
  let inQuote = false;
  
  for (let i = 0; i <= paramsStr.length; i++) {
    const char = paramsStr[i];
    
    if (char === '"' || char === "'") {
      inQuote = !inQuote;
    } else if ((char === ',' || i === paramsStr.length) && !inQuote) {
      const trimmed = current.trim().replace(/^["']|["']$/g, '');
      if (trimmed) {
        if (trimmed === 'true') params.push(true);
        else if (trimmed === 'false') params.push(false);
        else if (!isNaN(Number(trimmed))) params.push(Number(trimmed));
        else params.push(trimmed);
      }
      current = '';
    } else {
      current += char;
    }
  }
  
  return { shape, params };
}

/**
 * Generate fill commands for a sphere
 * Uses the midpoint circle algorithm extended to 3D
 */
function generateSphere(cx: number, cy: number, cz: number, radius: number, block: string, hollow: boolean = false): string[] {
  const commands: string[] = [];
  const r = Math.floor(radius);
  const r2 = r * r;
  const innerR2 = hollow ? (r - 1) * (r - 1) : 0;
  
  // Build layer by layer (y-axis slices)
  for (let dy = -r; dy <= r; dy++) {
    // Calculate radius at this y level (circle slice of sphere)
    const sliceR2 = r2 - dy * dy;
    if (sliceR2 < 0) continue;
    const sliceR = Math.floor(Math.sqrt(sliceR2));
    
    if (sliceR === 0) {
      // Single block at top/bottom
      commands.push(`fill ${cx} ${cy + dy} ${cz} ${cx} ${cy + dy} ${cz} ${block}`);
      continue;
    }
    
    if (hollow) {
      // For hollow sphere, only place the outline of each circle
      // Use a ring of fill commands
      const y = cy + dy;
      
      // Calculate inner radius for this slice to create shell
      const innerSliceR2 = innerR2 - dy * dy;
      const innerSliceR = innerSliceR2 > 0 ? Math.floor(Math.sqrt(innerSliceR2)) : 0;
      
      if (innerSliceR < sliceR) {
        // Create a ring at this level
        // Top and bottom edges
        commands.push(`fill ${cx - sliceR} ${y} ${cz - sliceR} ${cx + sliceR} ${y} ${cz - innerSliceR - 1} ${block}`);
        commands.push(`fill ${cx - sliceR} ${y} ${cz + innerSliceR + 1} ${cx + sliceR} ${y} ${cz + sliceR} ${block}`);
        // Left and right edges
        if (innerSliceR > 0) {
          commands.push(`fill ${cx - sliceR} ${y} ${cz - innerSliceR} ${cx - innerSliceR - 1} ${y} ${cz + innerSliceR} ${block}`);
          commands.push(`fill ${cx + innerSliceR + 1} ${y} ${cz - innerSliceR} ${cx + sliceR} ${y} ${cz + innerSliceR} ${block}`);
        }
      } else {
        // Solid circle at this level (near poles)
        commands.push(`fill ${cx - sliceR} ${y} ${cz - sliceR} ${cx + sliceR} ${y} ${cz + sliceR} ${block}`);
      }
    } else {
      // Solid sphere - fill the entire circle at this y level
      commands.push(`fill ${cx - sliceR} ${cy + dy} ${cz - sliceR} ${cx + sliceR} ${cy + dy} ${cz + sliceR} ${block}`);
    }
  }
  
  return commands;
}

/**
 * Generate fill commands for a dome (half sphere, top half)
 */
function generateDome(cx: number, cy: number, cz: number, radius: number, block: string, hollow: boolean = false): string[] {
  const commands: string[] = [];
  const r = Math.floor(radius);
  const r2 = r * r;
  
  // Only build top half (y >= 0)
  for (let dy = 0; dy <= r; dy++) {
    const sliceR2 = r2 - dy * dy;
    if (sliceR2 < 0) continue;
    const sliceR = Math.floor(Math.sqrt(sliceR2));
    
    if (sliceR === 0) {
      commands.push(`fill ${cx} ${cy + dy} ${cz} ${cx} ${cy + dy} ${cz} ${block}`);
      continue;
    }
    
    if (hollow && dy > 0) {
      // Hollow dome - only outer shell
      const innerR2 = (r - 1) * (r - 1) - dy * dy;
      const innerSliceR = innerR2 > 0 ? Math.floor(Math.sqrt(innerR2)) : 0;
      
      if (innerSliceR < sliceR - 1) {
        // Ring pattern
        const y = cy + dy;
        commands.push(`fill ${cx - sliceR} ${y} ${cz - sliceR} ${cx + sliceR} ${y} ${cz - innerSliceR - 1} ${block}`);
        commands.push(`fill ${cx - sliceR} ${y} ${cz + innerSliceR + 1} ${cx + sliceR} ${y} ${cz + sliceR} ${block}`);
        if (innerSliceR > 0) {
          commands.push(`fill ${cx - sliceR} ${y} ${cz - innerSliceR} ${cx - innerSliceR - 1} ${y} ${cz + innerSliceR} ${block}`);
          commands.push(`fill ${cx + innerSliceR + 1} ${y} ${cz - innerSliceR} ${cx + sliceR} ${y} ${cz + innerSliceR} ${block}`);
        }
      } else {
        commands.push(`fill ${cx - sliceR} ${cy + dy} ${cz - sliceR} ${cx + sliceR} ${cy + dy} ${cz + sliceR} ${block}`);
      }
    } else {
      // Solid or base of hollow dome
      commands.push(`fill ${cx - sliceR} ${cy + dy} ${cz - sliceR} ${cx + sliceR} ${cy + dy} ${cz + sliceR} ${block}`);
    }
  }
  
  return commands;
}

/**
 * Generate fill commands for a cylinder
 */
function generateCylinder(cx: number, cy: number, cz: number, radius: number, height: number, block: string, hollow: boolean = false): string[] {
  const commands: string[] = [];
  const r = Math.floor(radius);
  
  if (hollow) {
    // Hollow cylinder - walls only
    // Build as 4 walls forming a square approximation, or use outline
    for (let dy = 0; dy < height; dy++) {
      const y = cy + dy;
      // North and south walls
      commands.push(`fill ${cx - r} ${y} ${cz - r} ${cx + r} ${y} ${cz - r + 1} ${block}`);
      commands.push(`fill ${cx - r} ${y} ${cz + r - 1} ${cx + r} ${y} ${cz + r} ${block}`);
      // East and west walls
      commands.push(`fill ${cx - r} ${y} ${cz - r + 2} ${cx - r + 1} ${y} ${cz + r - 2} ${block}`);
      commands.push(`fill ${cx + r - 1} ${y} ${cz - r + 2} ${cx + r} ${y} ${cz + r - 2} ${block}`);
    }
  } else {
    // Solid cylinder - stack of filled circles
    for (let dy = 0; dy < height; dy++) {
      commands.push(`fill ${cx - r} ${cy + dy} ${cz - r} ${cx + r} ${cy + dy} ${cz + r} ${block}`);
    }
  }
  
  return commands;
}

/**
 * Generate fill commands for a pyramid
 */
function generatePyramid(cx: number, cy: number, cz: number, baseSize: number, height: number, block: string, hollow: boolean = false): string[] {
  const commands: string[] = [];
  const halfBase = Math.floor(baseSize / 2);
  
  for (let dy = 0; dy < height; dy++) {
    // Calculate size at this level (linear interpolation)
    const progress = dy / height;
    const levelHalf = Math.floor(halfBase * (1 - progress));
    
    if (levelHalf <= 0) {
      // Top point
      commands.push(`fill ${cx} ${cy + dy} ${cz} ${cx} ${cy + dy} ${cz} ${block}`);
      break;
    }
    
    if (hollow && dy > 0 && dy < height - 1) {
      // Only outline for hollow pyramid
      const y = cy + dy;
      // Just the edges
      commands.push(`fill ${cx - levelHalf} ${y} ${cz - levelHalf} ${cx + levelHalf} ${y} ${cz - levelHalf} ${block}`);
      commands.push(`fill ${cx - levelHalf} ${y} ${cz + levelHalf} ${cx + levelHalf} ${y} ${cz + levelHalf} ${block}`);
      commands.push(`fill ${cx - levelHalf} ${y} ${cz - levelHalf + 1} ${cx - levelHalf} ${y} ${cz + levelHalf - 1} ${block}`);
      commands.push(`fill ${cx + levelHalf} ${y} ${cz - levelHalf + 1} ${cx + levelHalf} ${y} ${cz + levelHalf - 1} ${block}`);
    } else {
      // Solid layer
      commands.push(`fill ${cx - levelHalf} ${cy + dy} ${cz - levelHalf} ${cx + levelHalf} ${cy + dy} ${cz + levelHalf} ${block}`);
    }
  }
  
  return commands;
}

/**
 * Generate fill commands for a cone
 */
function generateCone(cx: number, cy: number, cz: number, radius: number, height: number, block: string): string[] {
  const commands: string[] = [];
  
  for (let dy = 0; dy < height; dy++) {
    const progress = dy / height;
    const levelR = Math.floor(radius * (1 - progress));
    
    if (levelR <= 0) {
      commands.push(`fill ${cx} ${cy + dy} ${cz} ${cx} ${cy + dy} ${cz} ${block}`);
      break;
    }
    
    commands.push(`fill ${cx - levelR} ${cy + dy} ${cz - levelR} ${cx + levelR} ${cy + dy} ${cz + levelR} ${block}`);
  }
  
  return commands;
}

/**
 * Generate fill commands for an arch
 */
function generateArch(cx: number, cy: number, cz: number, width: number, height: number, depth: number, block: string): string[] {
  const commands: string[] = [];
  const halfWidth = Math.floor(width / 2);
  
  // Build arch as a series of layers
  // Bottom pillars
  const pillarHeight = Math.floor(height * 0.6);
  commands.push(`fill ${cx - halfWidth} ${cy} ${cz} ${cx - halfWidth + 2} ${cy + pillarHeight} ${cz + depth - 1} ${block}`);
  commands.push(`fill ${cx + halfWidth - 2} ${cy} ${cz} ${cx + halfWidth} ${cy + pillarHeight} ${cz + depth - 1} ${block}`);
  
  // Curved top (approximated with rectangles)
  const archHeight = height - pillarHeight;
  for (let dy = 0; dy < archHeight; dy++) {
    const progress = dy / archHeight;
    // Parabolic curve approximation
    const gapHalf = Math.floor(halfWidth * (1 - progress * progress) * 0.7);
    const y = cy + pillarHeight + dy;
    
    if (gapHalf > 1) {
      // Two sides of the arch
      commands.push(`fill ${cx - halfWidth} ${y} ${cz} ${cx - gapHalf} ${y} ${cz + depth - 1} ${block}`);
      commands.push(`fill ${cx + gapHalf} ${y} ${cz} ${cx + halfWidth} ${y} ${cz + depth - 1} ${block}`);
    } else {
      // Top of arch - full span
      commands.push(`fill ${cx - halfWidth} ${y} ${cz} ${cx + halfWidth} ${y} ${cz + depth - 1} ${block}`);
    }
  }
  
  return commands;
}

/**
 * Generate fill commands for a box/building
 */
function generateBox(cx: number, cy: number, cz: number, width: number, height: number, depth: number, block: string, hollow: boolean = true): string[] {
  const commands: string[] = [];
  const hw = Math.floor(width / 2);
  const hd = Math.floor(depth / 2);
  
  const x1 = cx - hw;
  const x2 = cx + hw;
  const z1 = cz - hd;
  const z2 = cz + hd;
  const y1 = cy;
  const y2 = cy + height - 1;
  
  if (hollow) {
    commands.push(`fill ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${block} hollow`);
  } else {
    commands.push(`fill ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${block}`);
  }
  
  return commands;
}

/**
 * Generate fill commands for stairs
 */
function generateStairs(cx: number, cy: number, cz: number, direction: string, width: number, height: number, block: string): string[] {
  const commands: string[] = [];
  const hw = Math.floor(width / 2);
  
  for (let i = 0; i < height; i++) {
    const y = cy + i;
    let x1, x2, z1, z2;
    
    switch (direction.toLowerCase()) {
      case 'north':
        x1 = cx - hw; x2 = cx + hw;
        z1 = cz - i; z2 = cz - i;
        break;
      case 'south':
        x1 = cx - hw; x2 = cx + hw;
        z1 = cz + i; z2 = cz + i;
        break;
      case 'east':
        x1 = cx + i; x2 = cx + i;
        z1 = cz - hw; z2 = cz + hw;
        break;
      case 'west':
      default:
        x1 = cx - i; x2 = cx - i;
        z1 = cz - hw; z2 = cz + hw;
        break;
    }
    
    commands.push(`fill ${x1} ${y} ${z1} ${x2} ${y} ${z2} ${block}`);
  }
  
  return commands;
}

/**
 * Generate fill commands for a flat ring
 */
function generateRing(cx: number, cy: number, cz: number, innerRadius: number, outerRadius: number, block: string): string[] {
  const commands: string[] = [];
  const ir = Math.floor(innerRadius);
  const or = Math.floor(outerRadius);
  
  // Fill outer circle, then hollow out inner
  commands.push(`fill ${cx - or} ${cy} ${cz - or} ${cx + or} ${cy} ${cz + or} ${block}`);
  if (ir > 0) {
    commands.push(`fill ${cx - ir} ${cy} ${cz - ir} ${cx + ir} ${cy} ${cz + ir} air`);
  }
  
  return commands;
}

/**
 * Generate fill commands for a floor/platform
 */
function generateFloor(x1: number, z1: number, x2: number, z2: number, y: number, block: string): string[] {
  return [`fill ${x1} ${y} ${z1} ${x2} ${y} ${z2} ${block}`];
}

/**
 * Generate fill commands for a wall
 */
function generateWall(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, block: string): string[] {
  return [`fill ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${block}`];
}

/**
 * Convert a shape command to fill commands
 */
export function shapeToFillCommands(shapeCmd: ShapeCommand): string[] {
  const { shape, params } = shapeCmd;
  
  switch (shape) {
    case 'sphere':
      return generateSphere(
        params[0] as number, params[1] as number, params[2] as number,
        params[3] as number, params[4] as string, false
      );
    
    case 'hollowsphere':
      return generateSphere(
        params[0] as number, params[1] as number, params[2] as number,
        params[3] as number, params[4] as string, true
      );
    
    case 'dome':
      return generateDome(
        params[0] as number, params[1] as number, params[2] as number,
        params[3] as number, params[4] as string, false
      );
    
    case 'hollowdome':
      return generateDome(
        params[0] as number, params[1] as number, params[2] as number,
        params[3] as number, params[4] as string, true
      );
    
    case 'cylinder':
      return generateCylinder(
        params[0] as number, params[1] as number, params[2] as number,
        params[3] as number, params[4] as number, params[5] as string, false
      );
    
    case 'hollowcylinder':
    case 'tube':
      return generateCylinder(
        params[0] as number, params[1] as number, params[2] as number,
        params[3] as number, params[4] as number, params[5] as string, true
      );
    
    case 'pyramid':
      return generatePyramid(
        params[0] as number, params[1] as number, params[2] as number,
        params[3] as number, params[4] as number, params[5] as string, false
      );
    
    case 'hollowpyramid':
      return generatePyramid(
        params[0] as number, params[1] as number, params[2] as number,
        params[3] as number, params[4] as number, params[5] as string, true
      );
    
    case 'cone':
      return generateCone(
        params[0] as number, params[1] as number, params[2] as number,
        params[3] as number, params[4] as number, params[5] as string
      );
    
    case 'arch':
      return generateArch(
        params[0] as number, params[1] as number, params[2] as number,
        params[3] as number, params[4] as number, params[5] as number, params[6] as string
      );
    
    case 'box':
    case 'building':
      return generateBox(
        params[0] as number, params[1] as number, params[2] as number,
        params[3] as number, params[4] as number, params[5] as number,
        params[6] as string, params[7] !== false
      );
    
    case 'stairs':
    case 'staircase':
      return generateStairs(
        params[0] as number, params[1] as number, params[2] as number,
        params[3] as string, params[4] as number, params[5] as number, params[6] as string
      );
    
    case 'ring':
    case 'donut':
      return generateRing(
        params[0] as number, params[1] as number, params[2] as number,
        params[3] as number, params[4] as number, params[5] as string
      );
    
    case 'floor':
    case 'platform':
      return generateFloor(
        params[0] as number, params[1] as number, params[2] as number,
        params[3] as number, params[4] as number, params[5] as string
      );
    
    case 'wall':
    case 'fill':
      return generateWall(
        params[0] as number, params[1] as number, params[2] as number,
        params[3] as number, params[4] as number, params[5] as number, params[6] as string
      );
    
    default:
      console.warn(`Unknown shape: ${shape}`);
      return [];
  }
}

/**
 * Custom voxel definition type
 */
interface CustomVoxelDef {
  palette: Record<string, string>;
  layers: string[][];
}

/**
 * Process an array of build commands - handles shapes, components, images, voxels, custom voxels, and raw commands
 * 
 * @param commands - Array of build command strings
 * @param customVoxels - Optional map of custom voxel definitions from AI
 */
export function processBuildCommands(
  commands: string[], 
  customVoxels?: Record<string, CustomVoxelDef>
): string[] {
  const result: string[] = [];
  
  for (const cmd of commands) {
    const trimmed = cmd.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;
    
    // Check if it's a shape command (sphere, dome, pyramid, etc.)
    const shapeCmd = parseShapeCommand(trimmed);
    if (shapeCmd) {
      const shapeName = shapeCmd.shape.toLowerCase().replace(/[_-]/g, '');
      
      // 1. Check if it's a CUSTOM VOXEL defined by the AI
      if (customVoxels && customVoxels[shapeCmd.shape]) {
        const customDef = customVoxels[shapeCmd.shape];
        const x = shapeCmd.params[0] as number;
        const y = shapeCmd.params[1] as number;
        const z = shapeCmd.params[2] as number;
        const scale = (shapeCmd.params[3] as number) || 1;
        
        console.log(`Building custom voxel: ${shapeCmd.shape} at (${x}, ${y}, ${z}) scale ${scale}`);
        const customCmds = voxelToCommands(customDef, x, y, z, scale);
        result.push(...customCmds);
        continue;
      }
      
      // Also check with underscore variants
      const underscoreName = shapeCmd.shape.replace(/-/g, '_');
      if (customVoxels && customVoxels[underscoreName]) {
        const customDef = customVoxels[underscoreName];
        const x = shapeCmd.params[0] as number;
        const y = shapeCmd.params[1] as number;
        const z = shapeCmd.params[2] as number;
        const scale = (shapeCmd.params[3] as number) || 1;
        
        console.log(`Building custom voxel: ${underscoreName} at (${x}, ${y}, ${z}) scale ${scale}`);
        const customCmds = voxelToCommands(customDef, x, y, z, scale);
        result.push(...customCmds);
        continue;
      }
      
      // 2. Check if it's a pre-built voxel object (tower, ship, etc.)
      if (VOXEL_OBJECTS[shapeName]) {
        const x = shapeCmd.params[0] as number;
        const y = shapeCmd.params[1] as number;
        const z = shapeCmd.params[2] as number;
        const scale = (shapeCmd.params[3] as number) || 1;
        
        const voxelCmds = processVoxelObjectCommand(shapeName, x, y, z, scale);
        result.push(...voxelCmds);
        continue;
      }
      
      // 3. Check if it's a component command
      if (shapeCmd.shape === 'component' || getComponent(shapeCmd.shape)) {
        const name = shapeCmd.shape === 'component' ? shapeCmd.params[0] as string : shapeCmd.shape;
        const x = shapeCmd.shape === 'component' ? shapeCmd.params[1] as number : shapeCmd.params[0] as number;
        const y = shapeCmd.shape === 'component' ? shapeCmd.params[2] as number : shapeCmd.params[1] as number;
        const z = shapeCmd.shape === 'component' ? shapeCmd.params[3] as number : shapeCmd.params[2] as number;
        const variant = shapeCmd.params[shapeCmd.shape === 'component' ? 4 : 3] as string | undefined;
        const scale = (shapeCmd.params[shapeCmd.shape === 'component' ? 5 : 4] as number) || 1;
        
        const componentCmds = processComponentCommand(name, x, y, z, variant, scale);
        result.push(...componentCmds);
        continue;
      }
      
      // 4. Check if it's an image/pixelart command
      if (shapeCmd.shape === 'image' || shapeCmd.shape === 'pixelart' || PIXEL_ART_LIBRARY[shapeName]) {
        const name = (shapeCmd.shape === 'image' || shapeCmd.shape === 'pixelart') 
          ? shapeCmd.params[0] as string 
          : shapeCmd.shape;
        const idx = (shapeCmd.shape === 'image' || shapeCmd.shape === 'pixelart') ? 1 : 0;
        const x = shapeCmd.params[idx] as number;
        const y = shapeCmd.params[idx + 1] as number;
        const z = shapeCmd.params[idx + 2] as number;
        const scale = (shapeCmd.params[idx + 3] as number) || 2;
        const depth = (shapeCmd.params[idx + 4] as number) || 1;
        const facing = (shapeCmd.params[idx + 5] as 'north' | 'south' | 'east' | 'west') || 'south';
        
        const imageCmds = processImageCommand(name, x, y, z, scale, depth, facing);
        result.push(...imageCmds);
        continue;
      }
      
      // 5. Standard geometric shape command
      const fillCommands = shapeToFillCommands(shapeCmd);
      result.push(...fillCommands);
    } else if (trimmed.startsWith('fill ') || trimmed.startsWith('setblock ') || trimmed.startsWith('forceload ')) {
      // Raw Minecraft command - pass through
      result.push(trimmed);
    }
  }
  
  return result;
}

