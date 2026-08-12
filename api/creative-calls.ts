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

    const response = await fetch(targetUrl);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.result) {
      return res.status(400).json({ error: 'Invalid API response format' });
    }

    // Keep the edge response fresh for an hour and serve stale for up to a
    // day while revalidating in the background, so visitors never wait on
    // the upstream CDN.
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400'
    );
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching creative calls:', error);
    res.status(500).json({
      error: 'Failed to fetch creative calls',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
