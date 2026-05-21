/**
 * Image URL utilities for resolving product/media URLs.
 * Ensures backend media URLs (e.g. /media/...) are resolved to the correct origin
 * when the frontend is served from a different domain (e.g. Vercel).
 */

import { proxyMediaUrl } from '@/lib/media-proxy'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://3pillars.pythonanywhere.com/api'

/** Intrinsic dimensions for Lighthouse (CSS layout unchanged). */
export const IMAGE_DIM = {
  productCard: { width: 400, height: 400 },
  cartThumb: { width: 96, height: 96 },
  articleCard: { width: 800, height: 450 },
  galleryThumb: { width: 120, height: 120 },
  galleryMain: { width: 1200, height: 1200 },
} as const

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
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url
  if (url.startsWith('/media/')) {
    return getBackendOrigin() + url
  }
  if (url.startsWith('/')) return url
  return `/images/products/${url}`
}

/** Absolute URL for <img src> — proxied through /api/media when from Django /media/. */
export function getPublicImageUrl(url: string): string {
  if (!url) return DEFAULT_PLACEHOLDER
  return proxyMediaUrl(ensureAbsoluteImageUrl(url))
}

function finalizeDisplayUrl(url: string): string {
  if (!url || url === DEFAULT_PLACEHOLDER) return url
  return getPublicImageUrl(url)
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

/** Insert `-thumb` before the file extension (matches backend thumb_path_for). */
export function deriveThumbUrlFromFull(url: string): string {
  const raw = (url || '').trim()
  if (!raw) return ''
  const qIdx = raw.indexOf('?')
  const base = qIdx >= 0 ? raw.slice(0, qIdx) : raw
  const query = qIdx >= 0 ? raw.slice(qIdx) : ''
  const slash = base.lastIndexOf('/')
  const head = slash >= 0 ? base.slice(0, slash + 1) : ''
  const name = slash >= 0 ? base.slice(slash + 1) : base
  const dot = name.lastIndexOf('.')
  if (dot <= 0) {
    if (name.endsWith('-thumb')) return raw
    return `${head}${name}-thumb${query}`
  }
  const stem = name.slice(0, dot)
  const ext = name.slice(dot)
  if (stem.endsWith('-thumb')) return raw
  return `${head}${stem}-thumb${ext}${query}`
}

/** Prefer thumbnail URL for card/small views; fall back to full image. */
export function resolveCardImageUrl(full?: string | null, thumbnail?: string | null): string {
  const thumb = (thumbnail || '').trim()
  if (thumb) return ensureAbsoluteImageUrl(thumb)
  const fullUrl = (full || '').trim()
  if (fullUrl) return ensureAbsoluteImageUrl(fullUrl)
  return DEFAULT_PLACEHOLDER
}

type ProductCardLike = ProductLike & {
  image_thumbnail?: string | null
  image_thumbnails?: string[] | null
}

/** Card/grid product images — prefer API thumbnail fields, else full images. */
export function getProductCardImages(product: ProductCardLike): string[] {
  if (!product) return [DEFAULT_PLACEHOLDER]
  const apiThumbs = Array.isArray(product.image_thumbnails)
    ? product.image_thumbnails.filter((u): u is string => typeof u === 'string' && !!u.trim())
    : []
  if (apiThumbs.length > 0) {
    return apiThumbs.map((u) => finalizeDisplayUrl(u)).slice(0, MAX_BUNDLE_PRODUCT_IMAGES)
  }
  const mainThumb = (product.image_thumbnail || '').trim()
  if (mainThumb) return [finalizeDisplayUrl(mainThumb)]
  return getProductBundleImages(product).map(finalizeDisplayUrl)
}

/**
 * Thumbnail strip URLs aligned with getProductBundleImages() order (product detail gallery).
 * Prefers API image_thumbnails (same order as full images); falls back per index.
 */
export function getProductGalleryThumbImages(
  fullImages: string[],
  product: ProductCardLike | null | undefined,
): string[] {
  if (!fullImages.length) return []
  const apiThumbs = Array.isArray(product?.image_thumbnails)
    ? product.image_thumbnails
        .filter((u): u is string => typeof u === 'string' && !!u.trim())
        .map((u) => ensureAbsoluteImageUrl(u.trim()))
    : []
  const mainThumb = (product?.image_thumbnail || '').trim()

  if (apiThumbs.length === fullImages.length) {
    return apiThumbs
  }

  return fullImages.map((full, index) => {
    const fromApi = apiThumbs[index]
    if (fromApi) return finalizeDisplayUrl(fromApi)
    if (index === 0 && mainThumb) return finalizeDisplayUrl(mainThumb)
    const derived = deriveThumbUrlFromFull(full)
    if (derived && derived !== full) return finalizeDisplayUrl(derived)
    return finalizeDisplayUrl(full)
  })
}

function pickArticleCardImageRaw(article?: {
  social_image?: { file_url?: string | null; thumbnail_url?: string | null } | null
  featured_media?: { file_url?: string | null; thumbnail_url?: string | null } | null
} | null): string | null {
  for (const media of [article?.social_image, article?.featured_media]) {
    const thumb = media?.thumbnail_url?.trim()
    if (thumb) return thumb
  }
  return pickArticleShareImageRaw(article || undefined)
}

/** Article listing/card image — prefers thumbnail when available. */
export function getArticleCardImageUrl(
  article?: {
    social_image?: { file_url?: string | null; thumbnail_url?: string | null } | null
    featured_media?: { file_url?: string | null; thumbnail_url?: string | null } | null
  } | null,
): string {
  const raw = pickArticleCardImageRaw(article || undefined)
  if (raw) return finalizeDisplayUrl(raw)
  return ARTICLE_IMAGE_PLACEHOLDER
}

/** Article detail hero — thumb when API provides it, else full; proxied for cache. */
export function getArticleHeroImageUrl(
  article?: {
    social_image?: { file_url?: string | null; thumbnail_url?: string | null } | null
    featured_media?: { file_url?: string | null; thumbnail_url?: string | null } | null
  } | null,
): string {
  return getArticleCardImageUrl(article)
}

/** Small logo in cards and headers. */
export function getLogoCardUrl(
  logo?: { file_url?: string | null; thumbnail_url?: string | null } | null,
  logoUrl?: string | null,
): string {
  const fromObj = resolveCardImageUrl(logo?.file_url, logo?.thumbnail_url)
  if (fromObj !== DEFAULT_PLACEHOLDER) return finalizeDisplayUrl(fromObj)
  const direct = (logoUrl || '').trim()
  if (direct) return finalizeDisplayUrl(direct)
  return DEFAULT_PLACEHOLDER
}

/** Profile avatar for nav, lists, and comments. */
export function getAvatarCardUrl(
  profile?: { avatar_url?: string | null; avatar_thumbnail_url?: string | null } | null,
): string {
  const url = resolveCardImageUrl(profile?.avatar_url, profile?.avatar_thumbnail_url)
  return url === DEFAULT_PLACEHOLDER ? '' : url
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

