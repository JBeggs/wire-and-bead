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
  Tag,
  type LucideIcon,
} from 'lucide-react'
import { Suspense } from 'react'
import ProductsSortSelect from '@/components/products/ProductsSortSelect'
import AdminActions from '@/components/products/AdminActions'
import ProductCard from '@/components/products/ProductCard'
import PaginationNav from '@/components/ui/PaginationNav'
import {
  unwrapEcommerceList,
  unwrapEcommerceProductList,
  sanitizeListPage,
} from '@/lib/ecommerce-list'
import {
  getStorefrontShelves,
  hrefForShelf,
  isAllProductFilters,
  paramsMatchShelf,
  type StorefrontShelf,
} from '@/lib/storefront-shelves'
import PageHero from '@/components/hero/PageHero'

const SHELF_ICONS: Record<string, LucideIcon> = {
  star: Star,
  clock: Clock,
  sparkles: Sparkles,
  package: Package,
  timer: TimerReset,
  timerreset: TimerReset,
  truck: Truck,
}

function ShelfChipIcon({ name }: { name?: string }) {
  const I = (name && SHELF_ICONS[name.toLowerCase()]) || Package
  return <I className="w-4 h-4" />
}

type StorefrontCategory = { id: string; name: string; slug: string }

/** URL slug when API omits slug (Category.slug may be null/blank in DB). */
function storefrontCategorySlugFromName(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || 'category'
}

