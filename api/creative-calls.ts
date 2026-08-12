import { VercelRequest, VercelResponse } from '@vercel/node';

// Query Sanity's global API CDN directly instead of cdn.polaroid.com.cn.
// The latter is CloudFront China, which resolves to edge IPs that are often
// unreachable from Vercel's hnd1 region (TCP connect times out after 10s and
// the function 500s). Both hosts front the same Sanity project (eqpwcnu7) and
// return byte-identical results.
const BASE_URL = "https://eqpwcnu7.apicdn.sanity.io/v2021-10-21/data/query/production";

export default async (req: VercelRequest, res: VercelResponse) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Projections are trimmed to exactly what the frontend reads: one gallery
    // per submission (the client used allApprovedSubmissionsGallery ||
    // submissionGallery, mirrored here with coalesce), asset url/assetId,
    // gallery-item dimensions, and only the dominant palette swatch. This
    // cuts the payload from ~695 KB to ~134 KB and shaves Sanity's own query
    // time from ~7.3 s to ~5.9 s on a CDN cache miss. moderatedAt must stay
    // in the projection because order() runs on the projected items.
    const query = `*[_type=='submission' && dateTime(beginAt) < dateTime(now())] | order(beginAt desc) {
    "identifier": identifier["current"],
    title,
    subtitle,
    "heroImage": image{asset->{url,assetId,metadata{palette{dominant{background,foreground}}}}},
    "gallery": coalesce(
      allApprovedSubmissionsGallery{
        title,
        "galleryItems": galleryItems[]{title,moderatedAt,desc,image{asset->{url,assetId,metadata{dimensions{width,height},palette{dominant{background,foreground}}}}}} | order(moderatedAt desc)[0...8]
      },
      submissionGallery{
        title,
        "galleryItems": galleryItems[]{title,desc,image{asset->{url,assetId,metadata{dimensions{width,height},palette{dominant{background,foreground}}}}}}
      }
    )
  }`;

    const encodedQuery = encodeURIComponent(query);
    const targetUrl = `${BASE_URL}?query=${encodedQuery}&perspective=published`;

    const response = await fetch(targetUrl);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.result) {
      return res.status(400).json({ error: 'Invalid API response format' });
    }

    // Browsers may cache for 5 minutes and serve stale for a day while
    // revalidating in the background; the Vercel edge keeps its copy fresh
    // for an hour with the same day-long stale window, so visitors almost
    // never wait on Sanity's ~6 s query recompute.
    res.setHeader(
      'Cache-Control',
      'public, max-age=300, stale-while-revalidate=86400'
    );
    res.setHeader(
      'Vercel-CDN-Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400'
    );
    // Forward only the result: the upstream envelope also echoes the full
    // query text and sync tags, which no client reads.
    res.status(200).json({ result: data.result });
  } catch (error) {
    console.error('Error fetching creative calls:', error);
    res.status(500).json({
      error: 'Failed to fetch creative calls',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
