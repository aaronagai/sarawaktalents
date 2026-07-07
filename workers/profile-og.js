/**
 * Cloudflare Worker — per-user Open Graph for /profile/?u=username
 *
 * GitHub Pages serves one static profile/index.html for every ?u= value, so
 * WhatsApp always sees the generic linkpreview.jpg unless something at the
 * edge returns crawler-specific HTML. This worker proxies bot traffic to the
 * Supabase share function; humans pass through to GitHub Pages unchanged.
 */
const CRAWLER_RE =
  /facebookexternalhit|whatsapp|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|pinterest|googlebot|bingpreview|embedly|quora link preview|vkshare|redditbot/i

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

    if (username && isProfilePath(url.pathname) && isCrawler(ua)) {
      const shareUrl = `${SHARE_FN}?u=${encodeURIComponent(username)}`
      const res = await fetch(shareUrl, { headers: { 'User-Agent': ua } })
      const headers = new Headers(res.headers)
      headers.set('Cache-Control', 'public, max-age=300')
      return new Response(res.body, { status: res.status, headers })
    }

    return fetch(request)
  },
}