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