const ASSET_BASE_URL = String(import.meta.env.VITE_ASSET_BASE_URL || '').replace(/\/+$/, '')

export function assetUrl(value) {
  if (!value) return ''
  const url = String(value)
  if (!ASSET_BASE_URL) return url

  try {
    const parsed = new URL(url)
    if (['localhost', '127.0.0.1'].includes(parsed.hostname)) {
      return `${ASSET_BASE_URL}${parsed.pathname}${parsed.search}`
    }
    return url
  } catch {
    return url.startsWith('/') ? `${ASSET_BASE_URL}${url}` : url
  }
}
