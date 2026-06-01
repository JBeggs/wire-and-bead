import type { Product } from '@/lib/types'
import { ensureAbsoluteImageUrl, getProductShareThumbnailRaw } from '@/lib/image-utils'
import { openGraphImageFromMediaUrl, publicSiteOrigin } from '@/lib/product-seo'

export type ProductsPageFilterParams = {
  condition?: string
  category?: string
  featured?: string
  bundle_only?: string
  timed_only?: string
  supplier_slug?: string
  search?: string
  sort?: string
  exclude_tags?: string
  exclude_bundles?: string
  exclude_category?: string
  exclude_featured?: string
  delivery_group?: string
}

export function formatCategorySlug(slug: string): string {
  return String(slug || '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function truthyParam(v?: string): boolean {
  return v === 'true' || v === '1'
}

export function resolveProductsPageTitle(
  params: ProductsPageFilterParams,
  filterCategories: { name: string; slug: string }[],
  activeShelfLabel?: string | null,
): string {
  const isVintage = params.condition === 'vintage'
  const isNew = params.condition === 'new'
  const isFeatured = params.featured === 'true' || truthyParam(params.featured)
  const isBundles = params.bundle_only === 'true' || truthyParam(params.bundle_only)
  const isTimed = params.timed_only === 'true' || truthyParam(params.timed_only)
  const isSupplierGroup = !!params.supplier_slug?.trim()
  const hasCategory = !!params.category?.trim()

  const selectedCategoryLabel = params.category
    ? filterCategories.find((c) => c.slug === params.category)?.name ||
      formatCategorySlug(params.category)
    : undefined

  if (isSupplierGroup) return 'Delivery Group'
  if (isBundles) return 'Bundles'
  if (isTimed) return 'Timed Products'
  if (isVintage) return 'Vintage Treasures'
  if (isNew) return 'New Arrivals'
  if (isFeatured) return 'Featured Products'
  if (hasCategory) return selectedCategoryLabel || params.category || 'Products'
  if (activeShelfLabel?.trim()) return activeShelfLabel.trim()
  return 'All Products'
}

/** Normalise URL params for OG collage fetch (mirrors products list filters). */
export function productsOgFilterParams(params: ProductsPageFilterParams): ProductsPageFilterParams {
  return {
    condition: params.condition,
    category: params.category,
    search: params.search,
    featured: params.featured,
    sort: params.sort,
    bundle_only: params.bundle_only,
    timed_only: params.timed_only,
    supplier_slug: params.supplier_slug,
    exclude_tags: params.exclude_tags,
    exclude_bundles: params.exclude_bundles,
    exclude_category: params.exclude_category,
    exclude_featured: params.exclude_featured,
    delivery_group: params.delivery_group,
  }
}

const DEFAULT_PLACEHOLDER = '/images/products/default.svg'
const MAX_COLLAGE_IMAGES = 4
const MAX_SHARE_PRODUCT_LINES = 12

function isGalleryPlaceholderUrl(url: string): boolean {
  if (!url) return true
  try {
    const pathname = new URL(url, 'https://placeholder.local').pathname
    return pathname === DEFAULT_PLACEHOLDER || pathname.endsWith(DEFAULT_PLACEHOLDER)
  } catch {
    return url === DEFAULT_PLACEHOLDER || url.endsWith(DEFAULT_PLACEHOLDER)
  }
}

/** Backend thumbnail URLs for collage rendering (fetched directly, not via /api/media). */
export function getProductsCollageImageUrls(products: Product[]): string[] {
  const urls: string[] = []
  for (const product of products) {
    if (urls.length >= MAX_COLLAGE_IMAGES) break
    const thumb = getProductShareThumbnailRaw(product)
    if (!thumb || isGalleryPlaceholderUrl(thumb)) continue
    urls.push(ensureAbsoluteImageUrl(thumb))
  }
  return urls
}

/** Proxied thumbnail URLs for WhatsApp share (same pattern as product detail). */
export function buildProductsListShareImageUrls(
  products: Product[],
  siteOrigin?: string | null,
): string[] {
  const urls: string[] = []
  for (const product of products) {
    if (urls.length >= MAX_COLLAGE_IMAGES) break
    const thumb = getProductShareThumbnailRaw(product)
    if (!thumb || isGalleryPlaceholderUrl(thumb)) continue
    urls.push(openGraphImageFromMediaUrl(thumb, siteOrigin))
  }
  return urls
}

function appendOgQueryParam(q: URLSearchParams, key: string, value: string | undefined) {
  if (value != null && value !== '') q.set(key, value)
}

/** Short OG URL — collage is built server-side from shelf query params. */
export function buildProductsPageOgImageUrl(
  title: string,
  params: ProductsPageFilterParams,
  siteOrigin?: string | null,
): string {
  const site = siteOrigin || publicSiteOrigin()
  if (!site) return '/favicon.png'

  const q = new URLSearchParams()
  q.set('title', title)
  appendOgQueryParam(q, 'category', params.category)
  appendOgQueryParam(q, 'condition', params.condition)
  appendOgQueryParam(q, 'featured', params.featured)
  appendOgQueryParam(q, 'bundle_only', params.bundle_only)
  appendOgQueryParam(q, 'timed_only', params.timed_only)
  appendOgQueryParam(q, 'supplier_slug', params.supplier_slug)
  appendOgQueryParam(q, 'search', params.search)
  appendOgQueryParam(q, 'sort', params.sort)
  appendOgQueryParam(q, 'exclude_tags', params.exclude_tags)
  appendOgQueryParam(q, 'exclude_bundles', params.exclude_bundles)
  appendOgQueryParam(q, 'exclude_category', params.exclude_category)
  appendOgQueryParam(q, 'exclude_featured', params.exclude_featured)
  appendOgQueryParam(q, 'delivery_group', params.delivery_group)

  return `${site.replace(/\/$/, '')}/api/og-products?${q.toString()}`
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://3pillars.pythonanywhere.com/api'
const COMPANY_SLUG = process.env.NEXT_PUBLIC_COMPANY_SLUG || 'wire-and-bead'

function unwrapPublicProductList(payload: unknown): Product[] {
  if (Array.isArray(payload)) return payload as Product[]
  if (!payload || typeof payload !== 'object') return []
  const row = payload as { success?: boolean; data?: unknown; results?: unknown }
  if (Array.isArray(row.data)) return row.data as Product[]
  if (Array.isArray(row.results)) return row.results as Product[]
  if (row.data && typeof row.data === 'object') {
    const nested = row.data as { results?: unknown }
    if (Array.isArray(nested.results)) return nested.results as Product[]
  }
  return []
}

/** Fetch up to four products for OG collage (public API, no cookies). */
export async function fetchProductsForOgCollage(
  params: ProductsPageFilterParams,
): Promise<Product[]> {
  const query = new URLSearchParams({
    is_active: 'true',
    page_size: String(MAX_COLLAGE_IMAGES),
  })
  if (params.category?.trim()) query.set('category', params.category.trim())
  if (params.search?.trim()) query.set('search', params.search.trim())
  if (params.condition?.trim()) query.set('condition', params.condition.trim())
  if (params.featured === 'true' || truthyParam(params.featured)) query.set('featured', 'true')
  if (params.exclude_featured === 'true' || truthyParam(params.exclude_featured)) {
    query.set('exclude_featured', 'true')
  }
  if (params.sort?.trim()) query.set('ordering', params.sort.trim())
  if (params.bundle_only === 'true' || truthyParam(params.bundle_only)) query.set('bundle_only', 'true')
  if (params.timed_only === 'true' || truthyParam(params.timed_only)) query.set('timed_only', 'true')
  if (params.exclude_tags?.trim()) query.set('exclude_tags', params.exclude_tags.trim())
  if (params.exclude_bundles === 'true' || truthyParam(params.exclude_bundles)) {
    query.set('exclude_bundles', 'true')
  }
  if (params.exclude_category?.trim()) query.set('exclude_category', params.exclude_category.trim())
  if (params.supplier_slug?.trim()) query.set('supplier_slug', params.supplier_slug.trim())
  if (params.delivery_group?.trim()) query.set('delivery_group', params.delivery_group.trim())

  const url = `${API_BASE_URL.replace(/\/$/, '')}/v1/public/${COMPANY_SLUG}/products/?${query}`

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Company-Slug': COMPANY_SLUG,
      },
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const payload: unknown = await res.json()
    const raw = unwrapPublicProductList(payload)
    return raw
      .filter((p: Product) => p.status !== 'archived')
      .filter((p: Product) => {
        if (!params.supplier_slug?.trim()) return true
        return (
          String((p as Product & { supplier_slug?: string }).supplier_slug || '').toLowerCase() ===
          params.supplier_slug.trim().toLowerCase()
        )
      })
      .slice(0, MAX_COLLAGE_IMAGES)
  } catch {
    return []
  }
}

function formatProductPriceLine(product: Product): string {
  const price = Number(product.price)
  const compare = product.compare_at_price != null ? Number(product.compare_at_price) : null
  const priceText =
    compare != null && compare > price
      ? `R${price.toFixed(2)} (was R${compare.toFixed(2)})`
      : `R${price.toFixed(2)}`
  return `${product.name} — ${priceText}`
}

export function buildProductsWhatsAppMessage(input: {
  title: string
  companyName: string
  pageUrl: string
  products: Product[]
  categories: { name: string; slug: string }[]
}): string {
  const { title, companyName, pageUrl, products, categories } = input
  const productLines = products.slice(0, MAX_SHARE_PRODUCT_LINES).map(formatProductPriceLine)
  const categoryLine = categories.length > 0 ? categories.map((c) => c.name).join(' · ') : ''

  return [
    `${title} — ${companyName}`,
    productLines.length > 0 ? productLines.join('\n') : 'Browse our latest products.',
    pageUrl,
    categoryLine ? `Categories:\n${categoryLine}` : '',
    companyName ? `Love ${companyName}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}
