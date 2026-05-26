import { describe, expect, it } from 'vitest'
import { buildProductShareMediaPath, buildProductOgImage } from '@/lib/product-seo'
import { resolveShareImageFetchUrl } from '@/lib/share-with-image'
import type { Product } from '@/lib/types'

const thumb =
  'https://3pillars.pythonanywhere.com/media/companies/x/products/y-thumb.jpg'

describe('buildProductShareMediaPath', () => {
  it('returns relative /api/media path, not absolute deployment URL', () => {
    const path = buildProductShareMediaPath({
      image_thumbnail: thumb,
    } as Product)
    expect(path).toMatch(/^\/api\/media\?src=/)
    expect(path).not.toMatch(/^https?:\/\//)
  })

  it('buildProductOgImage uses request site origin for metadata', () => {
    const url = buildProductOgImage({ image_thumbnail: thumb } as Product, 'https://wire-and-bead.vercel.app')
    expect(url).toContain('https://wire-and-bead.vercel.app/api/media?src=')
    expect(url).not.toContain('bwu8z8rka')
  })
})

describe('resolveShareImageFetchUrl', () => {
  it('rewrites absolute deployment URL to current origin path', () => {
    const resolved = resolveShareImageFetchUrl(
      'https://wire-and-bead-bwu8z8rka-jbeggs-projects.vercel.app/api/media?src=https%3A%2F%2F3pillars.pythonanywhere.com%2Fmedia%2Fa.jpg',
    )
    expect(resolved).toContain('/api/media?src=')
    expect(resolved).not.toContain('bwu8z8rka')
    expect(resolved.startsWith('http://localhost')).toBe(true)
  })
})
