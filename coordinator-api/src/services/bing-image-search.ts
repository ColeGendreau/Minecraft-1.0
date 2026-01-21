/**
 * Image Search Service
 * 
 * NOTE: Bing Image Search API has been retired by Microsoft (December 2023).
 * This service now always returns unavailable.
 * 
 * Users should provide direct image URLs instead of search queries.
 */

export interface ImageSearchResult {
  success: boolean;
  imageUrl?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  searchQuery?: string;
  error?: string;
}

/**
 * Search for an image
 * 
 * NOTE: Bing Image Search API has been retired by Microsoft.
 * This function always returns an error directing users to provide image URLs directly.
 * 
 * @param query - Search query (not used - service is retired)
 * @returns Error result indicating service is unavailable
 */
export async function searchImage(query: string): Promise<ImageSearchResult> {
  console.log(`[Image Search] Search requested for: "${query}" - service is retired`);
  
  // Bing Image Search API was retired by Microsoft in December 2023
  // Always return unavailable - users should provide direct image URLs
  return {
    success: false,
    error: 'Image Search is no longer available (Bing API retired by Microsoft). Please provide a direct image URL instead.',
    searchQuery: query,
  };
}

/**
 * Check if Image Search is available
 * 
 * NOTE: Always returns false - Bing Image Search API has been retired by Microsoft.
 */
export function isImageSearchAvailable(): boolean {
  // Bing Image Search API was retired by Microsoft in December 2023
  return false;
}

/**
 * Get the status of the image search service
 */
export function getImageSearchStatus(): {
  available: boolean;
  service: string;
} {
  return {
    available: false,
    service: 'Image Search (retired)',
  };
}
