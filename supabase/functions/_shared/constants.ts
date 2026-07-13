// The app (directory + profiles) lives on the app subdomain; the apex is the
// marketing landing. Share cards / profile links point at the app.
export const SITE_ORIGIN = 'https://app.sarawaktalents.com'

export const CARD_WIDTH = 1200
export const CARD_HEIGHT = 630

export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_ORIGIN}/${String(path).replace(/^\//, '')}`
}

export function profilePageUrl(username: string): string {
  return `${SITE_ORIGIN}/profile/?u=${encodeURIComponent(username)}`
}

// Bump whenever the card design changes. X / WhatsApp / Facebook cache the
// og:image by its URL, so a new token forces them to re-fetch the render
// instead of reusing a stale cached image. (share-image ignores this param.)
export const IMAGE_VERSION = '2'

export function shareImageUrl(supabaseUrl: string, username: string): string {
  const base = supabaseUrl.replace(/\/$/, '')
  return `${base}/functions/v1/share-image?u=${encodeURIComponent(username)}&v=${IMAGE_VERSION}`
}