import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ShoppingBag, Package } from 'lucide-react'
import { serverEcommerceApi } from '@/lib/api-server'
import { serverNewsApi } from '@/lib/api-server'
import {
  filterArticlesByDisplaySettings,
  getArticleDisplaySettings,
} from '@/lib/article-display-settings'
import HomeArticlesSection from '@/components/home/HomeArticlesSection'
import { Product } from '@/lib/types'
import ProductCard from '@/components/products/ProductCard'
import SafeImage from '@/components/media/SafeImage'
import { getCompany, type Company } from '@/lib/company'
import { unwrapEcommerceList, unwrapEcommerceProductList } from '@/lib/ecommerce-list'
import { categoryViewAllHref, homeCategoryProductListParams } from '@/lib/home-category-shelves'
import PageHero from '@/components/hero/PageHero'
import { getShareImage } from '@/lib/share-image'
import { openGraphImageFromMediaUrl } from '@/lib/product-seo'
import { getRequestSiteOrigin } from '@/lib/media-proxy'
import HomeWhatsAppShareButton from '@/app/home/HomeWhatsAppShareButton'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const [company, image] = await Promise.all([getCompany(), getShareImage('home')])
  return {
    title: company.name,
    description: company.description || company.tagline,
    openGraph: {
      title: company.name,
      description: company.description || company.tagline,
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [image],
    },
  }
}

function sortProductsByName(products: Product[]): Product[] {
  return [...products].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }),
  )
}

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const res: unknown = await serverEcommerceApi.products.list({
        is_active: true,
        featured: true,
      page_size: 8,
        ordering: 'name',
    })
    const raw = unwrapEcommerceProductList(res) as Product[]
    return sortProductsByName(
      raw.filter((p: Product) => p && typeof p === 'object' && p.status !== 'archived'),
    ).slice(0, 8)
  } catch (error) {
    console.error('Error fetching featured products:', error)
    return []
  }
}

/** URL slug when API omits slug (aligned with `/products`). */
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

export type HomeCategoryShelf = {
  name: string
  slug: string
  products: Product[]
}

async function getHomeCategoryShelves(): Promise<HomeCategoryShelf[]> {
  try {
    const catRes: unknown = await serverEcommerceApi.categories.list()
    const rows = unwrapEcommerceList<{ id: string; name: string; slug?: string | null }>(catRes).filter((c) =>
      Boolean(c.name?.trim()),
    )
    const withSlugs = rows.map((c) => {
      const raw = c.slug != null ? String(c.slug).trim() : ''
      const slug = raw || storefrontCategorySlugFromName(c.name)
      return { name: c.name.trim(), slug }
    })
    const sorted = [...withSlugs].sort((a, b) => {
      const byName = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      if (byName !== 0) return byName
      return a.slug.localeCompare(b.slug, undefined, { sensitivity: 'base' })
    })
    const seen = new Set<string>()
    const categoryRows = sorted.filter((c) => {
      const key = c.slug.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const catSettled = await Promise.allSettled(
      categoryRows.map((c) => serverEcommerceApi.products.list(homeCategoryProductListParams(c.slug))),
    )

    return categoryRows
      .map((cat, i) => {
        const res = catSettled[i]
        if (res.status !== 'fulfilled') return null
        const raw = unwrapEcommerceProductList(res.value) as Product[]
        const products = sortProductsByName(
          raw.filter((p) => p && typeof p === 'object' && p.status !== 'archived').slice(0, 20),
        )
        if (products.length === 0) return null
        return { name: cat.name, slug: cat.slug, products }
      })
      .filter((s): s is HomeCategoryShelf => s != null)
  } catch (error) {
    console.error('Error fetching home category shelves:', error)
    return []
  }
}

const HOME_HERO_SECTION_LAYOUT =
  'relative overflow-hidden flex flex-col justify-center min-h-[24rem] sm:min-h-[28rem] md:min-h-[32rem]'

function DefaultHomeHero({ company }: { company: Company }) {
  return (
    <section className={HOME_HERO_SECTION_LAYOUT}>
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

      <div className="relative container-wide py-24 md:py-32 text-[rgb(var(--color-text-inverse))] w-full">
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
  )
}


async function getHomeArticles() {
  const displaySettings = await getArticleDisplaySettings()
  if (!displaySettings.homeEnabled) return []
  try {
    const raw: unknown = await serverNewsApi.articles.list({ status: 'published' })
    const articles = Array.isArray(raw) ? raw : (raw as { results?: unknown[] })?.results || []
    return filterArticlesByDisplaySettings(articles as import('@/lib/types').Article[], displaySettings, 'home')
  } catch (error) {
    console.error('Error fetching home articles:', error)
    return []
  }
}

export default async function HomePage() {
  const [company, featuredProducts, categoryShelves, homeArticles, siteOrigin, heroShareImage] =
    await Promise.all([
      getCompany(),
      getFeaturedProducts(),
      getHomeCategoryShelves(),
      getHomeArticles(),
      getRequestSiteOrigin(),
      getShareImage('home'),
    ])
  const shareImageUrl = openGraphImageFromMediaUrl(heroShareImage, siteOrigin)

  return (
    <div className="min-h-screen">
      <PageHero
        pageSlug="home"
        fallback={<DefaultHomeHero company={company} />}
      />

      <section className="py-8 bg-bg border-b border-border-default">
        <div className="container-wide flex justify-center">
          <HomeWhatsAppShareButton
            companyName={company.name}
            tagline={company.tagline}
            description={company.description}
            shareImageUrl={shareImageUrl}
          />
        </div>
      </section>

      {featuredProducts.length > 0 ? (
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
            <div className="product-grid">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} homeQuickView />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {categoryShelves.map((shelf, index) => (
        <section
          key={shelf.slug}
          className={`py-16 ${index % 2 === 0 ? 'bg-bg' : 'bg-surface-raised/60'}`}
        >
          <div className="container-wide">
            <div className="section-header">
              <div>
                <h2 className="section-title">{shelf.name}</h2>
                <p className="text-text-muted mt-1">Products in this category</p>
              </div>
              <Link href={categoryViewAllHref(shelf.slug)} className="btn btn-secondary">
                <Package className="w-4 h-4 mr-2" />
                View All
              </Link>
            </div>
            <div className="product-grid">
              {shelf.products.map((product) => (
                <ProductCard key={product.id} product={product} homeQuickView />
              ))}
            </div>
          </div>
        </section>
      ))}

      {categoryShelves.length === 0 ? (
        <section className="py-16 bg-bg">
          <div className="container-wide text-center text-text-muted">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="font-medium text-text">No category shelves yet</p>
            <p className="text-sm mt-2 max-w-md mx-auto">
              Add categories and active products in the admin — each category with at least one product appears here,
              alphabetically.
            </p>
            <Link href="/products" className="btn btn-primary mt-6 inline-flex">
              Browse all products
            </Link>
          </div>
        </section>
      ) : null}

      <HomeArticlesSection articles={homeArticles} />

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
