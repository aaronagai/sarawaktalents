import React from 'https://esm.sh/react@18.2.0'
import satori from 'npm:satori@0.10.13'
import jpeg from 'npm:jpeg-js@0.4.4'
import { assetUrl, CARD_HEIGHT, CARD_WIDTH } from '../_shared/constants.ts'
import { rasterizeBadge } from '../_shared/badge-raster.ts'
import { loadResvg } from '../_shared/resvg.ts'
import { getShareProfile, primaryBadge } from '../_shared/profile.ts'

// Latin subset of SF Pro Rounded Regular, hosted in the public assets bucket.
// Must be a TrueType (glyf) build — satori silently drops CFF/PostScript OTF glyphs.
const FONT_URL =
  'https://zedeqvbsuljgxapkoihg.supabase.co/storage/v1/object/public/assets/fonts/sf-pro-rounded-regular-latin.ttf'

let fontsPromise: Promise<{ name: string; weight: 400; data: ArrayBuffer }[]> | null = null

function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      const res = await fetch(FONT_URL)
      if (!res.ok) throw new Error(`font fetch failed (${res.status})`)
      return [{ name: 'SF Pro Rounded', weight: 400 as const, data: await res.arrayBuffer() }]
    })()
    fontsPromise.catch(() => {
      fontsPromise = null // let the next request retry instead of caching the failure
    })
  }
  return fontsPromise
}

const AVATAR_WIDTH = 500
const AVATAR_HEIGHT = CARD_HEIGHT - 8

/**
 * Uploads can be huge (multi-MB, 3000px+); satori/resvg cannot afford to
 * decode them within the edge CPU budget. Supabase Storage image
 * transformation serves a pre-cropped thumbnail instead.
 */
function downsizedAvatar(url: string | null): string | null {
  if (!url) return null
  const transformed = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/',
  )
  if (transformed === url) return url
  const sep = transformed.includes('?') ? '&' : '?'
  return `${transformed}${sep}width=${AVATAR_WIDTH}&height=${AVATAR_HEIGHT}&resize=cover`
}

export async function buildShareImage(username: string): Promise<Response> {
  const profile = await getShareProfile(username)
  if (!profile) return new Response('Profile not found', { status: 404 })

  const avatarUrl = downsizedAvatar(assetUrl(profile.avatar_url))
  const badgePath = primaryBadge(profile)
  const [fonts, badgeUrl] = await Promise.all([
    loadFonts(),
    badgePath ? rasterizeBadge(assetUrl(badgePath) ?? '') : Promise.resolve(null),
  ])

  const header = React.createElement(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: 14 } },
    React.createElement(
      'span',
      { style: { fontSize: 34, fontWeight: 400, letterSpacing: '-0.02em' } },
      `@${profile.username}`,
    ),
    badgeUrl
      ? React.createElement('img', {
          src: badgeUrl,
          width: 44,
          height: 44,
          style: {
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            objectFit: 'contain',
            background: '#ffffff',
          },
        })
      : null,
  )

  const headline = React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        fontSize: 58,
        fontWeight: 400,
        lineHeight: 1.15,
        letterSpacing: '-0.03em',
        marginBottom: 28,
      },
    },
    React.createElement('span', null, 'Find me on'),
    React.createElement('span', null, 'SarawakTalents.com'),
  )

  const left = React.createElement(
    'div',
    {
      style: {
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '56px 64px',
        minWidth: 0,
      },
    },
    header,
    headline,
  )

  const right = avatarUrl
    ? React.createElement('img', {
        src: avatarUrl,
        width: AVATAR_WIDTH,
        height: AVATAR_HEIGHT,
        style: {
          objectFit: 'cover',
          objectPosition: 'center top',
          flexShrink: 0,
        },
      })
    : React.createElement(
        'div',
        {
          style: {
            width: AVATAR_WIDTH,
            flexShrink: 0,
            background: 'linear-gradient(145deg, #7c3aed, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 120,
            fontWeight: 400,
          },
        },
        (profile.name || '?').charAt(0).toUpperCase(),
      )

  const card = React.createElement(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        background: '#ffffff',
        border: '4px solid #111111',
        fontFamily: 'SF Pro Rounded',
        color: '#111111',
      },
    },
    left,
    right,
  )

  const svg = await satori(card, { width: CARD_WIDTH, height: CARD_HEIGHT, fonts })

  const { Resvg } = await loadResvg()
  const rendered = new Resvg(svg, {
    fitTo: { mode: 'width', value: CARD_WIDTH },
  }).render()

  // WhatsApp drops og:image previews above ~600KB; JPEG keeps photo cards small.
  const { data } = jpeg.encode(
    { data: rendered.pixels, width: rendered.width, height: rendered.height },
    82,
  )

  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
