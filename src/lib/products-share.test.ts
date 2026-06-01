import { describe, expect, it } from 'vitest'
import type { Product } from '@/lib/types'
import {
  buildProductsListShareImageUrls,
  buildProductsPageOgImageUrl,
  buildProductsWhatsAppMessage,
  getProductsCollageImageUrls,
  resolveProductsPageTitle,
} from '@/lib/products-share'

const baseProduct = (overrides: Partial<Product> = {}): Product =>
  ({
    id: '1',
    name: 'Test Product',
    slug: 'test-product',
    price: '99.00',
    image: '/media/products/a.jpg',
    status: 'active',
    ...overrides,
  }) as Product

describe('resolveProductsPageTitle', () => {
  it('uses category label when category filter is set', () => {
    expect(
      resolveProductsPageTitle(
        { category: 'bead-supplies' },
        [{ name: 'Bead Supplies', slug: 'bead-supplies' }],
      ),
    ).toBe('Bead Supplies')
  })

  it('uses active shelf label when no other filter matches', () => {
    expect(resolveProductsPageTitle({}, [], 'Wire Essentials')).toBe('Wire Essentials')
  })

  it('falls back to All Products', () => {
    expect(resolveProductsPageTitle({}, [])).toBe('All Products')
  })
})

describe('getProductsCollageImageUrls', () => {
  it('collects up to four product thumbnail URLs', () => {
    const products = [
      baseProduct({ id: '1', image_thumbnail: '/media/products/1-thumb.jpg' }),
      baseProduct({ id: '2', image_thumbnail: '/media/products/2-thumb.jpg' }),
      baseProduct({ id: '3', image: '/images/products/default.svg' }),
    ]
    const urls = getProductsCollageImageUrls(products)
    expect(urls).toHaveLength(2)
    expect(urls[0]).toMatch(/^https?:\/\//)
  })
})

describe('buildProductsWhatsAppMessage', () => {
  it('includes products, url, and categories at the bottom', () => {
    const msg = buildProductsWhatsAppMessage({
      title: 'Bead Supplies',
      companyName: 'Wire and Bead',
      pageUrl: 'https://wire-and-bead.vercel.app/products?category=bead-supplies',
      products: [baseProduct({ name: 'Copper Wire', price: '120.00' })],
      categories: [
        { name: 'Bead Supplies', slug: 'bead-supplies' },
        { name: 'Findings', slug: 'findings' },
      ],
    })
    expect(msg).toContain('Bead Supplies — Wire and Bead')
    expect(msg).toContain('Copper Wire — R120.00')
    expect(msg).toContain('https://wire-and-bead.vercel.app/products?category=bead-supplies')
    expect(msg).toContain('Categories:')
    expect(msg).toContain('Bead Supplies · Findings')
  })
})

describe('buildProductsListShareImageUrls', () => {
  it('returns proxied thumbnail URLs on the site origin', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://wire-and-bead.vercel.app'
    const urls = buildProductsListShareImageUrls([
      baseProduct({ image_thumbnail: '/media/products/a-thumb.jpg' }),
    ])
    expect(urls).toHaveLength(1)
    expect(urls[0]).toContain('wire-and-bead.vercel.app')
    expect(urls[0]).toContain('/api/media?src=')
  })
})

describe('buildProductsPageOgImageUrl', () => {
  it('points at og-products API with shelf params', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://wire-and-bead.vercel.app'
    const url = buildProductsPageOgImageUrl('Bead Supplies', {
      category: 'bead-supplies',
    })
    expect(url).toContain('/api/og-products?')
    expect(url).toContain('title=Bead')
    expect(url).toContain('category=bead-supplies')
    expect(url).not.toContain('img=')
  })
})
