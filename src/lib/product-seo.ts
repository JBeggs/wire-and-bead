import type { Product } from '@/lib/types'
import { getProductBundleImages } from '@/lib/image-utils'

type ProductSeoInput = Pick<
  Product,
  'name' | 'seo_title' | 'seo_description' | 'seo_keywords' | 'short_description' | 'description' | 'image'
>

/**
 * Build title, description, keywords for product pages.
 * Mirrors JavaMellow buildProductSeo: seo_* fields override; else use product details.
 */
export function buildProductSeo(
  product: ProductSeoInput,
  companyName: string,
): { title: string; description: string; keywords: string } {
  const title = product.seo_title
    ? `${product.seo_title} | ${companyName}`
    : product.name
      ? `${product.name} | ${companyName}`
      : ''
  const description =
    product.seo_description ?? product.short_description ?? product.description ?? ''
  const keywords = product.seo_keywords ?? ''
  return { title, description, keywords }
}

function backendOriginForMedia(): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://3pillars.pythonanywhere.com/api'
  return apiBase.replace(/\/api\/?$/, '').replace(/\/$/, '') || 'https://3pillars.pythonanywhere.com'
}

function mediaApiHostname(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || 'https://3pillars.pythonanywhere.com/api').hostname
  } catch {
    return '3pillars.pythonanywhere.com'
  }
}

/**
 * WhatsApp/link previews often work more reliably when og:image is served from the
 * same host as the page. Proxy API /media/* through /api/og-proxy on the storefront.
 */
function sameOriginOgImageUrl(directImageUrl: string): string {
  const site = publicSiteOrigin()
  if (!site) return directImageUrl

  let imageUrl: URL
  try {
    imageUrl = new URL(directImageUrl)
  } catch {
    return directImageUrl
  }

  let storefront: URL
  try {
    storefront = new URL(site)
  } catch {
    return directImageUrl
  }

  if (imageUrl.hostname === storefront.hostname) {
    return directImageUrl
  }
  if (imageUrl.hostname !== mediaApiHostname() || !imageUrl.pathname.startsWith('/media/')) {
    return directImageUrl
  }

  const base = site.replace(/\/$/, '')
  return `${base}/api/og-proxy?src=${encodeURIComponent(imageUrl.toString())}`
}

/** Public site origin (https, no trailing slash). Used for absolute OG URLs and optional og:url. */
export function publicSiteOrigin(): string | null {
  let raw = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '')
  if (!raw && process.env.VERCEL_URL) {
    raw = process.env.VERCEL_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
  if (!raw) return null
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`
  }
  return raw.replace(/\/$/, '')
}

/** Gallery placeholder only — pathname match avoids false positives on long URLs. */
function isGalleryPlaceholderUrl(url: string): boolean {
  if (!url) return true
  try {
    const pathname = new URL(url, 'https://placeholder.local').pathname
    return pathname === '/images/products/default.svg' || pathname.endsWith('/images/products/default.svg')
  } catch {
    return url === '/images/products/default.svg' || url.endsWith('/images/products/default.svg')
  }
}

function fallbackOgImageUrl(): string {
  const site = publicSiteOrigin()
  if (site) {
    return `${site}/api/og-default`
  }
  return `${backendOriginForMedia()}/og-image.jpg`
}

/**
 * Resolve one product image URL to an absolute URL suitable for og:image (WhatsApp / crawlers).
 * Matches JavaMellow: API host for relative /media paths; pass-through for absolute http(s).
 */
function absolutizeProductImageForOg(url: string): string {
  const u = (url || '').trim()
  if (!u) return fallbackOgImageUrl()
  if (u.startsWith('https://') || u.startsWith('http://')) return u
  const backend = backendOriginForMedia()
  if (u.startsWith('/media/')) {
    return `${backend}${u}`
  }
  const site = publicSiteOrigin()
  if (u.startsWith('/') && site) {
    return `${site}${u}`
  }
  if (u.startsWith('/')) {
    return `${backend}${u}`
  }
  return `${backend}/${u}`
}

/**
 * Absolute URL for og:image.
 * Prefer flat `product.image` (same as JavaMellow); then first non-placeholder from gallery list.
 */
export function buildProductOgImage(product: Product): string {
  const flat = typeof product.image === 'string' ? product.image.trim() : ''
  if (flat && !isGalleryPlaceholderUrl(flat)) {
    return sameOriginOgImageUrl(absolutizeProductImageForOg(flat))
  }

  for (const cand of getProductBundleImages(product)) {
    if (!cand || isGalleryPlaceholderUrl(cand)) continue
    return sameOriginOgImageUrl(absolutizeProductImageForOg(cand))
  }

  return fallbackOgImageUrl()
}
