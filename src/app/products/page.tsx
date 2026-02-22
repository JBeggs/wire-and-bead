import Link from 'next/link'
import { serverEcommerceApi } from '@/lib/api-server'
export const dynamic = 'force-dynamic'
import { Product } from '@/lib/types'
import { Clock, Sparkles, Filter, Search, Star } from 'lucide-react'
import { Suspense } from 'react'
import ProductsSortSelect from '@/components/products/ProductsSortSelect'
import AdminActions from '@/components/products/AdminActions'
import ProductCard from '@/components/products/ProductCard'
import PaginationNav from '@/components/ui/PaginationNav'

interface ProductsPageProps {
  searchParams: Promise<{ condition?: string; category?: string; search?: string; page?: string; featured?: string; sort?: string }>
}

async function getProducts(params: { condition?: string; category?: string; search?: string; page?: string; featured?: string; sort?: string }) {
  try {
    const response = await serverEcommerceApi.products.list({
      is_active: true,
      category: params.category,
      search: params.search,
      condition: params.condition,
      featured: params.featured === 'true' ? true : undefined,
      page: params.page ? parseInt(params.page) : 1,
      page_size: 24,
      ordering: params.sort || undefined,
    })

    const raw = Array.isArray(response) ? response : (response as any)?.data || (response as any)?.results || []
    const products = raw.filter((p: Product) => p.status !== 'archived')
    const pagination = (response as any)?.pagination

    return {
      products,
      pagination: pagination
        ? {
            page: pagination.page ?? 1,
            totalPages: pagination.totalPages ?? 1,
            total: pagination.total ?? products.length,
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
  const { products, pagination } = await getProducts(params)
  const isVintage = params.condition === 'vintage'
  const isNew = params.condition === 'new'

  const isFeatured = params.featured === 'true'

  const searchParamsForNav: Record<string, string> = {}
  if (params.condition) searchParamsForNav.condition = params.condition
  if (params.category) searchParamsForNav.category = params.category
  if (params.search) searchParamsForNav.search = params.search
  if (params.featured) searchParamsForNav.featured = params.featured
  if (params.sort) searchParamsForNav.sort = params.sort

  return (
    <div className="min-h-screen bg-vintage-background" data-cy="products-section">
      {/* Admin Management Actions */}
      <AdminActions />

      {/* Page Header */}
      <section className={`py-12 ${isVintage ? 'bg-vintage-primary' : isNew ? 'bg-modern-primary' : isFeatured ? 'bg-purple-600' : 'bg-gradient-to-r from-vintage-primary to-modern-primary'} text-white`}>
        <div className="container-wide">
          <h1 className="text-3xl md:text-4xl font-bold font-playfair mb-2">
            {isVintage ? 'Vintage Treasures' : isNew ? 'New Arrivals' : isFeatured ? 'Featured Products' : 'All Products'}
          </h1>
          <p className="text-lg opacity-90">
            {isVintage 
              ? 'Unique second-hand finds with character and history'
              : isNew 
                ? 'Fresh finds and modern essentials'
                : isFeatured
                  ? 'Hand-picked favorites and standout items'
                  : 'Browse our complete collection of vintage and new items'}
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

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-text-muted" />
                <span className="font-medium">Filter:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={(() => {
                    const q: Record<string, string> = {}
                    if (params.search) q.search = params.search
                    if (params.featured) q.featured = params.featured
                    if (params.sort) q.sort = params.sort
                    return Object.keys(q).length ? `/products?${new URLSearchParams(q).toString()}` : '/products'
                  })()}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    !params.condition ? 'bg-vintage-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                  }`}
                >
                  All
                </Link>
                <Link
                  href={`/products?${new URLSearchParams({ condition: 'vintage', ...(params.search && { search: params.search }), ...(params.featured && { featured: params.featured }), ...(params.sort && { sort: params.sort }) }).toString()}`}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    isVintage ? 'bg-vintage-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Vintage
                </Link>
                <Link
                  href={`/products?${new URLSearchParams({ condition: 'new', ...(params.search && { search: params.search }), ...(params.featured && { featured: params.featured }), ...(params.sort && { sort: params.sort }) }).toString()}`}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    isNew ? 'bg-modern-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  New
                </Link>
                <Link
                  href={params.featured === 'true'
                    ? `/products?${new URLSearchParams({ ...(params.condition && { condition: params.condition }), ...(params.search && { search: params.search }), ...(params.sort && { sort: params.sort }) }).toString()}`
                    : `/products?${new URLSearchParams({ featured: 'true', ...(params.condition && { condition: params.condition }), ...(params.search && { search: params.search }), ...(params.sort && { sort: params.sort }) }).toString()}`
                  }
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    isFeatured ? 'bg-purple-600 text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  Featured
                </Link>
              </div>
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
                  <ProductCard key={product.id} product={product} />
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
