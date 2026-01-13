import { VercelRequest, VercelResponse } from '@vercel/node';

const BASE_URL = "https://cdn.polaroid.com.cn/v2021-10-21/data/query/production";

export default async (req: VercelRequest, res: VercelResponse) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching exhibits:', error);
    res.status(500).json({
      error: 'Failed to fetch exhibits',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
