/**
 * Cloudflare Worker — per-user Open Graph for /profile/?u=username
 *
 * GitHub Pages serves one static profile/index.html for every ?u= value, so
 * WhatsApp always sees the generic linkpreview.jpg unless something at the
 * edge returns crawler-specific HTML. This worker proxies bot traffic to the
 * Supabase share function; humans pass through to GitHub Pages unchanged.
 */
// Meta scrapes link previews under several names — facebookexternalhit (classic)
// plus the newer meta-externalagent / meta-externalfetcher. All must be matched
// or WhatsApp/Facebook fall through to the generic static page.
const CRAWLER_RE =
  /facebookexternalhit|meta-externalagent|meta-externalfetcher|whatsapp|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|pinterest|googlebot|bingpreview|embedly|quora link preview|vkshare|redditbot/i

const SHARE_FN = 'https://zedeqvbsuljgxapkoihg.supabase.co/functions/v1/share'

function isCrawler(userAgent) {
  return CRAWLER_RE.test(userAgent || '')
}

function isProfilePath(pathname) {
  const path = pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/'
  return path === '/profile'
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const username = url.searchParams.get('u')?.trim().toLowerCase()
    const ua = request.headers.get('user-agent') || ''

    const forcePreview = url.searchParams.get('preview') === '1' // curl testing only
    if (username && isProfilePath(url.pathname) && (isCrawler(ua) || forcePreview)) {
      const shareUrl = `${SHARE_FN}?u=${encodeURIComponent(username)}`
      // Always fetch as a crawler — the share function redirects humans to the
      // profile page, and fetch() would follow that redirect to static HTML.
      const res = await fetch(shareUrl, {
        headers: { 'User-Agent': 'facebookexternalhit/1.1' },
        redirect: 'manual',
      })
      if (res.status >= 300 && res.status < 400) {
        return fetch(request)
      }
      const headers = new Headers(res.headers)
      headers.set('Cache-Control', 'public, max-age=300')
      headers.set('X-ST-Profile-OG', '1')
      return new Response(res.body, { status: res.status, headers })
    }

    return fetch(request)
  },
}