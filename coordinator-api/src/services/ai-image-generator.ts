/**
 * AI Image Generation Service
 * 
 * Uses Azure OpenAI DALL-E 3 to generate images from text prompts.
 * These images can then be built as pixel art in Minecraft.
 */

import { AzureOpenAI } from 'openai';

// Azure OpenAI configuration
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_DALLE_DEPLOYMENT = process.env.AZURE_DALLE_DEPLOYMENT || 'dall-e-3';

// Initialize Azure OpenAI client for DALL-E
let dalleClient: AzureOpenAI | null = null;

function getDalleClient(): AzureOpenAI | null {
  if (dalleClient) return dalleClient;
  
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
    console.warn('[DALL-E] Azure OpenAI credentials not configured');
    return null;
  }
  
  dalleClient = new AzureOpenAI({
    endpoint: AZURE_OPENAI_ENDPOINT,
    apiKey: AZURE_OPENAI_API_KEY,
    apiVersion: '2024-02-01', // DALL-E 3 API version
  });
  
  return dalleClient;
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  revisedPrompt?: string;
  error?: string;
}

/**
 * Generate an image using DALL-E 3
 * 
 * The prompt is automatically enhanced to create images suitable for
 * Minecraft pixel art conversion (clear shapes, distinct colors, etc.)
 */
export async function generateImage(
  userPrompt: string,
  options: {
    size?: '1024x1024' | '1792x1024' | '1024x1792';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
  } = {}
): Promise<ImageGenerationResult> {
  const client = getDalleClient();
  
  if (!client) {
    // Fall back to placeholder/error
    return {
      success: false,
      error: 'DALL-E is not configured. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY.',
    };
  }
  
  const { size = '1024x1024', quality = 'standard', style = 'vivid' } = options;
  
  // Enhance the prompt for better pixel art conversion
  const enhancedPrompt = `Create a ${userPrompt}.
Style requirements:
- Clean, distinct shapes with clear outlines
- Bold, saturated colors (no subtle gradients)
- Simple background or transparent-style background
- Iconic, recognizable silhouette
- Good for conversion to pixel art or block-based artwork
- No text or writing in the image
- Single main subject, centered`;
  
  console.log(`[DALL-E] Generating image for: "${userPrompt}"`);
  console.log(`[DALL-E] Size: ${size}, Quality: ${quality}, Style: ${style}`);
  
  try {
    const response = await client.images.generate({
      model: AZURE_DALLE_DEPLOYMENT,
      prompt: enhancedPrompt,
      n: 1,
      size,
      quality,
      style,
      response_format: 'url', // Get URL instead of base64
    });
    
    if (!response.data || response.data.length === 0) {
      return {
        success: false,
        error: 'DALL-E returned no data',
      };
    }
    
    const image = response.data[0];
    
    if (!image?.url) {
      return {
        success: false,
        error: 'DALL-E returned no image URL',
      };
    }
    
    console.log(`[DALL-E] Generated image URL: ${image.url.substring(0, 100)}...`);
    
    return {
      success: true,
      imageUrl: image.url,
      revisedPrompt: image.revised_prompt,
    };
  } catch (error) {
    console.error('[DALL-E] Error generating image:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('content_policy_violation')) {
        return {
          success: false,
          error: 'Image request was rejected due to content policy. Try a different prompt.',
        };
      }
      if (error.message.includes('rate_limit')) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: 'Unknown error generating image',
    };
  }
}

/**
 * Generate an image and return a result suitable for asset creation
 */
export async function generateAssetImage(
  prompt: string
): Promise<{
  success: boolean;
  imageUrl?: string;
  revisedPrompt?: string;
  error?: string;
}> {
  // For asset building, we want square images at standard quality
  // This balances detail with performance for pixel art conversion
  return generateImage(prompt, {
    size: '1024x1024',
    quality: 'standard',
    style: 'vivid', // More vibrant colors = better block matching
  });
}

/**
 * Check if DALL-E is available
 */
export function isDalleAvailable(): boolean {
  return !!(AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_API_KEY);
}

/**
 * Get DALL-E configuration status
 */
export function getDalleStatus(): {
  available: boolean;
  deployment: string;
  endpoint?: string;
} {
  return {
    available: isDalleAvailable(),
    deployment: AZURE_DALLE_DEPLOYMENT,
    endpoint: AZURE_OPENAI_ENDPOINT ? `${AZURE_OPENAI_ENDPOINT.substring(0, 30)}...` : undefined,
  };
}

