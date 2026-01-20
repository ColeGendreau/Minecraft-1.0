/**
 * Image-to-Voxel Pipeline
 * 
 * Converts images (logos, pixel art, photos) into Minecraft builds.
 * 
 * Features:
 * - Color quantization to Minecraft block palette
 * - 2D wall builds (flat pixel art)
 * - 3D extruded builds (pixel art with depth)
 * - Support for transparency
 * - URL image fetching and processing
 */

import sharp from 'sharp';

// Minecraft block colors - mapped to RGB values
// These are the most commonly used colored blocks
const MINECRAFT_PALETTE: { block: string; rgb: [number, number, number] }[] = [
  // Concrete (most vibrant colors)
  { block: 'white_concrete', rgb: [207, 213, 214] },
  { block: 'orange_concrete', rgb: [224, 97, 1] },
  { block: 'magenta_concrete', rgb: [169, 48, 159] },
  { block: 'light_blue_concrete', rgb: [36, 137, 199] },
  { block: 'yellow_concrete', rgb: [241, 175, 21] },
  { block: 'lime_concrete', rgb: [94, 169, 24] },
  { block: 'pink_concrete', rgb: [214, 101, 143] },
  { block: 'gray_concrete', rgb: [55, 58, 62] },
  { block: 'light_gray_concrete', rgb: [125, 125, 115] },
  { block: 'cyan_concrete', rgb: [21, 119, 136] },
  { block: 'purple_concrete', rgb: [100, 32, 156] },
  { block: 'blue_concrete', rgb: [45, 47, 143] },
  { block: 'brown_concrete', rgb: [96, 60, 32] },
  { block: 'green_concrete', rgb: [73, 91, 36] },
  { block: 'red_concrete', rgb: [142, 33, 33] },
  { block: 'black_concrete', rgb: [8, 10, 15] },
  
  // Wool (softer colors)
  { block: 'white_wool', rgb: [234, 236, 237] },
  { block: 'orange_wool', rgb: [241, 118, 20] },
  { block: 'magenta_wool', rgb: [189, 68, 179] },
  { block: 'light_blue_wool', rgb: [58, 175, 217] },
  { block: 'yellow_wool', rgb: [249, 198, 40] },
  { block: 'lime_wool', rgb: [112, 185, 26] },
  { block: 'pink_wool', rgb: [238, 141, 172] },
  { block: 'cyan_wool', rgb: [21, 138, 145] },
  { block: 'purple_wool', rgb: [122, 42, 173] },
  { block: 'blue_wool', rgb: [53, 57, 157] },
  { block: 'brown_wool', rgb: [114, 72, 41] },
  { block: 'green_wool', rgb: [85, 110, 28] },
  { block: 'red_wool', rgb: [161, 39, 35] },
  { block: 'black_wool', rgb: [21, 21, 26] },
  
  // Terracotta (earthy tones)
  { block: 'white_terracotta', rgb: [210, 178, 161] },
  { block: 'orange_terracotta', rgb: [162, 84, 38] },
  { block: 'yellow_terracotta', rgb: [186, 133, 35] },
  { block: 'brown_terracotta', rgb: [77, 51, 36] },
  { block: 'red_terracotta', rgb: [143, 61, 47] },
  { block: 'black_terracotta', rgb: [37, 23, 16] },
  
  // Special blocks
  { block: 'gold_block', rgb: [246, 208, 62] },
  { block: 'iron_block', rgb: [220, 220, 220] },
  { block: 'diamond_block', rgb: [98, 219, 214] },
  { block: 'emerald_block', rgb: [42, 176, 66] },
  { block: 'lapis_block', rgb: [31, 67, 140] },
  { block: 'redstone_block', rgb: [170, 26, 6] },
  { block: 'coal_block', rgb: [16, 16, 16] },
  { block: 'netherite_block', rgb: [66, 61, 63] },
  { block: 'copper_block', rgb: [192, 107, 79] },
  
  // Natural blocks
  { block: 'oak_planks', rgb: [162, 130, 78] },
  { block: 'spruce_planks', rgb: [115, 85, 49] },
  { block: 'birch_planks', rgb: [196, 179, 123] },
  { block: 'dark_oak_planks', rgb: [67, 43, 20] },
  { block: 'stone', rgb: [126, 126, 126] },
  { block: 'cobblestone', rgb: [128, 128, 128] },
  { block: 'stone_bricks', rgb: [122, 122, 122] },
  { block: 'bricks', rgb: [150, 97, 83] },
  { block: 'sandstone', rgb: [223, 214, 170] },
  { block: 'quartz_block', rgb: [235, 229, 222] },
  { block: 'prismarine', rgb: [99, 156, 151] },
  { block: 'sea_lantern', rgb: [172, 199, 190] },
  { block: 'glowstone', rgb: [171, 131, 84] },
  { block: 'obsidian', rgb: [15, 11, 25] },
  
  // Glass (for transparency effects)
  { block: 'glass', rgb: [200, 220, 230] },
  { block: 'white_stained_glass', rgb: [255, 255, 255] },
  { block: 'light_blue_stained_glass', rgb: [102, 153, 216] },
];

