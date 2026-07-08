/**
 * Cloudflare Worker — edge-cached public talent directory.
 *
 * WHY: the homepage directory is public and identical for every logged-out
 * visitor, but today each visitor's browser queries Supabase Postgres directly.
 * Under real traffic that's N concurrent DB queries. This worker fetches the
 * list ONCE and serves it from Cloudflare's edge cache, so N visitors collapse
 * to ~1 origin query per TTL window. This is the main "handles more users" lever.
 *
 * DEPLOY:  wrangler deploy -c wrangler.directory.toml
 *   Set the publishable key first (safe to expose, but kept out of git):
 *     wrangler secret put SUPABASE_ANON_KEY -c wrangler.directory.toml
 *
 * ACTIVATE on the frontend: set ST_CONFIG.DIRECTORY_API to this worker's URL
 * (see config.js). Until then loadProfiles() keeps using supabase-js directly,
 * so deploying this worker changes nothing on its own.
 */

const SUPABASE_URL = 'https://zedeqvbsuljgxapkoihg.supabase.co';

// Must stay in sync with the select in script.js → loadProfiles().
const SELECT =
  'id,username,name,role,category,location,industry,background,avatar_url,org_photo,org_photos,created_at';

const TTL = 60;                 // seconds the edge serves a cached copy
const STALE = 300;              // seconds it may serve stale while revalidating

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const cache = caches.default;
    const cacheKey = new Request(new URL(request.url).origin + '/api/directory', request);

    const hit = await cache.match(cacheKey);
    if (hit) {
      const h = new Headers(hit.headers);
      h.set('X-ST-Cache', 'HIT');
      return new Response(hit.body, { status: hit.status, headers: h });
    }

    const origin =
      `${SUPABASE_URL}/rest/v1/profiles` +
      `?select=${encodeURIComponent(SELECT)}` +
      `&status=eq.active&order=created_at.asc`;

    const key = env.SUPABASE_ANON_KEY;
    const res = await fetch(origin, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
    });

    if (!res.ok) {
      // Don't cache errors — let the browser fall back to supabase-js.
      return new Response(await res.text(), { status: res.status });
    }

    const body = await res.text();
    const headers = new Headers({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=30, s-maxage=${TTL}, stale-while-revalidate=${STALE}`,
      'X-ST-Cache': 'MISS',
    });

    const response = new Response(body, { status: 200, headers });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};
