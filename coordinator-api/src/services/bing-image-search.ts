/**
 * Bing Image Search Service
 * 
 * Uses Azure Bing Search API to find real images from search queries.
 * This actually searches the internet in real-time, unlike GPT which just guesses URLs.
 */

// Bing Search API configuration
const BING_SEARCH_KEY = process.env.BING_SEARCH_KEY;
const BING_SEARCH_ENDPOINT = process.env.BING_SEARCH_ENDPOINT || 'https://api.bing.microsoft.com';

export interface ImageSearchResult {
  success: boolean;
  imageUrl?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  searchQuery?: string;
  error?: string;
}

/**
 * Search for an image using Bing Image Search API
 * 
 * @param query - What to search for (e.g., "Ferrari logo", "Apple logo PNG")
 * @returns The best matching image URL
 */
export async function searchImage(query: string): Promise<ImageSearchResult> {
  console.log(`[Bing Image Search] Searching for: "${query}"`);
  
  if (!BING_SEARCH_KEY) {
    return {
      success: false,
      error: 'Bing Search API is not configured. Please set BING_SEARCH_KEY.',
      searchQuery: query,
    };
  }
  
  try {
    // Build search URL with parameters optimized for pixel art conversion
    const searchParams = new URLSearchParams({
      q: query + ' logo PNG transparent', // Optimize for clean images
      count: '5',
      imageType: 'Clipart', // Prefer simple graphics over photos
      aspect: 'Square', // Square images work best for pixel art
      safeSearch: 'Strict',
    });
    
    const url = `${BING_SEARCH_ENDPOINT}/v7.0/images/search?${searchParams}`;
    
    const response = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': BING_SEARCH_KEY,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Bing Image Search] API error: ${response.status} - ${errorText}`);
      return {
        success: false,
        error: `Bing Search API error: ${response.status}`,
        searchQuery: query,
      };
    }
    
    interface BingImageResult {
      contentUrl: string;
      thumbnailUrl: string;
      hostPageUrl: string;
      encodingFormat: string;
      width: number;
      height: number;
    }
    
    interface BingSearchResponse {
      value?: BingImageResult[];
    }
    
    const data = await response.json() as BingSearchResponse;
    
    if (!data.value || data.value.length === 0) {
      return {
        success: false,
        error: 'No images found for this search query.',
        searchQuery: query,
      };
    }
    
    // Find the best image (prefer PNG, transparent, reasonable size)
    const images = data.value;
    
    // Sort by preference: PNG > others, reasonable size
    const sortedImages = images.sort((a, b) => {
      // Prefer PNG
      const aIsPng = a.encodingFormat?.toLowerCase() === 'png' || a.contentUrl.toLowerCase().includes('.png');
      const bIsPng = b.encodingFormat?.toLowerCase() === 'png' || b.contentUrl.toLowerCase().includes('.png');
      if (aIsPng && !bIsPng) return -1;
      if (!aIsPng && bIsPng) return 1;
      
      // Prefer reasonable dimensions (not too small, not too huge)
      const aSize = Math.min(a.width, a.height);
      const bSize = Math.min(b.width, b.height);
      const aGoodSize = aSize >= 100 && aSize <= 1000;
      const bGoodSize = bSize >= 100 && bSize <= 1000;
      if (aGoodSize && !bGoodSize) return -1;
      if (!aGoodSize && bGoodSize) return 1;
      
      return 0;
    });
    
    const bestImage = sortedImages[0];
    
    console.log(`[Bing Image Search] Found image: ${bestImage.contentUrl.substring(0, 80)}...`);
    
    return {
      success: true,
      imageUrl: bestImage.contentUrl,
      thumbnailUrl: bestImage.thumbnailUrl,
      sourceUrl: bestImage.hostPageUrl,
      searchQuery: query,
    };
    
  } catch (error) {
    console.error('[Bing Image Search] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown search error',
      searchQuery: query,
    };
  }
}

/**
 * Check if Bing Image Search is available
 */
export function isImageSearchAvailable(): boolean {
  return !!BING_SEARCH_KEY;
}

/**
 * Get the status of the image search service
 */
export function getImageSearchStatus(): {
  available: boolean;
  service: string;
} {
  return {
    available: isImageSearchAvailable(),
    service: 'Bing Image Search',
  };
}

