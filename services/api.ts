import { APIResponse, ExhibitGroup, ExhibitItem, SubmissionItem } from '../types';

// Helper to construct image URLs if needed, though the query usually provides full URLs.
// We can append parameters for optimization.
export const getOptimizedImageUrl = (url: string, width = 800) => {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=${width}&fm=webp&q=80`;
};

/**
 * Fetches the main exhibits data from the Vercel API route.
 */
export const fetchExhibits = async (): Promise<ExhibitItem[]> => {
  const response = await fetch('/api/exhibits');

  if (!response.ok) {
    throw new Error(`Failed to fetch exhibits: ${response.status}`);
  }

  const data = await response.json() as APIResponse<ExhibitGroup[]>;

  if (!data || !data.result) {
    throw new Error('Invalid API response format');
  }

  return data.result.flatMap((group) => group.items || []);
};

export const fetchCreativeCalls = async (): Promise<ExhibitItem[]> => {
  const response = await fetch('/api/creative-calls');

  if (!response.ok) {
    throw new Error(`Failed to fetch creative calls: ${response.status}`);
  }

  const data = await response.json() as APIResponse<SubmissionItem[]>;

  if (!data || !data.result) {
    throw new Error('Invalid API response format');
  }

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