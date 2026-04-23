'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'
import { resolveMediaUrl, THEME_BLUR_DATA_URL, PLACEHOLDER_ASPECT } from '@/lib/media'
import { Placeholder, type PlaceholderKind } from './placeholders'

type MediaLike =
  | string
  | { url?: string; file_url?: string; media?: { url?: string; file_url?: string } }
  | null
  | undefined

interface SafeImageProps
  extends Omit<ImageProps, 'src' | 'alt' | 'placeholder' | 'blurDataURL'> {
  /** Any media reference (string URL, object, null). Falls back to placeholder. */
  src?: MediaLike
  /** Alt text. Pass an empty string for purely decorative images. */
  alt: string
  /** Which placeholder to render when `src` is missing or fails to load. */
  kind: PlaceholderKind
  /** Display monogram used by the logo placeholder. */
  monogram?: string
  /**
   * Enforce the locked aspect ratio for the kind. Disable when the parent
   * already constrains the element (e.g. an `aspect-square` card slot).
   */
  enforceAspect?: boolean
  className?: string
  /** Extra classes applied directly to the underlying `<Image>`. */
  imgClassName?: string
}

/**
 * Wrapper around `next/image` that:
 *   - resolves mixed media shapes to absolute URLs,
 *   - renders a theme-aware placeholder when no usable src is provided,
 *   - falls back to the same placeholder on load errors,
 *   - applies a subtle blur-up transition without a layout shift.
 *
 * Use `fill` for grid/card slots where the parent controls the box; use
 * explicit `width`/`height` for fixed placements like the header logo.
 */
export default function SafeImage({
  src,
  alt,
  kind,
  monogram,
  enforceAspect = false,
  className,
  imgClassName,
  fill,
  sizes,
  priority,
  quality,
  ...imgProps
}: SafeImageProps) {
  const resolved = resolveMediaUrl(src)
  const [failed, setFailed] = useState(false)
  const showPlaceholder = !resolved || failed

  const aspectStyle = enforceAspect
    ? { aspectRatio: PLACEHOLDER_ASPECT[kind] ?? '1 / 1' }
    : undefined

  return (
    <div
      className={['relative overflow-hidden', className ?? ''].join(' ')}
      style={aspectStyle}
    >
      {showPlaceholder ? (
        <Placeholder kind={kind} label={alt || undefined} monogram={monogram} />
      ) : (
        <Image
          src={resolved!}
          alt={alt}
          onError={() => setFailed(true)}
          placeholder="blur"
          blurDataURL={THEME_BLUR_DATA_URL}
          fill={fill}
          sizes={sizes ?? (fill ? '(max-width: 768px) 100vw, 50vw' : undefined)}
          priority={priority}
          quality={quality}
          className={['object-cover', imgClassName ?? ''].join(' ')}
          {...imgProps}
        />
      )}
    </div>
  )
}
