/**
 * Open Graph image for the products listing — collage of up to four product photos,
 * or the branded default when no images are available.
 */

import { ImageResponse } from 'next/og'
import { fetchProxiedMedia } from '@/lib/fetch-proxied-media'
import { parseAllowedMediaSrc } from '@/lib/media-proxy'
import {
  fetchProductsForOgCollage,
  getProductsCollageImageUrls,
  type ProductsPageFilterParams,
} from '@/lib/products-share'
import { getSiteSettingsMap, coerceSiteString } from '@/lib/site-settings'

export const runtime = 'nodejs'

const OG_SIZE = { width: 1200, height: 630 }

async function loadImageDataUrl(mediaUrl: string): Promise<string | null> {
  let upstreamUrl = mediaUrl
  try {
    const parsed = new URL(mediaUrl)
    if (
      parsed.pathname.endsWith('/api/media') ||
      parsed.pathname.endsWith('/api/og-proxy')
    ) {
      const src = parsed.searchParams.get('src')
      if (src) upstreamUrl = src
    }
  } catch {
    /* use mediaUrl as-is */
  }

  const upstream = parseAllowedMediaSrc(upstreamUrl)
  if (!upstream) return null
  try {
    const res = await fetchProxiedMedia(upstream)
    if (res.status !== 200) return null
    const contentType = res.headers.get('Content-Type') || 'image/jpeg'
    const buf = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return `data:${contentType};base64,${btoa(binary)}`
  } catch {
    return null
  }
}

function collageLayout(count: number): Array<{ left: number; top: number; width: number; height: number }> {
  if (count === 1) return [{ left: 0, top: 0, width: 1200, height: 630 }]
  if (count === 2) {
    return [
      { left: 0, top: 0, width: 600, height: 630 },
      { left: 600, top: 0, width: 600, height: 630 },
    ]
  }
  if (count === 3) {
    return [
      { left: 0, top: 0, width: 600, height: 630 },
      { left: 600, top: 0, width: 600, height: 315 },
      { left: 600, top: 315, width: 600, height: 315 },
    ]
  }
  return [
    { left: 0, top: 0, width: 600, height: 315 },
    { left: 600, top: 0, width: 600, height: 315 },
    { left: 0, top: 315, width: 600, height: 315 },
    { left: 600, top: 315, width: 600, height: 315 },
  ]
}

function companyMonogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
  }
  return (name.trim().slice(0, 2) || 'WB').toUpperCase()
}

async function brandedFallbackImage() {
  const settings = await getSiteSettingsMap()
  const siteName = coerceSiteString(settings.site_name) || 'Wire and Bead'
  const tagline = coerceSiteString(settings.site_tagline) || 'Handcrafted jewellery supplies'
  const monogram = companyMonogram(siteName)

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6B4423 0%, #C4A574 50%, #8B6914 100%)',
          color: '#fff',
          fontFamily: 'Georgia, serif',
          padding: 80,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 180, fontWeight: 700, lineHeight: 1, letterSpacing: -4 }}>
          {monogram}
        </div>
        <div style={{ marginTop: 40, fontSize: 56, fontWeight: 600 }}>{siteName}</div>
        {tagline ? (
          <div style={{ marginTop: 16, fontSize: 28, opacity: 0.9, textTransform: 'uppercase' }}>
            {tagline}
          </div>
        ) : null}
      </div>
    ),
    { ...OG_SIZE },
  )
}

function parseOgParams(searchParams: URLSearchParams): ProductsPageFilterParams {
  return {
    category: searchParams.get('category') || undefined,
    condition: searchParams.get('condition') || undefined,
    featured: searchParams.get('featured') || undefined,
    bundle_only: searchParams.get('bundle_only') || undefined,
    timed_only: searchParams.get('timed_only') || undefined,
    supplier_slug: searchParams.get('supplier_slug') || undefined,
    search: searchParams.get('search') || undefined,
    sort: searchParams.get('sort') || undefined,
    exclude_tags: searchParams.get('exclude_tags') || undefined,
    exclude_bundles: searchParams.get('exclude_bundles') || undefined,
    exclude_category: searchParams.get('exclude_category') || undefined,
    exclude_featured: searchParams.get('exclude_featured') || undefined,
    delivery_group: searchParams.get('delivery_group') || undefined,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = (searchParams.get('title') || 'Products').slice(0, 120)
  const filterParams = parseOgParams(searchParams)
  const legacyImgParams = searchParams.getAll('img').slice(0, 4)

  const products = await fetchProductsForOgCollage(filterParams)
  const mediaUrls = [...getProductsCollageImageUrls(products), ...legacyImgParams].slice(0, 4)

  const loaded: string[] = []
  for (const url of mediaUrls) {
    const src = await loadImageDataUrl(url)
    if (src) loaded.push(src)
  }

  if (loaded.length === 0) {
    return brandedFallbackImage()
  }

  const slots = collageLayout(loaded.length)

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#1a1a1a',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%', height: '100%', position: 'relative' }}>
          {loaded.map((src, index) => {
            const slot = slots[index]
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={index}
                src={src}
                alt=""
                style={{
                  position: 'absolute',
                  left: slot.left,
                  top: slot.top,
                  width: slot.width,
                  height: slot.height,
                  objectFit: 'cover',
                }}
              />
            )
          })}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '28px 48px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.82))',
          }}
        >
          <div
            style={{
              color: '#fff',
              fontSize: 52,
              fontWeight: 700,
              fontFamily: 'Georgia, serif',
              textAlign: 'center',
              lineHeight: 1.15,
              textShadow: '0 2px 12px rgba(0,0,0,0.5)',
            }}
          >
            {title}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  )
}