/**
 * Calculate color distance (Euclidean in RGB space)
 */
function colorDistance(c1: [number, number, number], c2: [number, number, number]): number {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
    Math.pow(c1[1] - c2[1], 2) +
    Math.pow(c1[2] - c2[2], 2)
  );
}

/**
 * Find the closest Minecraft block to a given RGB color
 */
export function findClosestBlock(r: number, g: number, b: number): string {
  let closest = MINECRAFT_PALETTE[0];
  let minDistance = Infinity;
  
  for (const entry of MINECRAFT_PALETTE) {
    const distance = colorDistance([r, g, b], entry.rgb);
    if (distance < minDistance) {
      minDistance = distance;
      closest = entry;
    }
  }
  
  return closest.block;
}

/**
 * Represents a voxel grid (3D array of blocks)
 */
export interface VoxelGrid {
  width: number;
  height: number;
  depth: number;
  blocks: (string | null)[][][]; // null = air
}

/**
 * Convert a pixel grid to Minecraft fill commands
 * Builds a 2D wall at the specified position
 * 
 * @param pixels - 2D array of {r, g, b, a} values
 * @param x - X position of bottom-left corner
 * @param y - Y position of bottom-left corner  
 * @param z - Z position (flat wall)
 * @param scale - How many blocks per pixel (1 = 1:1, 2 = 2x2 per pixel)
 * @param facing - 'north', 'south', 'east', 'west' - which way the wall faces
 */
export function pixelsToWallCommands(
  pixels: { r: number; g: number; b: number; a: number }[][],
  x: number,
  y: number,
  z: number,
  scale: number = 1,
  facing: 'north' | 'south' | 'east' | 'west' = 'south'
): string[] {
  const commands: string[] = [];
  const height = pixels.length;
  const width = pixels[0]?.length || 0;
  
  // Group adjacent same-color pixels for efficiency
  // For now, simple approach: one command per pixel (row optimization later)
  
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const pixel = pixels[height - 1 - py][px]; // Flip Y (images are top-down)
      
      // Skip transparent pixels
      if (pixel.a < 128) continue;
      
      const block = findClosestBlock(pixel.r, pixel.g, pixel.b);
      
      // Calculate world position based on facing
      let x1, y1, z1, x2, y2, z2;
      
      if (facing === 'south' || facing === 'north') {
        x1 = x + px * scale;
        x2 = x + (px + 1) * scale - 1;
        y1 = y + py * scale;
        y2 = y + (py + 1) * scale - 1;
        z1 = z;
        z2 = z;
      } else {
        z1 = z + px * scale;
        z2 = z + (px + 1) * scale - 1;
        y1 = y + py * scale;
        y2 = y + (py + 1) * scale - 1;
        x1 = x;
        x2 = x;
      }
      
      if (scale === 1) {
        commands.push(`setblock ${x1} ${y1} ${z1} ${block}`);
      } else {
        commands.push(`fill ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${block}`);
      }
    }
  }
  
  return commands;
}

/**
 * Calculate pixel brightness (0-1)
 */
function getBrightness(pixel: { r: number; g: number; b: number }): number {
  return (pixel.r * 0.299 + pixel.g * 0.587 + pixel.b * 0.114) / 255;
}

