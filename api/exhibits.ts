export const config = {
  runtime: 'edge',
  regions: ['hnd1'],
};

const BASE_URL = "https://cdn.polaroid.com.cn/v2021-10-21/data/query/production";

const jsonResponse = (body: unknown, status: number, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  });

export default async (req: Request) => {
  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
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

    const targetUrl = `${BASE_URL}?query=${encodeURIComponent(query)}&perspective=published`;
    const response = await fetch(targetUrl);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.result) {
      return jsonResponse({ error: 'Invalid API response format' }, 400);
    }

    // Keep the edge response fresh for an hour and serve stale for up to a
    // day while revalidating in the background, so visitors never wait on
    // the upstream CDN.
    return jsonResponse(data, 200, {
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    });
  } catch (error) {
    console.error('Error fetching exhibits:', error);
    return jsonResponse(
      {
        error: 'Failed to fetch exhibits',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
};
