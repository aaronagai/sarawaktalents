import { isCrawler } from '../_shared/crawler.ts'
import { profilePageUrl, shareImageUrl } from '../_shared/constants.ts'
import { getShareProfile } from '../_shared/profile.ts'

console.log('share function ready')

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c] as string)
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const username = (url.searchParams.get('u') || '').trim().toLowerCase()
  if (!username) return new Response('Missing ?u=username', { status: 400 })

  const profile = await getShareProfile(username)
  if (!profile) return new Response('Profile not found', { status: 404 })

  const profileUrl = profilePageUrl(username)
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const imageUrl = shareImageUrl(supabaseUrl, username)
  const title = `${profile.name} (@${profile.username})`
  const description = 'Find me on SarawakTalents.com'
  const ua = req.headers.get('user-agent')

  if (!isCrawler(ua)) {
    return Response.redirect(profileUrl, 302)
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="Sarawak Talents">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(profileUrl)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <link rel="canonical" href="${escapeHtml(profileUrl)}">
</head>
<body>
  <p><a href="${escapeHtml(profileUrl)}">${escapeHtml(title)}</a></p>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
})