/**
 * Convert a pixel grid to an extruded 3D build
 * Each pixel becomes a column of blocks with specified depth
 */
export function pixelsToExtrudedCommands(
  pixels: { r: number; g: number; b: number; a: number }[][],
  x: number,
  y: number,
  z: number,
  scale: number = 1,
  depth: number = 5,
  facing: 'north' | 'south' | 'east' | 'west' = 'south'
): string[] {
  const commands: string[] = [];
  const height = pixels.length;
  const width = pixels[0]?.length || 0;
  
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const pixel = pixels[height - 1 - py][px];
      
      if (pixel.a < 128) continue;
      
      const block = findClosestBlock(pixel.r, pixel.g, pixel.b);
      
      let x1, y1, z1, x2, y2, z2;
      
      if (facing === 'south') {
        x1 = x + px * scale;
        x2 = x + (px + 1) * scale - 1;
        y1 = y + py * scale;
        y2 = y + (py + 1) * scale - 1;
        z1 = z;
        z2 = z + depth - 1;
      } else if (facing === 'north') {
        x1 = x + px * scale;
        x2 = x + (px + 1) * scale - 1;
        y1 = y + py * scale;
        y2 = y + (py + 1) * scale - 1;
        z1 = z - depth + 1;
        z2 = z;
      } else if (facing === 'east') {
        x1 = x;
        x2 = x + depth - 1;
        y1 = y + py * scale;
        y2 = y + (py + 1) * scale - 1;
        z1 = z + px * scale;
        z2 = z + (px + 1) * scale - 1;
      } else {
        x1 = x - depth + 1;
        x2 = x;
        y1 = y + py * scale;
        y2 = y + (py + 1) * scale - 1;
        z1 = z + px * scale;
        z2 = z + (px + 1) * scale - 1;
      }
      
      commands.push(`fill ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${block}`);
    }
  }
  
  return commands;
}

/**
 * Convert a pixel grid to a 3D relief sculpture
 * Brightness determines depth - lighter colors protrude more
 * Creates a carved/embossed effect like a stone relief
 */
export function pixelsTo3DRelief(
  pixels: { r: number; g: number; b: number; a: number }[][],
  x: number,
  y: number,
  z: number,
  scale: number = 1,
  maxDepth: number = 10,
  facing: 'north' | 'south' | 'east' | 'west' = 'south',
  invertDepth: boolean = false // If true, darker = more depth (carved look)
): string[] {
  const commands: string[] = [];
  const height = pixels.length;
  const width = pixels[0]?.length || 0;
  
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const pixel = pixels[height - 1 - py][px];
      
      if (pixel.a < 128) continue;
      
      const block = findClosestBlock(pixel.r, pixel.g, pixel.b);
      const brightness = getBrightness(pixel);
      
      // Calculate depth based on brightness
      let pixelDepth = Math.round(brightness * maxDepth);
      if (invertDepth) {
        pixelDepth = maxDepth - pixelDepth;
      }
      pixelDepth = Math.max(1, pixelDepth); // At least 1 block deep
      
      let x1, y1, z1, x2, y2, z2;
      
      if (facing === 'south') {
        x1 = x + px * scale;
        x2 = x + (px + 1) * scale - 1;
        y1 = y + py * scale;
        y2 = y + (py + 1) * scale - 1;
        z1 = z;
        z2 = z + pixelDepth - 1;
      } else if (facing === 'north') {
        x1 = x + px * scale;
        x2 = x + (px + 1) * scale - 1;
        y1 = y + py * scale;
        y2 = y + (py + 1) * scale - 1;
        z1 = z - pixelDepth + 1;
        z2 = z;
      } else if (facing === 'east') {
        x1 = x;
        x2 = x + pixelDepth - 1;
        y1 = y + py * scale;
        y2 = y + (py + 1) * scale - 1;
        z1 = z + px * scale;
        z2 = z + (px + 1) * scale - 1;
      } else {
        x1 = x - pixelDepth + 1;
        x2 = x;
        y1 = y + py * scale;
        y2 = y + (py + 1) * scale - 1;
        z1 = z + px * scale;
        z2 = z + (px + 1) * scale - 1;
      }
      
      commands.push(`fill ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${block}`);
    }
  }
  
  return commands;
}

