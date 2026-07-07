/** Shared @resvg/resvg-wasm loader — initWasm must run exactly once per isolate. */
let wasmReady: Promise<void> | null = null

export async function loadResvg() {
  const mod = await import('npm:@resvg/resvg-wasm@2.6.2')
  if (!wasmReady) {
    wasmReady = mod
      .initWasm(fetch('https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm'))
      .catch((err: unknown) => {
        // "Already initialized" from a racing request is fine; anything else is not.
        if (!String(err).includes('initialized')) throw err
      })
  }
  await wasmReady
  return mod
}
