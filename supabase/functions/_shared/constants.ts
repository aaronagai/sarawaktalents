export const SITE_ORIGIN = 'https://sarawaktalents.com'

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

export function shareImageUrl(supabaseUrl: string, username: string): string {
  const base = supabaseUrl.replace(/\/$/, '')
  return `${base}/functions/v1/share-image?u=${encodeURIComponent(username)}`
}