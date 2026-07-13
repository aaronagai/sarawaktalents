# Profile Open Graph worker (Cloudflare)

WhatsApp and other crawlers cannot run JavaScript. GitHub Pages always serves
the same `profile/index.html` for every `?u=` handle, so link previews need
edge logic on your domain.

This worker intercepts **crawler** requests to:

`https://sarawaktalents.com/profile/?u=<username>`

and returns personalised OG HTML (via the Supabase `share` function). Normal
browsers still load the profile page from GitHub Pages.

## Requirements

- `sarawaktalents.com` DNS on **Cloudflare** with the proxy enabled (orange cloud)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)

## Deploy (one time)

```bash
cd /Users/aaronnagai/sarawaktalents
npx wrangler login
npx wrangler deploy
```

## Verify

```bash
curl -s -A "facebookexternalhit/1.1" "https://sarawaktalents.com/profile/?u=harting" | grep og:image
```

You should see the `share-image` URL for that user, not `linkpreview.jpg`.

# Badge scheduler worker (Cloudflare)

`badge-scheduler.js` runs the four badge checks that can't be decided from a
single user's data (Pioneer, Anniversary, Explorer, Rising Star — see
`supabase/migrations/012_badges_scheduled.sql`) on a daily Cron Trigger,
instead of a client-invoked RPC.

## Deploy (one time)

```bash
cd /path/to/sarawaktalents
npx wrangler login
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY -c wrangler.badges.toml
npx wrangler deploy -c wrangler.badges.toml
```

`SUPABASE_SERVICE_ROLE_KEY` is the **service_role** key from Supabase's
Project Settings → API page — it bypasses RLS entirely. Only this worker
ever sees it; never put it in `config.js` or any client-facing file.

## Verify (without waiting for the daily cron)

Cloudflare dashboard → Workers → `sarawaktalents-badge-scheduler` →
Triggers → "Trigger Cron", or call the RPC directly:

```bash
curl -X POST "https://zedeqvbsuljgxapkoihg.supabase.co/rest/v1/rpc/run_scheduled_badge_checks" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY"
```

Then check `user_badges` in the Supabase SQL editor for new
`pioneer`/`anniversary`/`explorer`/`rising-star` rows.