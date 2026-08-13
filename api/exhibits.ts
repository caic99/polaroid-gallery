import { VercelRequest, VercelResponse } from '@vercel/node';
import { getCache, waitUntil } from '@vercel/functions';

// Query Sanity's global API CDN directly instead of cdn.polaroid.com.cn.
// The latter is CloudFront China, which resolves to edge IPs that are often
// unreachable from Vercel's hnd1 region (TCP connect times out after 10s and
// the function 500s). Both hosts front the same Sanity project (eqpwcnu7) and
// return byte-identical results.
const BASE_URL = "https://eqpwcnu7.apicdn.sanity.io/v2021-10-21/data/query/production";

// Projections are trimmed to exactly what the frontend reads: asset
// url/assetId, gallery-item dimensions, and only the dominant palette
// swatch (blurHash, path, aspectRatio and the six other swatches were
// never read). This cuts the payload from ~1.57 MB to ~380 KB.
const QUERY = `*[_type == 'exhibits']{
    items[]{
      "identifier": identifier["current"],
      title,
      subtitle,
      coverImages[]{asset->{url,assetId,metadata{palette{dominant{background,foreground}}}}},
      gallery{
        title,
        galleryItems[]{
          title,
          "desc": desc[0].children[0].text,
          image{asset->{url,assetId,metadata{dimensions{width,height},palette{dominant{background,foreground}}}}}
        }
      }
    }
  }`;

// The Runtime Cache survives deployments (the CDN cache does not), so after
// a deploy the first visitor gets last cached data instantly instead of
// waiting on Sanity. Entries older than FRESH_MS are served immediately and
// refreshed in the background.
const CACHE_KEY = 'exhibits-v1';
const FRESH_MS = 60 * 60 * 1000;
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

interface CacheEntry {
  result: unknown;
  fetchedAt: number;
}

async function fetchUpstream(): Promise<unknown> {
  const targetUrl = `${BASE_URL}?query=${encodeURIComponent(QUERY)}&perspective=published`;
  let lastError: unknown;
  // One retry: Sanity's cold recompute occasionally races its own CDN.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(targetUrl, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      if (!data || !data.result) {
        throw new Error('Invalid API response format');
      }
      return data.result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function refreshCache(): Promise<void> {
  try {
    const result = await fetchUpstream();
    await getCache().set(CACHE_KEY, { result, fetchedAt: Date.now() }, { ttl: CACHE_TTL_SECONDS });
  } catch (error) {
    console.error('Background refresh of exhibits failed:', error);
  }
}

function setCacheHeaders(res: VercelResponse) {
  // Deliberately ignore Sanity's own 60 s cache hint: the gallery changes
  // at most a few times per week, so browsers may cache for an hour and
  // the Vercel edge for a day, each serving stale for up to a week while
  // revalidating in the background (or on upstream errors).
  res.setHeader(
    'Cache-Control',
    'public, max-age=3600, stale-while-revalidate=604800, stale-if-error=604800'
  );
  res.setHeader(
    'Vercel-CDN-Cache-Control',
    'public, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800'
  );
}

export default async (req: VercelRequest, res: VercelResponse) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const entry = (await getCache().get(CACHE_KEY)) as CacheEntry | null;
  if (entry && entry.result) {
    if (Date.now() - entry.fetchedAt > FRESH_MS) {
      waitUntil(refreshCache());
    }
    setCacheHeaders(res);
    // Forward only the result: the upstream envelope also echoes the full
    // query text and sync tags, which no client reads.
    return res.status(200).json({ result: entry.result });
  }

  try {
    const result = await fetchUpstream();
    await getCache().set(CACHE_KEY, { result, fetchedAt: Date.now() }, { ttl: CACHE_TTL_SECONDS });
    setCacheHeaders(res);
    return res.status(200).json({ result });
  } catch (error) {
    console.error('Error fetching exhibits:', error);
    // 502: the upstream failed us; never cached by the CDN.
    return res.status(502).json({
      error: 'Failed to fetch exhibits',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