async function getStorefrontCategories(): Promise<StorefrontCategory[]> {
  try {
    const res = await serverEcommerceApi.categories.list()
    const rows = unwrapEcommerceList<{ id: string; name: string; slug?: string | null }>(res)
    return rows
      .filter((c) => Boolean(c.name?.trim()))
      .map((c) => {
        const raw = c.slug != null ? String(c.slug).trim() : ''
        const slug = raw || storefrontCategorySlugFromName(c.name)
        return { id: String(c.id), name: c.name, slug }
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  } catch (error) {
    console.error('Error fetching storefront categories:', error)
    return []
  }
}

function truthyParam(v?: string | string[]): boolean {
  const s = Array.isArray(v) ? v[0] : v
  return s === 'true' || s === '1'
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
    exclude_category?: string
    exclude_featured?: string
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
  exclude_category?: string
  exclude_featured?: string
  supplier_slug?: string
  delivery_group?: string
}) {
  try {
    const page = sanitizeListPage(params.page)

    const listArgs: Parameters<(typeof serverEcommerceApi)['products']['list']>[0] = {
      is_active: true,
      page,
      page_size: 24,
    }

    if (params.category?.trim()) listArgs.category = params.category.trim()
    if (params.search?.trim()) listArgs.search = params.search.trim()
    if (params.condition?.trim()) listArgs.condition = params.condition.trim()
    if (truthyParam(params.featured)) listArgs.featured = true
    if (truthyParam(params.exclude_featured)) listArgs.exclude_featured = true
    if (params.sort?.trim()) listArgs.ordering = params.sort.trim()
    if (truthyParam(params.bundle_only)) listArgs.bundle_only = 'true'
    if (truthyParam(params.timed_only)) listArgs.timed_only = 'true'
    if (params.exclude_tags?.trim()) listArgs.exclude_tags = params.exclude_tags.trim()
    if (truthyParam(params.exclude_bundles)) listArgs.exclude_bundles = 'true'
    if (params.exclude_category?.trim()) listArgs.exclude_category = params.exclude_category.trim()
    if (params.supplier_slug?.trim()) listArgs.supplier_slug = params.supplier_slug.trim()
    if (params.delivery_group?.trim()) listArgs.delivery_group = params.delivery_group.trim()

    let response = await serverEcommerceApi.products.list(listArgs)
    let raw = unwrapEcommerceProductList(response) as Product[]

    if (raw.length === 0 && page > 1) {
      response = await serverEcommerceApi.products.list({ ...listArgs, page: 1 })
      raw = unwrapEcommerceProductList(response) as Product[]
    }

    const products = raw
      .filter((p: Product) => p && typeof p === 'object' && p.status !== 'archived')
      .filter((p: Product) => {
        if (!params.supplier_slug?.trim()) return true
        return String(p.supplier_slug ?? '').toLowerCase() === params.supplier_slug.trim().toLowerCase()
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
  const [{ products, pagination }, categories, shelves] = await Promise.all([
    getProducts(params),
    getStorefrontCategories(),
    getStorefrontShelves(),
  ])

  const isVintage = params.condition === 'vintage'
  const isNew = params.condition === 'new'
  const isFeatured = truthyParam(params.featured)
  const isBundles = truthyParam(params.bundle_only)
  const isTimed = truthyParam(params.timed_only)
  const isSupplierGroup = !!params.supplier_slug?.trim()
  const hasCategory = !!params.category?.trim()

  const searchParamsForNav: Record<string, string> = {}
  if (params.condition) searchParamsForNav.condition = params.condition
  if (params.category) searchParamsForNav.category = params.category
  if (params.search) searchParamsForNav.search = params.search
  if (params.featured) searchParamsForNav.featured = params.featured
  if (params.sort) searchParamsForNav.sort = params.sort
  if (params.bundle_only) searchParamsForNav.bundle_only = params.bundle_only
  if (params.timed_only) searchParamsForNav.timed_only = params.timed_only
  if (params.exclude_tags?.trim()) searchParamsForNav.exclude_tags = params.exclude_tags
  if (params.exclude_bundles) searchParamsForNav.exclude_bundles = params.exclude_bundles
  if (params.exclude_category?.trim()) searchParamsForNav.exclude_category = params.exclude_category
  if (params.exclude_featured) searchParamsForNav.exclude_featured = params.exclude_featured
  if (params.supplier_slug) searchParamsForNav.supplier_slug = params.supplier_slug
  if (params.delivery_group) searchParamsForNav.delivery_group = params.delivery_group

  const crmCategoryName = params.category
    ? categories.find((c) => c.slug === params.category)?.name
    : undefined
  const crmCategoryTitleFallback = params.category
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
        : isVintage
          ? 'Vintage Treasures'
          : isNew
            ? 'New Arrivals'
            : isFeatured
              ? 'Featured Products'
              : hasCategory
                ? crmCategoryName || crmCategoryTitleFallback
                : 'All Products'

  const isAllShelves = isAllProductFilters(params)

  const subtitle = isSupplierGroup
    ? 'Products grouped together by supplier delivery rules.'
    : isBundles
      ? 'Curated bundles with bundled buying rules.'
      : isTimed
        ? 'Limited-time products with expiry countdowns.'
        : isVintage
          ? 'Unique second-hand finds with character and history'
          : isNew
            ? 'Fresh finds and modern essentials.'
            : isFeatured
              ? 'Hand-picked favorites and standout items'
              : hasCategory
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
      exclude_bundles: params.exclude_bundles || null,
      exclude_category: params.exclude_category || null,
      exclude_featured: params.exclude_featured || null,
      supplier_slug: params.supplier_slug || null,
      delivery_group: params.delivery_group || null,
    }
    Object.entries({ ...base, ...overrides }).forEach(([key, value]) => {
      if (value) query.set(key, value)
    })
    const qs = query.toString()
    return qs ? `/products?${qs}` : '/products'
  }

  const activeShelf: StorefrontShelf | null =
    shelves.find((s) => paramsMatchShelf(params, s)) ?? null

  const headerBg = isBundles
    ? 'bg-blue-700'
    : isTimed
      ? 'bg-amber-600'
      : isVintage
        ? 'bg-vintage-primary'
        : isNew
          ? 'bg-modern-primary'
          : isFeatured
            ? 'bg-purple-600'
            : isSupplierGroup
              ? 'bg-slate-700'
              : hasCategory
                ? 'bg-vintage-primary'
                : 'bg-gradient-to-r from-vintage-primary to-modern-primary'

  return (
    <div className="min-h-screen bg-vintage-background" data-cy="products-section">
      <PageHero pageSlug="products" fallback={null} />
      <AdminActions />

      <section className={`py-12 ${headerBg} text-white`}>
        <div className="container-wide">
          <h1 className="text-3xl md:text-4xl font-bold font-playfair mb-2">{title}</h1>
          <p className="text-lg opacity-90">{subtitle}</p>
        </div>
      </section>

      <section className="py-6 bg-white border-b border-gray-200">
        <div className="container-wide">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <form method="get" action="/products" className="relative max-w-md flex-1">
                {params.condition && <input type="hidden" name="condition" value={params.condition} />}
                {params.category && <input type="hidden" name="category" value={params.category} />}
                {params.featured && <input type="hidden" name="featured" value={params.featured} />}
                {params.sort && <input type="hidden" name="sort" value={params.sort} />}
                {params.bundle_only && <input type="hidden" name="bundle_only" value={params.bundle_only} />}
                {params.timed_only && <input type="hidden" name="timed_only" value={params.timed_only} />}
                {params.exclude_tags?.trim() && (
                  <input type="hidden" name="exclude_tags" value={params.exclude_tags} />
                )}
                {truthyParam(params.exclude_bundles) && (
                  <input type="hidden" name="exclude_bundles" value="true" />
                )}
                {params.exclude_category?.trim() && (
                  <input type="hidden" name="exclude_category" value={params.exclude_category} />
                )}
                {truthyParam(params.exclude_featured) && (
                  <input type="hidden" name="exclude_featured" value="true" />
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

            <div className="flex flex-col gap-3">
              {shelves.length > 0 && (
                <>
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Filter className="w-5 h-5 flex-shrink-0" />
                    <span>
                      Shelf chips are driven by django-crm <code className="text-xs">SiteSetting.storefront_shelves</code>{' '}
                      (JSON). Add or edit rows in the CRM — this app does not ship a fixed tenant taxonomy.
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={hrefForShelf(null, params.sort)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                        isAllShelves ? 'bg-vintage-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                      }`}
                    >
                      All
                    </Link>
                    {shelves.map((shelf) => {
                      const active = activeShelf?.id === shelf.id
                      return (
                        <Link
                          key={shelf.id}
                          href={hrefForShelf(shelf, params.sort)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                            active ? 'bg-vintage-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                          }`}
                        >
                          <ShelfChipIcon name={shelf.icon} />
                          {shelf.label}
                        </Link>
                      )
                    })}
                    {isSupplierGroup && (
                      <span className="px-4 py-2 rounded-full text-sm font-medium bg-slate-700 text-white flex items-center gap-1">
                        <Truck className="w-4 h-4" />
                        {params.supplier_slug}
                      </span>
                    )}
                  </div>
                </>
              )}

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
                            exclude_category: null,
                            exclude_featured: null,
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