/**
 * Build a 3D statue from front and side silhouettes
 * Takes two images: front view and side view
 * Carves a 3D shape by intersecting the two projections
 */
export async function buildStatueFromSilhouettes(
  frontImageUrl: string,
  sideImageUrl: string,
  centerX: number,
  baseY: number,
  centerZ: number,
  maxSize: number = 64,
  block: string = 'stone'
): Promise<string[]> {
  // Fetch both images
  const frontImage = await fetchImagePixels(frontImageUrl, maxSize, maxSize);
  const sideImage = await fetchImagePixels(sideImageUrl, maxSize, maxSize);
  
  const commands: string[] = [];
  const height = Math.min(frontImage.height, sideImage.height);
  const widthX = frontImage.width;
  const widthZ = sideImage.width;
  
  // Calculate starting position (centered)
  const startX = centerX - Math.floor(widthX / 2);
  const startZ = centerZ - Math.floor(widthZ / 2);
  
  // For each potential voxel position, check if it's "inside" both silhouettes
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < widthX; x++) {
      for (let z = 0; z < widthZ; z++) {
        // Get pixel from front view (looking at Z axis, seeing X and Y)
        const frontPixel = frontImage.pixels[height - 1 - y]?.[x];
        // Get pixel from side view (looking at X axis, seeing Z and Y)
        const sidePixel = sideImage.pixels[height - 1 - y]?.[z];
        
        // Both pixels must be non-transparent for a voxel to exist
        if (frontPixel && sidePixel && frontPixel.a >= 128 && sidePixel.a >= 128) {
          // Use front image color for the block
          const voxelBlock = findClosestBlock(frontPixel.r, frontPixel.g, frontPixel.b);
          commands.push(`setblock ${startX + x} ${baseY + y} ${startZ + z} ${voxelBlock}`);
        }
      }
    }
  }
  
  return commands;
}

/**
 * Optimize commands by merging adjacent same-block fills
 * This dramatically reduces command count for large images
 */
export function optimizeCommands(commands: string[]): string[] {
  // Group by Y level and block type, then merge horizontal runs
  // For now, return as-is (optimization can be added later)
  return commands;
}

/**
 * Parse image data URL or fetch from URL
 * Returns a 2D pixel array
 * 
 * Note: This is a placeholder - actual implementation needs
 * either canvas (browser) or sharp/jimp (node) for image processing
 */
export interface ImageData {
  width: number;
  height: number;
  pixels: { r: number; g: number; b: number; a: number }[][];
}

/**
 * Create a simple test pattern (checkerboard)
 */
export function createTestPattern(width: number, height: number): ImageData {
  const pixels: { r: number; g: number; b: number; a: number }[][] = [];
  
  for (let y = 0; y < height; y++) {
    const row: { r: number; g: number; b: number; a: number }[] = [];
    for (let x = 0; x < width; x++) {
      const isWhite = (x + y) % 2 === 0;
      row.push({
        r: isWhite ? 255 : 0,
        g: isWhite ? 255 : 0,
        b: isWhite ? 255 : 0,
        a: 255
      });
    }
    pixels.push(row);
  }
  
  return { width, height, pixels };
}

/**
 * Create a gradient pattern for testing
 */
export function createGradientPattern(width: number, height: number): ImageData {
  const pixels: { r: number; g: number; b: number; a: number }[][] = [];
  
  for (let y = 0; y < height; y++) {
    const row: { r: number; g: number; b: number; a: number }[] = [];
    for (let x = 0; x < width; x++) {
      row.push({
        r: Math.floor((x / width) * 255),
        g: Math.floor((y / height) * 255),
        b: 128,
        a: 255
      });
    }
    pixels.push(row);
  }
  
  return { width, height, pixels };
}

/**
 * Hardcoded pixel art patterns for common requests
 * These are hand-crafted detailed builds
 */
