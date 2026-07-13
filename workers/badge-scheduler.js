/**
 * Cloudflare Worker — daily scheduled badge checks.
 *
 * Pioneer, Anniversary, Explorer, and Rising Star can't be decided from a
 * single user's data (see migration 011's comment on check_and_award_badges)
 * — they need to scan across all profiles/views, so they run here on a Cron
 * Trigger instead of being invoked from client JS.
 *
 * DEPLOY:  wrangler deploy -c wrangler.badges.toml
 *   Set the service-role key first (this is a genuine secret — bypasses RLS
 *   entirely — deliberately separate from directory-cache.js's anon key and
 *   never exposed to any client-facing code):
 *     wrangler secret put SUPABASE_SERVICE_ROLE_KEY -c wrangler.badges.toml
 *
 * MANUAL TRIGGER (for testing, instead of waiting for the daily cron):
 *   Cloudflare dashboard → Workers → sarawaktalents-badge-scheduler →
 *   Triggers → "Trigger Cron", or:
 *     curl -X POST "$SUPABASE_URL/rest/v1/rpc/run_scheduled_badge_checks" \
 *       -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY"
 */

const SUPABASE_URL = 'https://zedeqvbsuljgxapkoihg.supabase.co';

export default {
  async scheduled(event, env, ctx) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/run_scheduled_badge_checks`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    if (!res.ok) {
      console.error('[badge-scheduler] run_scheduled_badge_checks failed:', res.status, await res.text());
    }
  },

  // GET/POST also reachable directly for manual testing (still requires the
  // service-role key as a bearer token — same trust boundary as the cron path).
  async fetch(request) {
    return new Response('This worker runs on a Cron Trigger. See workers/README.md.', { status: 200 });
  },
};
