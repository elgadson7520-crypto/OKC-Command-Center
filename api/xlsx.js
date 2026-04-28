// Vercel serverless proxy for Google Sheets XLSX export.
// Fetches on the server (no browser CORS) and streams the bytes back.
export const config = { runtime: 'edge' };

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
};

function errResp(msg, status) {
  return new Response(msg, { status, headers: { ...NO_CACHE_HEADERS, 'Content-Type': 'text/plain' } });
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');
  if (!target) return errResp('Missing ?url=', 400);

  let u;
  try { u = new URL(target); } catch { return errResp('Invalid url', 400); }
  const host = u.hostname;
  const ok = /(^|\.)google(usercontent)?\.com$/.test(host)
          || /(^|\.)googleapis\.com$/.test(host)
          || /(^|\.)docs\.google\.com$/.test(host);
  if (!ok) return errResp('Host not allowed', 403);

  // Headers that mimic a normal browser — Google returns 404 to some bare fetches
  const upstreamHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  let lastStatus = 0;
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(target, { redirect: 'follow', headers: upstreamHeaders });
      lastStatus = r.status;
      if (r.ok) {
        const buf = await r.arrayBuffer();
        const bytes = new Uint8Array(buf.slice(0, 4));
        // Validate XLSX magic bytes (PK\x03\x04)
        if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B) {
          return new Response(buf, {
            status: 200,
            headers: {
              ...NO_CACHE_HEADERS,
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
          });
        }
        lastErr = 'Upstream returned non-xlsx body';
      } else {
        lastErr = `Upstream HTTP ${r.status}`;
      }
    } catch (e) {
      lastErr = `Fetch error: ${e.message}`;
    }
    // Small backoff between retries (50ms, 200ms)
    if (attempt < 2) await new Promise(r => setTimeout(r, 50 * (attempt + 1) * 4));
  }
  return errResp(`Proxy failed after retries: ${lastErr} (last status ${lastStatus})`, 502);
}
