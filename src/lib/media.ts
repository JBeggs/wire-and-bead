/**
 * Media helpers — thin wrappers over the existing image-utils so SafeImage
 * and components have a single import surface for URL resolution and
 * placeholder blur data URLs.
 */

import { ensureAbsoluteImageUrl, extractImageUrl } from './image-utils'

/**
 * Resolve any media reference (string, `{url}`, `{file_url}`, `{media}`) to
 * an absolute URL suitable for `<Image src>`. Returns `null` if nothing
 * resolvable was provided.
 */
export function resolveMediaUrl(
  v: string | { url?: string; file_url?: string; media?: { url?: string; file_url?: string } } | null | undefined,
): string | null {
  const raw = extractImageUrl(v)
  if (!raw) return null
  return ensureAbsoluteImageUrl(raw)
}

/**
 * Tiny 1x1 SVG painted with the current theme's bg variable for use as
 * `next/image`'s `blurDataURL`. Kept intentionally minimal so it inlines
 * with a short data URI and doesn't block rendering.
 */
export const THEME_BLUR_DATA_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="rgb(232,221,201)"/></svg>',
  )

/** Aspect ratios locked per placeholder kind. See PLAN-01 "Image Placeholders". */
export const PLACEHOLDER_ASPECT: Record<string, string> = {
  logo: '1 / 1',
  hero: '16 / 9',
  gallery: '1 / 1',
  avatar: '1 / 1',
  category: '4 / 3',
  'product-square': '1 / 1',
  'product-landscape': '4 / 3',
}
