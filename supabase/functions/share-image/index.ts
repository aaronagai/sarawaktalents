import { buildShareImage } from './handler.ts'

console.log('share-image function ready')

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const username = (url.searchParams.get('u') || '').trim().toLowerCase()
  if (!username) return new Response('Missing ?u=username', { status: 400 })

  try {
    return await buildShareImage(username)
  } catch (err) {
    console.error('share-image error', err)
    return new Response('Failed to render preview', { status: 500 })
  }
})