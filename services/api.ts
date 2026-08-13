import { APIResponse, ExhibitGroup, ExhibitItem, SubmissionItem } from '../types';

// Helper to construct image URLs if needed, though the query usually provides full URLs.
// We can append parameters for optimization.
export const getOptimizedImageUrl = (url: string, width = 800) => {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=${width}&fm=webp&q=80`;
};

// Bounded fetch with one retry so a flaky connection degrades to a visible
// error instead of hanging the loading state indefinitely.
const fetchJson = async <T>(path: string): Promise<APIResponse<T>> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(path, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${path}: ${response.status}`);
      }
      const data = await response.json() as APIResponse<T>;
      if (!data || !data.result) {
        throw new Error('Invalid API response format');
      }
      return data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

/**
 * Fetches the main exhibits data from the Vercel API route.
 */
export const fetchExhibits = async (): Promise<ExhibitItem[]> => {
  const data = await fetchJson<ExhibitGroup[]>('/api/exhibits');
  return data.result.flatMap((group) => group.items || []);
};

export const fetchCreativeCalls = async (): Promise<ExhibitItem[]> => {
  const data = await fetchJson<SubmissionItem[]>('/api/creative-calls');
  return (data.result || []).map((item) => {
    return {
      identifier: item.identifier,
      title: item.title,
      subtitle: item.subtitle,
      coverImages: item.heroImage ? [item.heroImage] : undefined,
      gallery: {
        title: item.gallery?.title,
        galleryItems: item.gallery?.galleryItems,
      },
    } satisfies ExhibitItem;
  });
};
