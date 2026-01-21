/**
 * AI Image Lookup Service
 * 
 * Uses Azure OpenAI GPT-4o to find real image URLs from text descriptions.
 * Includes URL validation to ensure the image actually exists.
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
  attempts?: number;
}

/**
 * System prompt for the image lookup bot
 */
const IMAGE_LOOKUP_PROMPT = `You are an image URL finder.
I will give you text describing something (a logo, icon, character, etc).
Your job is to provide a WORKING image URL.

CRITICAL RULES:
- Return ONLY the URL, nothing else
- The URL MUST be from one of these reliable sources:
  
  PREFERRED (most likely to work):
  - upload.wikimedia.org (Wikipedia/Wikimedia Commons - BEST CHOICE)
  - raw.githubusercontent.com (GitHub raw files)
  - i.imgur.com (Imgur direct links)
  - cdn.iconscout.com
  - assets.stickpng.com
  
  ACCEPTABLE:
  - i.redd.it (Reddit images)
  - pbs.twimg.com (Twitter/X images)
  - cdn.pixabay.com
  
- URL must end in .png, .jpg, .jpeg, .gif, .webp, or .svg
- Choose images that are:
  - Clear with distinct shapes
  - Simple/transparent backgrounds
  - Official/recognizable versions
  - Good for pixel art conversion

For logos, use the Wikipedia/Wikimedia version when possible.

Output: Just the URL. Nothing else.`;

/**
 * Validate that a URL returns a valid image
 */
async function validateImageUrl(url: string, timeoutMs: number = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(url, {
      method: 'HEAD', // Just check headers, don't download
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WorldForge/1.0)',
      },
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.log(`[AI Image Lookup] URL validation failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    // Check content type is an image
    const contentType = response.headers.get('content-type') || '';
    const isImage = contentType.startsWith('image/') || 
                    contentType.includes('svg') ||
                    // Some CDNs don't return proper content-type
                    url.match(/\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i);
    
    if (!isImage) {
      console.log(`[AI Image Lookup] URL is not an image: ${contentType}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.log(`[AI Image Lookup] URL validation error: ${error}`);
    return false;
  }
}

/**
 * Look up an image URL using AI with validation and retries
 */
export async function lookupImageUrl(description: string, maxAttempts: number = 3): Promise<ImageLookupResult> {
  console.log(`[AI Image Lookup] Searching for: "${description}"`);
  
  if (!azureOpenAI) {
    return {
      success: false,
      error: 'Azure OpenAI is not configured. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY.',
    };
  }
  
  const triedUrls: string[] = [];
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[AI Image Lookup] Attempt ${attempt}/${maxAttempts}`);
      
      // Build the prompt, including previously tried URLs to avoid
      let userPrompt = description;
      if (triedUrls.length > 0) {
        userPrompt += `\n\nDO NOT use these URLs (they don't work):\n${triedUrls.join('\n')}\n\nFind a DIFFERENT URL from a different source.`;
      }
      
      const response = await azureOpenAI.chat.completions.create({
        model: AZURE_OPENAI_DEPLOYMENT,
        max_tokens: 500,
        temperature: 0.3 + (attempt * 0.2), // Increase temperature on retries for variety
        messages: [
          { role: 'system', content: IMAGE_LOOKUP_PROMPT },
          { role: 'user', content: userPrompt }
        ],
      });
      
      const content = response.choices[0]?.message?.content?.trim();
      
      if (!content) {
        console.warn(`[AI Image Lookup] Empty response on attempt ${attempt}`);
        continue;
      }
      
      // Extract URL from response
      const urlMatch = content.match(/https?:\/\/[^\s"'<>]+/);
      if (!urlMatch) {
        console.warn(`[AI Image Lookup] No URL in response: "${content.substring(0, 100)}"`);
        continue;
      }
      
      const url = urlMatch[0].replace(/[,.\])]+$/, ''); // Clean trailing punctuation
      
      // Check if we've already tried this URL
      if (triedUrls.includes(url)) {
        console.log(`[AI Image Lookup] Already tried this URL, skipping`);
        continue;
      }
      
      triedUrls.push(url);
      console.log(`[AI Image Lookup] Validating URL: ${url}`);
      
      // Validate the URL actually works
      const isValid = await validateImageUrl(url);
      
      if (isValid) {
        console.log(`[AI Image Lookup] ✓ Found valid image on attempt ${attempt}`);
        return {
          success: true,
          imageUrl: url,
          searchQuery: description,
          attempts: attempt,
        };
      }
      
      console.log(`[AI Image Lookup] ✗ URL invalid, trying again...`);
      
    } catch (error) {
      console.error(`[AI Image Lookup] Error on attempt ${attempt}:`, error);
    }
  }
  
  // All attempts failed
  return {
    success: false,
    error: `Could not find a working image after ${maxAttempts} attempts. Try using "Image URL" mode with a direct link instead.`,
    searchQuery: description,
    attempts: maxAttempts,
  };
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