export const PIXEL_ART_LIBRARY: Record<string, ImageData> = {
  // Simple heart shape (16x14)
  heart: (() => {
    const pattern = [
      '  RR  RR  ',
      ' RRRRRRRR ',
      'RRRRRRRRRR',
      'RRRRRRRRRR',
      'RRRRRRRRRR',
      ' RRRRRRRR ',
      '  RRRRRR  ',
      '   RRRR   ',
      '    RR    ',
    ];
    const colorMap: Record<string, [number, number, number]> = {
      'R': [255, 0, 0],
      ' ': [0, 0, 0], // transparent
    };
    return patternToImageData(pattern, colorMap);
  })(),
  
  // Star shape
  star: (() => {
    const pattern = [
      '    YY    ',
      '    YY    ',
      '   YYYY   ',
      'YYYYYYYYYY',
      ' YYYYYYYY ',
      '  YYYYYY  ',
      '  YY  YY  ',
      ' YY    YY ',
    ];
    const colorMap: Record<string, [number, number, number]> = {
      'Y': [255, 215, 0],
      ' ': [0, 0, 0],
    };
    return patternToImageData(pattern, colorMap);
  })(),
  
  // Smiley face
  smiley: (() => {
    const pattern = [
      '  YYYY  ',
      ' YYYYYY ',
      'YYBYYBYY',
      'YYYYYYYY',
      'YYYYYYYY',
      'YBYYBYYY',
      ' YBBBYY ',
      '  YYYY  ',
    ];
    const colorMap: Record<string, [number, number, number]> = {
      'Y': [255, 215, 0],
      'B': [0, 0, 0],
      ' ': [0, 0, 0],
    };
    return patternToImageData(pattern, colorMap, true);
  })(),
};

/**
 * Convert a text pattern to ImageData
 */
function patternToImageData(
  pattern: string[],
  colorMap: Record<string, [number, number, number]>,
  transparentSpace: boolean = true
): ImageData {
  const height = pattern.length;
  const width = Math.max(...pattern.map(row => row.length));
  const pixels: { r: number; g: number; b: number; a: number }[][] = [];
  
  for (let y = 0; y < height; y++) {
    const row: { r: number; g: number; b: number; a: number }[] = [];
    for (let x = 0; x < width; x++) {
      const char = pattern[y][x] || ' ';
      const color = colorMap[char] || [0, 0, 0];
      const isTransparent = transparentSpace && char === ' ';
      
      row.push({
        r: color[0],
        g: color[1],
        b: color[2],
        a: isTransparent ? 0 : 255
      });
    }
    pixels.push(row);
  }
  
  return { width, height, pixels };
}

/**
 * Process an image build command
 * Format: image(name_or_url, x, y, z, scale, depth, facing)
 */
export function processImageCommand(
  name: string,
  x: number,
  y: number,
  z: number,
  scale: number = 2,
  depth: number = 1,
  facing: 'north' | 'south' | 'east' | 'west' = 'south'
): string[] {
  // Check if it's a built-in pattern
  const imageData = PIXEL_ART_LIBRARY[name.toLowerCase()];
  
  if (!imageData) {
    console.warn(`Unknown image pattern: ${name}`);
    return [];
  }
  
  if (depth <= 1) {
    return pixelsToWallCommands(imageData.pixels, x, y, z, scale, facing);
  } else {
    return pixelsToExtrudedCommands(imageData.pixels, x, y, z, scale, depth, facing);
  }
}

// ============================================================
// IMAGE URL PROCESSING
// ============================================================

export interface ImageBuildOptions {
  url: string;
  x?: number;
  y?: number;
  z?: number;
  maxWidth?: number;      // Max width in blocks (pixels will be scaled)
  maxHeight?: number;     // Max height in blocks
  scale?: number;         // Blocks per pixel (1, 2, 3, etc.)
  depth?: number;         // Extrusion depth (1 = flat wall)
  facing?: 'north' | 'south' | 'east' | 'west';
}

/**
 * Fetch an image from a URL and convert to pixel array
 */
