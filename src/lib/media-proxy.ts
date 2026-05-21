/**
 * Same-origin proxy for Django /media/* assets (Vercel edge cache + Lighthouse).
 * Do not use next/image — PythonAnywhere origins 504 through the optimizer.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://3pillars.pythonanywhere.com/api'

export function getBackendMediaHostname(): string {
  try {
    return new URL(API_BASE_URL).hostname
  } catch {
    return '3pillars.pythonanywhere.com'
  }
}

export function getBackendOrigin(): string {
  try {
    const url = new URL(API_BASE_URL)
    return `${url.protocol}//${url.host}`
  } catch {
    return 'https://3pillars.pythonanywhere.com'
  }
}

/** Public storefront origin (https, no trailing slash). */
export function getPublicSiteOrigin(): string | null {
  let raw = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '')
  if (!raw && process.env.VERCEL_URL) {
    raw = process.env.VERCEL_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
  if (!raw) return null
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`
  return raw.replace(/\/$/, '')
}

/** Validate upstream media URL for proxy routes (open-redirect safe). */
export function parseAllowedMediaSrc(src: string | null): URL | null {
  if (!src || src.length > 2048) return null
  let upstreamUrl: URL
  try {
    upstreamUrl = new URL(src)
  } catch {
    return null
  }
  if (upstreamUrl.hostname !== getBackendMediaHostname()) return null
  if (!upstreamUrl.pathname.startsWith('/media/')) return null
  return upstreamUrl
}

export function isProxiableMediaUrl(url: string): boolean {
  if (!url || url.startsWith('data:')) return false
  if (url.startsWith('/images/')) return false
  try {
    const absolute = url.startsWith('http') ? url : `${getBackendOrigin()}${url.startsWith('/') ? url : `/${url}`}`
    const parsed = new URL(absolute)
    return parsed.hostname === getBackendMediaHostname() && parsed.pathname.startsWith('/media/')
  } catch {
    return false
  }
}

/** Browser-facing URL: same-origin /api/media when src is backend media. */
export function proxyMediaUrl(absoluteUrl: string): string {
  if (!absoluteUrl || !isProxiableMediaUrl(absoluteUrl)) return absoluteUrl
  const site = getPublicSiteOrigin()
  if (!site) return absoluteUrl
  let mediaUrl = absoluteUrl
  if (!mediaUrl.startsWith('http')) {
    mediaUrl = `${getBackendOrigin()}${mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`}`
  }
  const storefront = new URL(site)
  try {
    const imageUrl = new URL(mediaUrl)
    if (imageUrl.hostname === storefront.hostname) return absoluteUrl
  } catch {
    return absoluteUrl
  }
  return `${site}/api/media?src=${encodeURIComponent(mediaUrl)}`
}

export const MEDIA_PROXY_CACHE_PAGE =
  'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400'

export const OG_PROXY_CACHE_PAGE = 'public, max-age=86400, s-maxage=86400'

export function mediaProxyUserAgent(): string {
  const slug = (process.env.NEXT_PUBLIC_COMPANY_SLUG || 'storefront').replace(/[^a-zA-Z0-9._-]+/g, '-')
  return (
    process.env.OG_PROXY_USER_AGENT?.trim() ||
    process.env.MEDIA_PROXY_USER_AGENT?.trim() ||
    `${slug}-MediaProxy/1.0`
  )
}
