import Link from 'next/link'
import { serverEcommerceApi } from '@/lib/api-server'
export const dynamic = 'force-dynamic'
import { Product } from '@/lib/types'
import {
  Clock,
  Sparkles,
  Filter,
  Search,
  Star,
  Package,
  TimerReset,
  Truck,
  Wrench,
  ShoppingBasket,
  Tag,
} from 'lucide-react'
import { Suspense } from 'react'
import ProductsSortSelect from '@/components/products/ProductsSortSelect'
import AdminActions from '@/components/products/AdminActions'
import ProductCard from '@/components/products/ProductCard'
import PaginationNav from '@/components/ui/PaginationNav'
import {
  CATEGORY_SHELF_EXCLUDE_TAGS,
  CONSUMABLES_CATEGORY_SLUG,
  HARDWARE_CATEGORY_SLUG,
  NEW_LISTING_EXCLUDED_CATEGORY_SLUGS,
} from '@/lib/store-shelves'
import {
  unwrapEcommerceList,
  unwrapEcommerceProductList,
  sanitizeListPage,
} from '@/lib/ecommerce-list'

type StorefrontCategory = { id: string; name: string; slug: string }

async function getStorefrontCategories(): Promise<StorefrontCategory[]> {
  try {
    const res = await serverEcommerceApi.categories.list()
    const rows = unwrapEcommerceList<{ id: string; name: string; slug?: string | null }>(res)
    const reserved = new Set([HARDWARE_CATEGORY_SLUG, CONSUMABLES_CATEGORY_SLUG])
    return rows
      .filter((c) => c.slug && c.name && !reserved.has(String(c.slug).toLowerCase()))
      .map((c) => ({ id: String(c.id), name: c.name, slug: String(c.slug) }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  } catch (error) {
    console.error('Error fetching storefront categories:', error)
    return []
  }
}

interface ProductsPageProps {
  searchParams: Promise<{
    condition?: string
    category?: string
    search?: string
    page?: string | string[]
    featured?: string
    sort?: string
    bundle_only?: string
    timed_only?: string
    exclude_tags?: string
    exclude_bundles?: string
    supplier_slug?: string
    delivery_group?: string
  }>
}

async function getProducts(params: {
  condition?: string
  category?: string
  search?: string
  page?: string | string[]
  featured?: string
  sort?: string
  bundle_only?: string
  timed_only?: string
  exclude_tags?: string
  exclude_bundles?: string
  supplier_slug?: string
  delivery_group?: string
}) {
  try {
    const isHardwareShelf = params.category === HARDWARE_CATEGORY_SLUG
    const isConsumablesShelf = params.category === CONSUMABLES_CATEGORY_SLUG
    const excludeTagsForApi =
      isHardwareShelf || isConsumablesShelf
        ? (params.exclude_tags?.trim() ? params.exclude_tags : CATEGORY_SHELF_EXCLUDE_TAGS)
        : params.exclude_tags || undefined

    const page = sanitizeListPage(params.page)

    const listArgs = {
      is_active: true,
      category: params.category,
      search: params.search,
      condition: params.condition,
      featured: params.featured === 'true' ? true : undefined,
      /** Matches home rails: vintage & new pools exclude already-featured items. */
      exclude_featured:
        params.condition === 'vintage' || params.condition === 'new' ? true : undefined,
      page,
      page_size: 24,
      ordering: params.sort || undefined,
      bundle_only: params.bundle_only === 'true' ? 'true' : undefined,
      timed_only: params.timed_only === 'true' ? 'true' : undefined,
      exclude_tags: excludeTagsForApi,
      exclude_bundles:
        isHardwareShelf ||
        isConsumablesShelf ||
        params.condition === 'new' ||
        params.exclude_bundles === 'true'
          ? 'true'
          : undefined,
      exclude_category:
        params.condition === 'new' ? NEW_LISTING_EXCLUDED_CATEGORY_SLUGS : undefined,
      supplier_slug: params.supplier_slug || undefined,
    }

    let response = await serverEcommerceApi.products.list(listArgs)
    let raw = unwrapEcommerceProductList(response) as Product[]

    if (raw.length === 0 && page > 1) {
      response = await serverEcommerceApi.products.list({ ...listArgs, page: 1 })
      raw = unwrapEcommerceProductList(response) as Product[]
    }

    const products = raw
      .filter((p: Product) => p && typeof p === 'object' && p.status !== 'archived')
      .filter((p: any) => {
        if (!params.supplier_slug) return true
        return String(p.supplier_slug || '').toLowerCase() === params.supplier_slug.toLowerCase()
      })
    const pagination =
      response && typeof response === 'object' && !Array.isArray(response)
        ? (response as { pagination?: Record<string, unknown> }).pagination
        : undefined

    return {
      products,
      pagination: pagination
        ? {
            page: Number(pagination.page) || 1,
            totalPages: Number(pagination.totalPages) || 1,
            total: Number(pagination.total) || products.length,
          }
        : { page: 1, totalPages: 1, total: products.length },
    }
  } catch (error) {
    console.error('Error fetching products:', error)
    return { products: [], pagination: { page: 1, totalPages: 1, total: 0 } }
  }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams
  const [{ products, pagination }, categories] = await Promise.all([
    getProducts(params),
    getStorefrontCategories(),
  ])
  const isVintage = params.condition === 'vintage'
  const isNew = params.condition === 'new'
  const isFeatured = params.featured === 'true'
  const isBundles = params.bundle_only === 'true'
  const isTimed = params.timed_only === 'true'
  const isSupplierGroup = !!params.supplier_slug
  const isHardwareCategory = params.category === HARDWARE_CATEGORY_SLUG
  const isConsumablesCategory = params.category === CONSUMABLES_CATEGORY_SLUG

  const searchParamsForNav: Record<string, string> = {}
  if (params.condition) searchParamsForNav.condition = params.condition
  if (params.category) searchParamsForNav.category = params.category
  if (params.search) searchParamsForNav.search = params.search
  if (params.featured) searchParamsForNav.featured = params.featured
  if (params.sort) searchParamsForNav.sort = params.sort
  if (params.bundle_only) searchParamsForNav.bundle_only = params.bundle_only
  if (params.timed_only) searchParamsForNav.timed_only = params.timed_only
  if (params.exclude_tags?.trim()) searchParamsForNav.exclude_tags = params.exclude_tags
  if (isHardwareCategory || isConsumablesCategory) {
    searchParamsForNav.exclude_tags =
      params.exclude_tags?.trim() || CATEGORY_SHELF_EXCLUDE_TAGS
  }
  if (
    isHardwareCategory ||
    isConsumablesCategory ||
    params.condition === 'new' ||
    params.exclude_bundles === 'true'
  ) {
    searchParamsForNav.exclude_bundles = 'true'
  }
  if (params.supplier_slug) searchParamsForNav.supplier_slug = params.supplier_slug
  if (params.delivery_group) searchParamsForNav.delivery_group = params.delivery_group

  const crmCategoryName = params.category
    ? categories.find((c) => c.slug === params.category)?.name
    : undefined
  const crmCategoryTitleFallback =
    params.category && !isHardwareCategory && !isConsumablesCategory
      ? params.category
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      : ''

  const title = isSupplierGroup
    ? 'Delivery Group'
    : isBundles
      ? 'Bundles'
      : isTimed
        ? 'Timed Products'
        : isHardwareCategory
          ? 'Hardware'
          : isConsumablesCategory
            ? 'Consumables'
            : isVintage
              ? 'Vintage Treasures'
              : isNew
                ? 'New Arrivals'
                : isFeatured
                  ? 'Featured Products'
                  : params.category && !isHardwareCategory && !isConsumablesCategory
                    ? crmCategoryName || crmCategoryTitleFallback
                    : 'All Products'

  const isAllShelves =
    !params.condition &&
    !params.category &&
    params.featured !== 'true' &&
    !params.bundle_only &&
    !params.timed_only &&
    !params.supplier_slug

  const subtitle = isSupplierGroup
    ? 'Products grouped together by supplier delivery rules.'
    : isBundles
      ? 'Curated bundles with bundled buying rules.'
      : isTimed
        ? 'Limited-time products with expiry countdowns.'
        : isHardwareCategory
          ? params.exclude_tags
            ? 'Hardware category (no bundles). Products with these tags are hidden: ' +
              params.exclude_tags.replace(/,/g, ', ') +
              '.'
            : 'Products in the hardware category. Bundles are excluded.'
          : isConsumablesCategory
            ? params.exclude_tags
              ? 'Consumables category (no bundles). Products with these tags are hidden: ' +
                params.exclude_tags.replace(/,/g, ', ') +
                '.'
              : 'Products in the consumables category. Bundles are excluded.'
            : isVintage
              ? 'Unique second-hand finds with character and history'
              : isNew
                ? 'Fresh finds and modern essentials. Bundles, hardware, and consumables use their own pages.'
                : isFeatured
                  ? 'Hand-picked favorites and standout items'
                  : params.category && !isHardwareCategory && !isConsumablesCategory
                    ? `Products in the ${crmCategoryName || crmCategoryTitleFallback} category.`
                    : 'Browse our complete collection of products'

  const makeHref = (overrides: Record<string, string | null>) => {
    const query = new URLSearchParams()
    const base = {
      condition: params.condition || null,
      category: params.category || null,
      search: params.search || null,
      featured: params.featured || null,
      sort: params.sort || null,
      bundle_only: params.bundle_only || null,
      timed_only: params.timed_only || null,
      exclude_tags: params.exclude_tags || null,
      exclude_bundles:
        params.category === HARDWARE_CATEGORY_SLUG ||
        params.category === CONSUMABLES_CATEGORY_SLUG ||
        params.condition === 'new' ||
        params.exclude_bundles === 'true'
          ? 'true'
          : null,
      supplier_slug: params.supplier_slug || null,
      delivery_group: params.delivery_group || null,
    }
    Object.entries({ ...base, ...overrides }).forEach(([key, value]) => {
      if (value) query.set(key, value)
    })
    const qs = query.toString()
    return qs ? `/products?${qs}` : '/products'
  }

  return (
    <div className="min-h-screen bg-vintage-background" data-cy="products-section">
      {/* Admin Management Actions */}
      <AdminActions />

      {/* Page Header */}
      <section
        className={`py-12 ${
          isBundles
            ? 'bg-blue-700'
            : isTimed
              ? 'bg-amber-600'
              : isHardwareCategory
                ? 'bg-zinc-700'
                : isConsumablesCategory
                  ? 'bg-emerald-700'
                  : isVintage
                  ? 'bg-vintage-primary'
                  : isNew
                    ? 'bg-modern-primary'
                    : isFeatured
                      ? 'bg-purple-600'
                      : isSupplierGroup
                        ? 'bg-slate-700'
                        : 'bg-gradient-to-r from-vintage-primary to-modern-primary'
        } text-white`}
      >
        <div className="container-wide">
          <h1 className="text-3xl md:text-4xl font-bold font-playfair mb-2">
            {title}
          </h1>
          <p className="text-lg opacity-90">
            {subtitle}
          </p>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="py-6 bg-white border-b border-gray-200">
        <div className="container-wide">
          <div className="flex flex-col gap-4">
            {/* Search and Sort */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <form
                method="get"
                action="/products"
                className="relative max-w-md flex-1"
              >
                {params.condition && <input type="hidden" name="condition" value={params.condition} />}
                {params.category && <input type="hidden" name="category" value={params.category} />}
                {params.featured && <input type="hidden" name="featured" value={params.featured} />}
                {params.sort && <input type="hidden" name="sort" value={params.sort} />}
                {params.bundle_only && <input type="hidden" name="bundle_only" value={params.bundle_only} />}
                {params.timed_only && <input type="hidden" name="timed_only" value={params.timed_only} />}
                {(params.exclude_tags ||
                  isHardwareCategory ||
                  isConsumablesCategory) && (
                  <input
                    type="hidden"
                    name="exclude_tags"
                    value={
                      params.exclude_tags?.trim() ||
                      (isHardwareCategory || isConsumablesCategory
                        ? CATEGORY_SHELF_EXCLUDE_TAGS
                        : '')
                    }
                  />
                )}
                {(params.category === HARDWARE_CATEGORY_SLUG ||
                  params.category === CONSUMABLES_CATEGORY_SLUG ||
                  params.condition === 'new' ||
                  params.exclude_bundles === 'true') && (
                  <input type="hidden" name="exclude_bundles" value="true" />
                )}
                {params.supplier_slug && <input type="hidden" name="supplier_slug" value={params.supplier_slug} />}
                {params.delivery_group && <input type="hidden" name="delivery_group" value={params.delivery_group} />}
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type="search"
                  name="search"
                  placeholder="Search by name or SKU..."
                  defaultValue={params.search}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-vintage-primary focus:border-vintage-primary text-text"
                />
              </form>

              <Suspense fallback={<div className="h-10 w-32 bg-gray-100 rounded-lg animate-pulse" />}>
                <ProductsSortSelect currentSort={params.sort || ''} />
              </Suspense>
            </div>

            {/* Shelf filters — aligned with home page sections */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Filter className="w-5 h-5 flex-shrink-0" />
                <span>
                  Shelves match the home page: vintage and new omit featured listings; hardware and consumables omit
                  bundles and the vintage / new / others tags.
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={makeHref({
                    condition: null,
                    category: null,
                    featured: null,
                    bundle_only: null,
                    timed_only: null,
                    exclude_tags: null,
                    exclude_bundles: null,
                    supplier_slug: null,
                    delivery_group: null,
                  })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    isAllShelves ? 'bg-vintage-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                  }`}
                >
                  All
                </Link>
                <Link
                  href={
                    params.featured === 'true'
                      ? makeHref({ featured: null, condition: null })
                      : makeHref({
                          featured: 'true',
                          condition: null,
                          bundle_only: null,
                          timed_only: null,
                          category: null,
                          exclude_tags: null,
                          exclude_bundles: null,
                          supplier_slug: null,
                          delivery_group: null,
                        })
                  }
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    isFeatured ? 'bg-purple-600 text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  Featured
                </Link>
                <Link
                  href={makeHref({
                    featured: null,
                    condition: 'vintage',
                    category: null,
                    exclude_tags: null,
                    exclude_bundles: null,
                    bundle_only: null,
                    timed_only: null,
                    supplier_slug: null,
                    delivery_group: null,
                  })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    isVintage ? 'bg-vintage-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Vintage
                </Link>
                <Link
                  href={makeHref({
                    featured: null,
                    condition: 'new',
                    category: null,
                    exclude_tags: null,
                    exclude_bundles: null,
                    bundle_only: null,
                    timed_only: null,
                    supplier_slug: null,
                    delivery_group: null,
                  })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    isNew ? 'bg-modern-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  New
                </Link>
                <Link
                  href={makeHref({
                    featured: null,
                    bundle_only: 'true',
                    timed_only: null,
                    condition: null,
                    category: null,
                    exclude_tags: null,
                    exclude_bundles: null,
                    supplier_slug: null,
                    delivery_group: null,
                  })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    isBundles ? 'bg-blue-700 text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Bundles
                </Link>
                <Link
                  href={makeHref({
                    featured: null,
                    condition: null,
                    category: HARDWARE_CATEGORY_SLUG,
                    exclude_tags: CATEGORY_SHELF_EXCLUDE_TAGS,
                    exclude_bundles: 'true',
                    bundle_only: null,
                    timed_only: null,
                    supplier_slug: null,
                    delivery_group: null,
                  })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    isHardwareCategory ? 'bg-zinc-700 text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  Hardware
                </Link>
                <Link
                  href={makeHref({
                    featured: null,
                    condition: null,
                    category: CONSUMABLES_CATEGORY_SLUG,
                    exclude_tags: CATEGORY_SHELF_EXCLUDE_TAGS,
                    exclude_bundles: 'true',
                    bundle_only: null,
                    timed_only: null,
                    supplier_slug: null,
                    delivery_group: null,
                  })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    isConsumablesCategory ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                  }`}
                >
                  <ShoppingBasket className="w-4 h-4" />
                  Consumables
                </Link>
                <Link
                  href={makeHref({
                    featured: null,
                    timed_only: 'true',
                    bundle_only: null,
                    condition: null,
                    category: null,
                    exclude_tags: null,
                    exclude_bundles: null,
                    supplier_slug: null,
                    delivery_group: null,
                  })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    isTimed ? 'bg-amber-600 text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                  }`}
                >
                  <TimerReset className="w-4 h-4" />
                  Timed
                </Link>
                {isSupplierGroup && (
                  <span className="px-4 py-2 rounded-full text-sm font-medium bg-slate-700 text-white flex items-center gap-1">
                    <Truck className="w-4 h-4" />
                    {params.supplier_slug}
                  </span>
                )}
              </div>

              {categories.length > 0 && (
                <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Tag className="w-5 h-5 flex-shrink-0" aria-hidden />
                    <span>Shop by category</span>
                  </div>
                  <div className="flex flex-wrap gap-2" data-cy="category-chips">
                    {categories.map((cat) => {
                      const isCatActive = params.category === cat.slug
                      return (
                        <Link
                          key={cat.id}
                          href={makeHref({
                            category: cat.slug,
                            condition: null,
                            featured: null,
                            bundle_only: null,
                            timed_only: null,
                            exclude_tags: null,
                            exclude_bundles: null,
                            supplier_slug: null,
                            delivery_group: null,
                          })}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            isCatActive ? 'bg-vintage-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                          }`}
                        >
                          {cat.name}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="container-wide">
          {products.length > 0 ? (
            <>
              <div className="product-grid" data-cy="products-grid">
                {products.map((product: Product) => (
                  <ProductCard key={product.id} product={product} homeQuickView />
                ))}
              </div>
              <PaginationNav
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                basePath="/products"
                searchParams={searchParamsForNav}
              />
            </>
          ) : (
            <div className="text-center py-16" data-cy="products-empty">
              <Search className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-30" />
              <h2 className="text-xl font-semibold text-text mb-2">No products found</h2>
              <p className="text-text-muted mb-6">
                {params.search 
                  ? `No results for "${params.search}"`
                  : 'Check back soon for new items!'}
              </p>
              <Link href="/products" className="btn btn-primary">
                View All Products
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