export async function fetchImagePixels(
  url: string,
  maxWidth: number = 128,
  maxHeight: number = 128
): Promise<{ pixels: { r: number; g: number; b: number; a: number }[][]; width: number; height: number }> {
  // Fetch the image
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  
  const imageBuffer = Buffer.from(await response.arrayBuffer());
  
  // Process with sharp
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image dimensions');
  }
  
  // Calculate scaled dimensions while maintaining aspect ratio
  let targetWidth = metadata.width;
  let targetHeight = metadata.height;
  
  if (targetWidth > maxWidth) {
    const ratio = maxWidth / targetWidth;
    targetWidth = maxWidth;
    targetHeight = Math.round(targetHeight * ratio);
  }
  
  if (targetHeight > maxHeight) {
    const ratio = maxHeight / targetHeight;
    targetHeight = maxHeight;
    targetWidth = Math.round(targetWidth * ratio);
  }
  
  // Resize and get raw pixel data
  const { data, info } = await image
    .resize(targetWidth, targetHeight, { fit: 'inside' })
    .ensureAlpha() // Ensure we have RGBA
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  // Convert to pixel array
  const pixels: { r: number; g: number; b: number; a: number }[][] = [];
  
  for (let y = 0; y < info.height; y++) {
    const row: { r: number; g: number; b: number; a: number }[] = [];
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * 4;
      row.push({
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: data[idx + 3]
      });
    }
    pixels.push(row);
  }
  
  return { pixels, width: info.width, height: info.height };
}

/**
 * Build an image from URL in Minecraft
 * Returns the fill commands to execute
 */
export async function buildImageFromUrl(options: ImageBuildOptions): Promise<{
  commands: string[];
  width: number;
  height: number;
  blockCount: number;
}> {
  const {
    url,
    x = 0,
    y = 65,
    z = 0,
    maxWidth = 100,
    maxHeight = 100,
    scale = 1,
    depth = 1,
    facing = 'south'
  } = options;
  
  console.log(`Fetching image from: ${url}`);
  const { pixels, width, height } = await fetchImagePixels(url, maxWidth, maxHeight);
  console.log(`Image loaded: ${width}x${height} pixels`);
  
  let commands: string[];
  
  if (depth <= 1) {
    commands = pixelsToWallCommands(pixels, x, y, z, scale, facing);
  } else {
    commands = pixelsToExtrudedCommands(pixels, x, y, z, scale, depth, facing);
  }
  
  // Optimize commands by merging adjacent same-block fills
  const optimized = optimizeCommands(commands);
  
  console.log(`Generated ${optimized.length} commands for ${width}x${height} image (scale: ${scale}x)`);
  
  return {
    commands: optimized,
    width: width * scale,
    height: height * scale,
    blockCount: optimized.length
  };
}

/**
 * Build a logo/image and return info about the build
 */
export async function buildLogo(
  imageUrl: string,
  centerX: number = 0,
  baseY: number = 65,
  centerZ: number = 50,
  options: {
    maxSize?: number;
    scale?: number;
    depth?: number;
    facing?: 'north' | 'south' | 'east' | 'west';
  } = {}
): Promise<{
  commands: string[];
  forceloadCommand: string;
  buildInfo: {
    width: number;
    height: number;
    blocks: number;
    position: { x: number; y: number; z: number };
  };
}> {
  const maxSize = options.maxSize || 64;
  const scale = options.scale || 1;
  const depth = options.depth || 1;
  const facing = options.facing || 'south';
  
  // Fetch and process image
  const { pixels, width, height } = await fetchImagePixels(imageUrl, maxSize, maxSize);
  
  // Calculate actual block dimensions
  const blockWidth = width * scale;
  const blockHeight = height * scale;
  
  // Calculate starting position (centered)
  const startX = centerX - Math.floor(blockWidth / 2);
  const startZ = centerZ;
  
  // Generate build commands
  let commands: string[];
  if (depth <= 1) {
    commands = pixelsToWallCommands(pixels, startX, baseY, startZ, scale, facing);
  } else {
    commands = pixelsToExtrudedCommands(pixels, startX, baseY, startZ, scale, depth, facing);
  }
  
  // Optimize
  commands = optimizeCommands(commands);
  
  // Generate forceload command for the build area
  const forceloadCommand = `forceload add ${startX - 16} ${startZ - 16} ${startX + blockWidth + 16} ${startZ + depth + 16}`;
  
  return {
    commands,
    forceloadCommand,
    buildInfo: {
      width: blockWidth,
      height: blockHeight,
      blocks: commands.length,
      position: { x: startX, y: baseY, z: startZ }
    }
  };
}

