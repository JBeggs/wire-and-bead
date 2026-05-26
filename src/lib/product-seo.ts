import type { Product } from '@/lib/types'
import { getProductShareThumbnailRaw } from '@/lib/image-utils'
import { absoluteProxyMediaUrl } from '@/lib/media-proxy'

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

/**
 * WhatsApp/link previews often work more reliably when og:image is served from the
 * same host as the page. Proxy API /media/* through /api/media on the storefront.
 */
function sameOriginOgImageUrl(directImageUrl: string): string {
  return absoluteProxyMediaUrl(directImageUrl)
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

function fallbackOgImageUrl(siteOrigin?: string | null): string {
  const site = siteOrigin || publicSiteOrigin()
  if (site) {
    return `${site.replace(/\/$/, '')}/api/og-default`
  }
  return `${backendOriginForMedia()}/og-image.jpg`
}

/**
 * Resolve one product image URL to an absolute URL suitable for og:image (WhatsApp / crawlers).
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

function absolutizeShareImageUrl(proxiedOrAbsolute: string, siteOrigin?: string | null): string {
  if (proxiedOrAbsolute.startsWith('http://') || proxiedOrAbsolute.startsWith('https://')) {
    return proxiedOrAbsolute
  }
  const site = siteOrigin || publicSiteOrigin()
  if (site && proxiedOrAbsolute.startsWith('/')) {
    return `${site.replace(/\/$/, '')}${proxiedOrAbsolute}`
  }
  return proxiedOrAbsolute
}

/** Absolute og:image URL for any media URL (article featured/social images, etc.). */
export function openGraphImageFromMediaUrl(
  url: string | null | undefined,
  siteOrigin?: string | null,
): string {
  const u = (url || '').trim()
  if (!u) return fallbackOgImageUrl(siteOrigin)
  return absolutizeShareImageUrl(
    sameOriginOgImageUrl(absolutizeProductImageForOg(u)),
    siteOrigin,
  )
}

/**
 * Absolute URL for og:image — prefers product thumbnail, then full image.
 */
export function buildProductOgImage(product: Product, siteOrigin?: string | null): string {
  const thumb = getProductShareThumbnailRaw(product)
  if (thumb && !isGalleryPlaceholderUrl(thumb)) {
    return openGraphImageFromMediaUrl(thumb, siteOrigin)
  }
  return fallbackOgImageUrl(siteOrigin)
}

/** Same thumbnail URL used for og:image and WhatsApp file share. */
export function buildProductShareImageUrl(product: Product, siteOrigin?: string | null): string {
  return buildProductOgImage(product, siteOrigin)
}
