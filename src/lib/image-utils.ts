/**
 * Image URL utilities for resolving product/media URLs.
 * Ensures backend media URLs (e.g. /media/...) are resolved to the correct origin
 * when the frontend is served from a different domain (e.g. Vercel).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://3pillars.pythonanywhere.com/api'

const DEFAULT_PLACEHOLDER = '/images/products/default.svg'

/**
 * Get the backend origin (base URL without /api) for resolving media paths.
 */
function getBackendOrigin(): string {
  try {
    const url = new URL(API_BASE_URL)
    return `${url.protocol}//${url.host}`
  } catch {
    return 'https://3pillars.pythonanywhere.com'
  }
}

/**
 * Extract URL from string or object { url?, file_url?, media?: { url?, file_url? } } (API may return various shapes).
 */
export function extractImageUrl(v: string | { url?: string; file_url?: string; media?: { url?: string; file_url?: string } } | null | undefined): string | null {
  if (!v) return null
  if (typeof v === 'string' && v) return v
  if (typeof v === 'object' && v) {
    const obj = v as Record<string, unknown>
    let u: unknown = obj.url ?? obj.file_url
    if (u == null && obj.media && typeof obj.media === 'object') {
      const media = obj.media as Record<string, unknown>
      u = media.url ?? media.file_url
    }
    if (typeof u === 'string' && u) return u
  }
  return null
}

/**
 * Resolve a product or media image URL to an absolute URL that will load correctly.
 * Handles:
 * - Full URLs (http/https): returned as-is
 * - Backend media paths (/media/...): prefixed with backend origin
 * - Empty/invalid: returns default placeholder
 */
export function ensureAbsoluteImageUrl(url: string): string {
  if (!url) return DEFAULT_PLACEHOLDER
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/media/')) {
    return getBackendOrigin() + url
  }
  if (url.startsWith('/')) return url
  return `/images/products/${url}`
}

/** Accepts Product, API product shape, or minimal { image?, images? } for preview extraction. */
type ProductLike = {
  image?: string
  images?: Array<string | { url?: string; file_url?: string } | { media?: { url?: string; file_url?: string } }>
  bundle_product_ids?: string[]
  is_bundle?: boolean
  bundle_product_details?: Array<{
    image?: string | { url?: string; file_url?: string }
    images?: Array<string | { url?: string; file_url?: string }>
  }>
} | null | undefined

/** Max URLs from parent `image` + `images` for bundles (matches what sync uploads to the API). */
export const MAX_BUNDLE_PRODUCT_IMAGES = 32

/**
 * Get all image URLs for a product for preview grids (product card, gallery, cart, checkout).
 * For bundles: use the bundle product's own image + images only (parent media). Do not use child bundle_product_details.
 * For non-bundles: product.image + product.images
 * All URLs are resolved to absolute form. Deduped. Capped at MAX_BUNDLE_PRODUCT_IMAGES.
 */
export function getProductBundleImages(product: ProductLike): string[] {
  if (!product) return [DEFAULT_PLACEHOLDER]

  const seen = new Set<string>()
  const add = (url: string) => {
    if (url && !seen.has(url)) {
      seen.add(url)
      return true
    }
    return false
  }

  const result: string[] = []
  const main = typeof product.image === 'string' ? product.image : ''
  if (main && add(main)) result.push(ensureAbsoluteImageUrl(main))

  const rawImages = Array.isArray(product.images) ? product.images : []
  rawImages.forEach((img) => {
    const u = extractImageUrl(img)
    if (u && add(u)) result.push(ensureAbsoluteImageUrl(u))
  })

  const out = result.length > 0 ? result : [DEFAULT_PLACEHOLDER]
  return out.slice(0, MAX_BUNDLE_PRODUCT_IMAGES)
}

/** Placeholder when an article has no featured/social image. */
export const ARTICLE_IMAGE_PLACEHOLDER = DEFAULT_PLACEHOLDER

function pickArticleShareImageRaw(article?: {
  social_image?: { file_url?: string | null } | null
  featured_media?: { file_url?: string | null } | null
} | null): string | null {
  const social = article?.social_image?.file_url?.trim()
  if (social) return social
  const featured = article?.featured_media?.file_url?.trim()
  if (featured) return featured
  return null
}

/** Image URL for article cards/heroes (social image, featured media, or placeholder). */
export function getArticleImageUrl(
  article?: {
    social_image?: { file_url?: string | null } | null
    featured_media?: { file_url?: string | null } | null
  } | null,
): string {
  const raw = pickArticleShareImageRaw(article || undefined)
  if (raw) return ensureAbsoluteImageUrl(raw)
  return ARTICLE_IMAGE_PLACEHOLDER
}

/** Absolute Open Graph image URLs for article metadata. */
export function getArticleOpenGraphImageUrls(
  article?: {
    social_image?: { file_url?: string | null } | null
    featured_media?: { file_url?: string | null } | null
  } | null,
): string[] {
  const raw = pickArticleShareImageRaw(article || undefined)
  if (raw) {
    return [ensureAbsoluteImageUrl(raw)]
  }
  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
  if (site) {
    return [`${site}${ARTICLE_IMAGE_PLACEHOLDER}`]
  }
  return []
}

