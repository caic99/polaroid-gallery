
import { APIResponse, ExhibitGroup, ExhibitItem } from '../types';

const BASE_URL = "https://cdn.polaroid.com.cn/v2021-10-21/data/query/production";

// Helper to construct image URLs if needed, though the query usually provides full URLs.
// We can append parameters for optimization.
export const getOptimizedImageUrl = (url: string, width = 800) => {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=${width}&fm=webp&q=80`;
};

/**
 * Fetches the main exhibits data using the specific GROQ pattern provided.
 * Uses multiple proxy strategies to handle CORS and network reliability.
 */
export const fetchExhibits = async (): Promise<ExhibitItem[]> => {
  const query = `*[_type == 'exhibits']{
    items[]{
      "identifier": identifier["current"],
      title,
      subtitle,
      coverImages[]{
        asset->{
          path,
          url,
          assetId,
          metadata{blurHash,palette,dimensions}
        }
      },
      gallery{
        title,
        galleryItems[]{
          title,
          "desc": desc[0].children[0].text,
          image{
            asset->{
              path,
              url,
              assetId,
              metadata{blurHash,palette,dimensions}
            }
          }
        }
      }
    }
  }`;

  const encodedQuery = encodeURIComponent(query);
  const targetUrl = `${BASE_URL}?query=${encodedQuery}&perspective=published`;

  // Define fetch strategies in order of preference
  const strategies = [
    // Strategy 1: corsproxy.io - fast and reliable
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    // Strategy 2: allorigins.win - reliable fallback
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
  ];

  let lastError = null;

  for (const url of strategies) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: APIResponse<ExhibitGroup[]> = await response.json();
      
      // Validate response structure
      if (!data || !data.result) {
        throw new Error("Invalid API response format");
      }
      
      // Success! Flatten and return the items
      // The query returns an array of ExhibitGroups (objects with an 'items' array).
      return data.result.flatMap(group => group.items || []);

    } catch (error) {
      console.warn(`Fetch attempt failed for proxy: ${url}`, error);
      lastError = error;
      // Continue to next strategy...
    }
  }

  // If we get here, all strategies failed
  console.error("All fetch strategies failed. Last error:", lastError);
  throw lastError || new Error("Unable to connect to gallery service.");
};