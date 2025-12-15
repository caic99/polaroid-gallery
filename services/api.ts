import { APIResponse, ExhibitGroup, ExhibitItem, SubmissionItem } from '../types';

const BASE_URL = "https://cdn.polaroid.com.cn/v2021-10-21/data/query/production";

const stripProxyWrapper = (url: string) => {
  if (!url) return '';

  const corsProxyPrefix = 'https://corsproxy.io/?';
  if (url.startsWith(corsProxyPrefix)) {
    const wrapped = url.slice(corsProxyPrefix.length);
    try {
      return decodeURIComponent(wrapped);
    } catch {
      return wrapped;
    }
  }

  const allOriginsPrefix = 'https://api.allorigins.win/raw?url=';
  if (url.startsWith(allOriginsPrefix)) {
    const wrapped = url.slice(allOriginsPrefix.length);
    try {
      return decodeURIComponent(wrapped);
    } catch {
      return wrapped;
    }
  }

  return url;
};

// Helper to construct image URLs if needed, though the query usually provides full URLs.
// We can append parameters for optimization.
export const getOptimizedImageUrl = (url: string, width = 800) => {
  if (!url) return '';
  const cleanUrl = stripProxyWrapper(url);
  const separator = cleanUrl.includes('?') ? '&' : '?';
  return `${cleanUrl}${separator}w=${width}&fm=webp&q=80`;
};

const fetchJsonWithProxies = async <T>(targetUrl: string): Promise<T> => {
  const strategies = [
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
  ];

  let lastError: unknown = null;

  for (const url of strategies) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      console.warn(`Fetch attempt failed for proxy: ${url}`, error);
      lastError = error;
    }
  }

  console.error('All fetch strategies failed. Last error:', lastError);
  throw (lastError as Error) || new Error('Unable to connect to gallery service.');
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

  const data = await fetchJsonWithProxies<APIResponse<ExhibitGroup[]>>(targetUrl);

  if (!data || !data.result) {
    throw new Error('Invalid API response format');
  }

  return data.result.flatMap((group) => group.items || []);
};

export const fetchCreativeCalls = async (): Promise<ExhibitItem[]> => {
  const query = `*[_type=='submission'][dateTime(beginAt)<dateTime(now())] | order(beginAt desc) {
    "identifier": identifier["current"],
    title,
    subtitle,
    beginAt,
    endAt,
    "isOngoing": dateTime(beginAt)<dateTime(now())&&dateTime(endAt)>dateTime(now()),
    "heroImage": image{asset->{path,url,assetId,metadata{blurHash,palette,dimensions}}},
    submissionGallery{
      title,
      "count": count(galleryItems),
      galleryItems[]{title,submissionEntryIdentifier,desc,image{asset->{path,url,assetId,metadata{blurHash,palette,dimensions}}}}
    },
    allApprovedSubmissionsGallery{
      title,
      "count": count(galleryItems),
      galleryItems[]{
        title,
        submissionEntryIdentifier,
        moderatedAt,
        submittedAt,
        desc,
        image{asset->{path,url,assetId,metadata{blurHash,palette,dimensions}}}
      } | order(moderatedAt desc)[0...8]
    }
  }`;

  const encodedQuery = encodeURIComponent(query);
  const targetUrl = `${BASE_URL}?query=${encodedQuery}&perspective=published`;

  const data = await fetchJsonWithProxies<APIResponse<SubmissionItem[]>>(targetUrl);

  if (!data || !data.result) {
    throw new Error('Invalid API response format');
  }

  return (data.result || []).map((item) => {
    const gallery = item.allApprovedSubmissionsGallery || item.submissionGallery;
    return {
      identifier: item.identifier,
      title: item.title,
      subtitle: item.subtitle,
      coverImages: item.heroImage ? [item.heroImage] : undefined,
      gallery: {
        title: gallery?.title,
        galleryItems: gallery?.galleryItems,
      },
    } satisfies ExhibitItem;
  });
};