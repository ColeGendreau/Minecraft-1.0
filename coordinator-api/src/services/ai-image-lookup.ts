/**
 * AI Image Lookup Service
 * 
 * Uses Azure OpenAI GPT-4o to find real image URLs from text descriptions.
 * This is much more reliable for pixel art conversion than AI-generated images
 * because real images (logos, icons, etc.) have cleaner, more recognizable shapes.
 */

import { AzureOpenAI } from 'openai';

// Azure OpenAI configuration
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

// Initialize Azure OpenAI client
const azureOpenAI = AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_API_KEY
  ? new AzureOpenAI({
      endpoint: AZURE_OPENAI_ENDPOINT,
      apiKey: AZURE_OPENAI_API_KEY,
      apiVersion: '2024-08-01-preview',
    })
  : null;

export interface ImageLookupResult {
  success: boolean;
  imageUrl?: string;
  searchQuery?: string;
  error?: string;
}

/**
 * System prompt for the image lookup bot
 */
const IMAGE_LOOKUP_PROMPT = `You are an image lookup bot.
I will give you text input.
Your job is to find one single image URL that is most relevant to that text.

Rules:
- Respond with ONLY the direct image URL
- No extra text, no formatting, no explanation
- Prefer PNG images when available
- The URL must point directly to an image file (ending in .png, .jpg, .jpeg, .gif, .webp, or from known image CDNs)
- If multiple options exist, choose the most official or widely recognized image
- Prefer images from:
  - Wikipedia/Wikimedia Commons
  - Official brand websites
  - GitHub raw content
  - Imgur
  - Other reliable image hosts
- The image should work well for pixel art conversion:
  - Clear, distinct shapes
  - Simple backgrounds (preferably transparent)
  - Recognizable silhouettes
  - Bold colors

Output must be exactly one URL and nothing else.`;

/**
 * Look up an image URL using AI
 * 
 * @param description - What kind of image to find (e.g., "Apple logo", "red dragon", "Nike swoosh")
 * @returns The image URL if found, or an error
 */
export async function lookupImageUrl(description: string): Promise<ImageLookupResult> {
  console.log(`[AI Image Lookup] Searching for: "${description}"`);
  
  if (!azureOpenAI) {
    return {
      success: false,
      error: 'Azure OpenAI is not configured. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY.',
    };
  }
  
  try {
    const response = await azureOpenAI.chat.completions.create({
      model: AZURE_OPENAI_DEPLOYMENT,
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for more consistent results
      messages: [
        { role: 'system', content: IMAGE_LOOKUP_PROMPT },
        { role: 'user', content: description }
      ],
    });
    
    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      return {
        success: false,
        error: 'AI returned no response',
      };
    }
    
    // Validate that the response looks like a URL
    if (!content.startsWith('http://') && !content.startsWith('https://')) {
      console.warn(`[AI Image Lookup] AI returned non-URL: "${content}"`);
      return {
        success: false,
        error: `AI did not return a valid URL. Response: "${content.substring(0, 100)}"`,
        searchQuery: description,
      };
    }
    
    // Basic URL validation - check it looks like an image URL
    const url = content.split(/\s/)[0]; // Take first word in case of extra text
    
    console.log(`[AI Image Lookup] Found URL: ${url}`);
    
    return {
      success: true,
      imageUrl: url,
      searchQuery: description,
    };
    
  } catch (error) {
    console.error('[AI Image Lookup] Error:', error);
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
        searchQuery: description,
      };
    }
    
    return {
      success: false,
      error: 'Unknown error during image lookup',
      searchQuery: description,
    };
  }
}

/**
 * Check if the AI image lookup service is available
 */
export function isImageLookupAvailable(): boolean {
  return !!(AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_API_KEY);
}

/**
 * Get the status of the image lookup service
 */
export function getImageLookupStatus(): {
  available: boolean;
  deployment: string;
  endpoint?: string;
} {
  return {
    available: isImageLookupAvailable(),
    deployment: AZURE_OPENAI_DEPLOYMENT,
    endpoint: AZURE_OPENAI_ENDPOINT ? `${AZURE_OPENAI_ENDPOINT.substring(0, 30)}...` : undefined,
  };
}

