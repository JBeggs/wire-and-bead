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

function sameOriginOgImageUrl(directImageUrl: string, siteOrigin?: string | null): string {
  return absoluteProxyMediaUrl(directImageUrl, siteOrigin)
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

function fallbackOgImagePath(): string {
  return '/api/og-default'
}

function fallbackOgImageUrl(siteOrigin?: string | null): string {
  const site = siteOrigin || publicSiteOrigin()
  if (site) {
    return `${site.replace(/\/$/, '')}${fallbackOgImagePath()}`
  }
  return `${backendOriginForMedia()}/og-image.jpg`
}

function absolutizeProductImageForOg(url: string): string {
  const u = (url || '').trim()
  if (!u) return ''
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
  const site = (siteOrigin || publicSiteOrigin() || '').replace(/\/$/, '')
  if (proxiedOrAbsolute.startsWith('/')) {
    return site ? `${site}${proxiedOrAbsolute}` : proxiedOrAbsolute
  }
  if (
    site &&
    (proxiedOrAbsolute.startsWith('http://') || proxiedOrAbsolute.startsWith('https://'))
  ) {
    try {
      const parsed = new URL(proxiedOrAbsolute)
      if (parsed.pathname.startsWith('/api/media') || parsed.pathname.startsWith('/api/og-default')) {
        return `${site}${parsed.pathname}${parsed.search}`
      }
    } catch {
      /* keep original */
    }
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
    sameOriginOgImageUrl(absolutizeProductImageForOg(u), siteOrigin),
    siteOrigin,
  )
}

/**
 * Same-origin relative path for WhatsApp share fetch (always use window.location.origin client-side).
 */
export function buildProductShareMediaPath(product: Product): string {
  const thumb = getProductShareThumbnailRaw(product)
  if (!thumb || isGalleryPlaceholderUrl(thumb)) {
    return fallbackOgImagePath()
  }
  const backend = absolutizeProductImageForOg(thumb)
  if (!backend.startsWith('http://') && !backend.startsWith('https://')) {
    return fallbackOgImagePath()
  }
  return `/api/media?src=${encodeURIComponent(backend)}`
}

/** Absolute URL for og:image — prefers product thumbnail, then full image. */
export function buildProductOgImage(product: Product, siteOrigin?: string | null): string {
  return absolutizeShareImageUrl(buildProductShareMediaPath(product), siteOrigin)
}

/** @deprecated Use buildProductShareMediaPath + window.location.origin on the client. */
export function buildProductShareImageUrl(product: Product, siteOrigin?: string | null): string {
  return buildProductOgImage(product, siteOrigin)
}
