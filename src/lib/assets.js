const ASSET_BASE_URL = String(import.meta.env.VITE_ASSET_BASE_URL || '').replace(/\/+$/, '')
const PROXY_TARGET = String(import.meta.env.VITE_API_PROXY_TARGET || '').replace(/\/+$/, '')

let targetHostname = ''
try {
  if (PROXY_TARGET) targetHostname = new URL(PROXY_TARGET).hostname
} catch {
  }

export function assetUrl(value) {
  if (!value) return ''
  const url = String(value).trim()
  if (!url) return ''

  if (url.startsWith('data:') || url.startsWith('blob:')) return url

  try {
    const parsed = new URL(url)
    const isLocalHost = ['localhost', '127.0.0.1'].includes(parsed.hostname)
    const isTargetHost =
      targetHostname &&
      (parsed.hostname === targetHostname || parsed.hostname.endsWith(targetHostname))
    const isProxiedPath = /^\/(storage|covers|uploads|categories|payments|api)\b/i.test(
      parsed.pathname,
    )

    // Route assets through local Vite proxy to prevent cross-origin policy issues.
    if (isLocalHost || isTargetHost || isProxiedPath) {
      if (ASSET_BASE_URL && isLocalHost) {
        return `${ASSET_BASE_URL}${parsed.pathname}${parsed.search}`
      }
      return `${parsed.pathname}${parsed.search}`
    }
    return url
  } catch {
    return url.startsWith('/') ? url : `/${url}`
  }
}
