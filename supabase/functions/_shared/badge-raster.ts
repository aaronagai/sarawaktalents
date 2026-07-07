/** Rasterize small SVG badges for OG image compositing (Satori supports PNG/JPEG only). */
export async function rasterizeBadge(url: string, size = 88): Promise<string | null> {
  if (!url.toLowerCase().endsWith('.svg')) return url

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const svg = await res.text()
    const { Resvg } = await import('npm:@resvg/resvg-wasm@2.6.2')
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: size },
    })
    const png = resvg.render().asPng()
    const bytes = Uint8Array.from(png)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return `data:image/png;base64,${btoa(binary)}`
  } catch (err) {
    console.error('badge rasterize failed', err)
    return null
  }
}