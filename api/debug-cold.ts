import { VercelRequest, VercelResponse } from '@vercel/node';

const BASE_URL = "https://cdn.polaroid.com.cn/v2021-10-21/data/query/production";

// Temporary diagnostic endpoint: replays the creative-calls query with unique
// whitespace padding so CloudFront always treats it as a cache miss, and
// reports exactly how the in-region fetch behaves (TTFB, body time, failure
// cause). Remove once the timeout fix is verified.
export default async (req: VercelRequest, res: VercelResponse) => {
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
  }` + '\n' + ' '.repeat((Date.now() % 512) + 1) + '\n';

  const targetUrl = `${BASE_URL}?query=${encodeURIComponent(query)}&perspective=published`;
  const t0 = Date.now();
  let ttfbMs: number | null = null;
  try {
    const response = await fetch(targetUrl);
    ttfbMs = Date.now() - t0;
    const body = await response.arrayBuffer();
    res.status(200).json({
      ok: true,
      upstreamStatus: response.status,
      xCache: response.headers.get('x-cache'),
      upstreamCacheControl: response.headers.get('cache-control'),
      ttfbMs,
      totalMs: Date.now() - t0,
      bodyBytes: body.byteLength,
    });
  } catch (error) {
    const e = error as Error & { cause?: Error & { code?: string } };
    res.status(200).json({
      ok: false,
      errorName: e.name,
      errorMessage: e.message,
      causeName: e.cause?.name,
      causeCode: e.cause?.code,
      causeMessage: e.cause?.message,
      ttfbMs,
      elapsedMs: Date.now() - t0,
    });
  }
};
