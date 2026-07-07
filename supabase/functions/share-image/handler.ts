import React from 'https://esm.sh/react@18.2.0'
import { ImageResponse } from 'https://deno.land/x/og_edge@0.0.4/mod.ts'
import { assetUrl, CARD_HEIGHT, CARD_WIDTH } from '../_shared/constants.ts'
import { rasterizeBadge } from '../_shared/badge-raster.ts'
import { getShareProfile, primaryBadge } from '../_shared/profile.ts'

const cardStyle: Record<string, string | number> = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'row',
  background: '#ffffff',
  border: '4px solid #111111',
  boxSizing: 'border-box',
  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  color: '#111111',
}

export async function buildShareImage(username: string): Promise<Response> {
  const profile = await getShareProfile(username)
  if (!profile) return new Response('Profile not found', { status: 404 })

  const avatarUrl = assetUrl(profile.avatar_url)
  const badgePath = primaryBadge(profile)
  const badgeUrl = badgePath ? await rasterizeBadge(assetUrl(badgePath) ?? '') : null

  const left = React.createElement(
    'div',
    {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '56px 72px',
        minWidth: 0,
      },
    },
    [
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 48,
          },
        },
        [
          React.createElement(
            'span',
            { style: { fontSize: 34, fontWeight: 500, letterSpacing: '-0.02em' } },
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
                  background: '#fff',
                },
              })
            : null,
        ],
      ),
      React.createElement(
        'div',
        {
          style: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 4,
          },
        },
        [
          React.createElement(
            'div',
            { style: { fontSize: 62, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em' } },
            'Find me on',
          ),
          React.createElement(
            'div',
            { style: { fontSize: 62, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em' } },
            'SarawakTalents.com',
          ),
        ],
      ),
    ],
  )

  const right = avatarUrl
    ? React.createElement('img', {
        src: avatarUrl,
        width: 500,
        height: CARD_HEIGHT - 8,
        style: {
          objectFit: 'cover',
          objectPosition: 'center top',
          flexShrink: 0,
          display: 'block',
        },
      })
    : React.createElement('div', {
        style: {
          width: 500,
          flexShrink: 0,
          background: 'linear-gradient(145deg, #7c3aed, #4f46e5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 120,
          fontWeight: 600,
        },
      }, (profile.name || '?').charAt(0).toUpperCase())

  return new ImageResponse(
    React.createElement('div', { style: cardStyle }, [left, right]),
    { width: CARD_WIDTH, height: CARD_HEIGHT },
  )
}