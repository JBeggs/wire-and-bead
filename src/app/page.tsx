import Link from 'next/link'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import { serverEcommerceApi } from '@/lib/api-server'
import { Product } from '@/lib/types'
import ProductCard from '@/components/products/ProductCard'
import SafeImage from '@/components/media/SafeImage'
import { getCompany } from '@/lib/company'

export const dynamic = 'force-dynamic'

function sortProductsByName(products: Product[]): Product[] {
  return [...products].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }),
  )
}

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const res: any = await serverEcommerceApi.products.list({
      is_active: true,
      featured: true,
      page_size: 8,
      ordering: 'name',
    })
    const raw = Array.isArray(res) ? res : res?.data || res?.results || []
    return sortProductsByName(raw.filter((p: Product) => p.status !== 'archived')).slice(0, 8)
  } catch (error) {
    console.error('Error fetching featured products:', error)
    return []
  }
}

export default async function HomePage() {
  const [company, featuredProducts] = await Promise.all([
    getCompany(),
    getFeaturedProducts(),
  ])

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <SafeImage
            src={company.heroImageUrl}
            alt=""
            kind="hero"
            fill
            priority
            sizes="100vw"
            className="absolute inset-0"
            imgClassName="object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, rgb(var(--color-primary) / 0.85) 0%, rgb(var(--color-primary) / 0.55) 45%, rgb(var(--color-accent) / 0.55) 100%)',
            }}
            aria-hidden
          />
        </div>

        <div className="relative container-wide py-24 md:py-32 text-[rgb(var(--color-text-inverse))]">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-heading mb-4">
              {company.name}
            </h1>
            {company.tagline && (
              <p className="text-base md:text-lg uppercase tracking-[0.25em] opacity-90 mb-6">
                {company.tagline}
              </p>
            )}
            <p className="text-lg md:text-xl opacity-95 mb-8 max-w-xl">
              {company.description}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/products"
                className="btn btn-accent text-base px-6 py-3"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Shop the Collection
              </Link>
              <Link
                href="/about"
                className="btn btn-secondary text-base px-6 py-3"
              >
                Our Story
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="py-16 bg-bg">
        <div className="container-wide">
          <div className="section-header">
            <div>
              <h2 className="section-title">Featured</h2>
              <p className="text-text-muted mt-1">Our highlighted pieces</p>
            </div>
            <Link href="/products" className="btn btn-secondary">
              View All <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>

          {featuredProducts.length > 0 ? (
            <div className="product-grid">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} homeQuickView />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-text-muted">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="font-medium text-text">No featured products yet</p>
              <p className="text-sm mt-2 max-w-md mx-auto">
                Mark products as <span className="font-semibold">Featured</span> in the admin and
                they&rsquo;ll appear here.
              </p>
              <Link href="/products" className="btn btn-primary mt-6 inline-flex">
                Browse all products
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-16 text-[rgb(var(--color-text-inverse))]"
        style={{
          background:
            'linear-gradient(135deg, rgb(var(--color-primary)) 0%, rgb(var(--color-accent)) 100%)',
        }}
      >
        <div className="container-wide text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">
            Join the {company.name} community
          </h2>
          <p className="text-lg opacity-95 mb-8 max-w-2xl mx-auto">
            Sign up to be first to know about new arrivals, restocks, and exclusive offers.
          </p>
          <Link href="/register" className="btn btn-accent text-lg px-8 py-3">
            Create an Account
          </Link>
        </div>
      </section>
    </div>
  )
}
