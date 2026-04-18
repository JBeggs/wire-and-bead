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

const DEFAULT_GALLERY_PLACEHOLDER = '/images/products/default.svg'

/** Public site origin (https, no trailing slash). Used for absolute OG URLs and optional og:url. */
export function publicSiteOrigin(): string | null {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '')
  if (raw) return raw
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  }
  return null
}

function backendOriginForMedia(): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://3pillars.pythonanywhere.com/api'
  return apiBase.replace(/\/api\/?$/, '').replace(/\/$/, '') || 'https://3pillars.pythonanywhere.com'
}

/**
 * Force absolute https URL for og:image. Relative paths (e.g. /images/...) break WhatsApp,
 * which then falls back to the site favicon.
 */
export function absolutizeSocialImageUrl(url: string): string {
  if (!url) return fallbackOgImageUrl()
  if (url.startsWith('https://')) return url
  if (url.startsWith('http://')) return url
  if (url.startsWith('/media/')) {
    return `${backendOriginForMedia()}${url}`
  }
  const site = publicSiteOrigin()
  if (url.startsWith('/') && site) {
    return `${site}${url}`
  }
  if (url.startsWith('/')) {
    return `${backendOriginForMedia()}${url}`
  }
  return url
}

function fallbackOgImageUrl(): string {
  const site = publicSiteOrigin()
  if (site) {
    return `${site}/past-and-present-logo.png`
  }
  return `${backendOriginForMedia()}/og-image.jpg`
}

/**
 * Absolute HTTPS URL for og:image (WhatsApp / social crawlers require absolute URLs).
 * Uses the same image list as the product gallery (image + images[]), not only `image`.
 */
export function buildProductOgImage(product: Product): string {
  const urls = getProductBundleImages(product).filter(
    (u) => u && !u.includes(DEFAULT_GALLERY_PLACEHOLDER),
  )
  const raw = urls[0] || ''
  if (!raw) {
    return fallbackOgImageUrl()
  }
  return absolutizeSocialImageUrl(raw)
}
