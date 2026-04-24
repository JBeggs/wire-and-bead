import Link from 'next/link'
import { serverEcommerceApi, serverNewsApi } from '@/lib/api-server'
import AboutPageClient, { AnimatedSection, AnimatedCard } from '@/components/about/AboutPageClient'
import { Clock, Sparkles, Heart, Leaf, TrendingUp, Zap, Link2, Package } from 'lucide-react'
import { getCompany } from '@/lib/company'
import { unwrapEcommerceProductList } from '@/lib/ecommerce-list'
import PageHero from '@/components/hero/PageHero'

export const dynamic = 'force-dynamic'

async function getAboutContent() {
  try {
    const articlesData = await serverNewsApi.articles.getBySlug('about')
    const articles = Array.isArray(articlesData) ? articlesData : (articlesData as any)?.results || []
    return articles[0] || null
  } catch (error) {
    console.error('Error fetching about content:', error)
    return null
  }
}

async function getSampleProducts() {
  try {
    const [featured, vintage] = await Promise.all([
      serverEcommerceApi.products.list({ is_active: true, featured: true, page_size: 3 }),
      serverEcommerceApi.products.list({ is_active: true, tags: 'vintage', page_size: 2 }),
    ])
    const featuredRaw = unwrapEcommerceProductList(featured)
    const vintageRaw = unwrapEcommerceProductList(vintage)
    const combined = [...featuredRaw, ...vintageRaw].filter((p: any) => p.status !== 'archived')
    return combined.slice(0, 4)
  } catch {
    return []
  }
}

export default async function AboutPage() {
  const [aboutArticle, sampleProducts, company] = await Promise.all([
    getAboutContent(),
    getSampleProducts(),
    getCompany(),
  ])
  const companyName = company.name

  const sections = [
    { id: 'story', label: 'Our Story' },
    { id: 'investors', label: 'For Investors' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'believe', label: 'What We Believe' },
    ...(sampleProducts.length > 0 ? [{ id: 'examples', label: 'Our Collection' }] : []),
  ]

  return (
    <div className="min-h-screen bg-vintage-background">
      {/* Optional admin-uploaded hero; renders nothing when disabled. */}
      <PageHero pageSlug="about" fallback={null} />

      {/* Hero */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-vintage-primary to-vintage-primary-dark text-white">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-playfair mb-6">
              Our Story
            </h1>
            <p className="text-xl text-green-100">
              Where the charm of yesterday meets the convenience of today
            </p>
          </div>
        </div>
      </section>

      <AboutPageClient sections={sections}>
      {/* Our Story */}
      <AnimatedSection id="story" className="py-16">
        <div className="container-narrow">
          {aboutArticle ? (
            <div className="article-content" dangerouslySetInnerHTML={{ __html: aboutArticle.content }} />
          ) : (
            <div className="prose prose-lg max-w-none">
              <p className="text-lg text-text-light leading-relaxed mb-6">
                {companyName} was born from a simple belief: beautiful things deserve a second life,
                and quality should be accessible to everyone. We curate a unique collection of vintage
                treasures alongside carefully selected modern pieces, creating a shopping experience
                that celebrates both sustainability and style.
              </p>
              <p className="text-lg text-text-light leading-relaxed">
                Our hybrid model brings together pre-loved vintage finds and hand-picked new products,
                giving customers a single destination for timeless quality and modern essentials.
              </p>
            </div>
          )}
        </div>
      </AnimatedSection>

      {/* For Investors */}
      <AnimatedSection id="investors" className="py-16 bg-white">
        <div className="container-narrow">
          <h2 className="text-2xl md:text-3xl font-bold font-playfair text-text mb-6 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-vintage-primary" />
            For Investors
          </h2>
          <div className="space-y-6 text-text-light leading-relaxed">
            <p className="text-lg">
              {companyName} operates on a lean, technology-driven business model designed for scalability
              and predictable margins. We source products through established channels, apply consistent
              markup structures, and sell directly to consumers via our e-commerce platform.
            </p>
            <div className="grid md:grid-cols-2 gap-6 my-8">
              <div className="card-vintage p-6 border-l-4 border-vintage-primary">
                <h3 className="font-semibold text-text mb-2">Sourcing & Curation</h3>
                <p className="text-text-muted text-sm">
                  Products are identified from external listings. Our system ingests product data
                  automatically, allowing rapid catalog expansion with minimal manual effort.
                </p>
              </div>
              <div className="card p-6 border-l-4 border-modern-primary">
                <h3 className="font-semibold text-text mb-2">Pricing & Margins</h3>
                <p className="text-text-muted text-sm">
                  We apply category-specific markups to ensure healthy margins while remaining
                  competitive. Pricing is transparent and consistent across vintage and new products.
                </p>
              </div>
            </div>
            <p className="text-text-light">
              The model reduces inventory risk, accelerates time-to-market, and creates a repeatable
              process that can scale with demand. Revenue flows from direct sales, with clear unit
              economics and low fixed overhead.
            </p>
          </div>
        </div>
      </AnimatedSection>

      {/* How It Works */}
      <AnimatedSection id="how-it-works" className="py-16 bg-vintage-background">
        <div className="container-narrow">
          <h2 className="text-2xl md:text-3xl font-bold font-playfair text-text mb-6 flex items-center gap-3">
            <Zap className="w-8 h-8 text-vintage-primary" />
            How the Site Works
          </h2>
          <div className="space-y-6 text-text-light leading-relaxed">
            <p className="text-lg">
              Content is managed entirely by the site owner through an admin dashboard. When adding
              a new product, the owner provides a product URL from an external source.
            </p>
            <div className="flex items-start gap-4 p-6 bg-white rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-vintage-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Link2 className="w-6 h-6 text-vintage-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-text mb-2">Automated Data Ingestion</h3>
                <p className="text-text-muted text-sm">
                  The system automatically extracts product details—including name, description,
                  images, and pricing—from the provided URL. This data is then added to the catalog
                  with minimal manual input. The owner can review, adjust, and set final pricing
                  before publishing.
                </p>
              </div>
            </div>
            <p className="text-text-light">
              This workflow enables rapid catalog growth, consistent data quality, and efficient
              operations. Products go live quickly, and the store stays fresh with new arrivals
              without heavy data-entry overhead.
            </p>
          </div>
        </div>
      </AnimatedSection>

      {/* What We Believe */}
      <AnimatedSection id="believe" className="py-16 bg-white" stagger>
        <div className="container-narrow">
          <h2 className="text-2xl font-bold font-playfair text-text mt-12 mb-6">What We Believe</h2>
          <div className="grid md:grid-cols-2 gap-6 my-8">
            <AnimatedCard className="card-vintage p-6 hover:shadow-md transition-shadow duration-300">
              <div className="w-12 h-12 bg-vintage-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-vintage-primary" />
              </div>
              <h3 className="font-semibold text-text mb-2">Timeless Quality</h3>
              <p className="text-text-muted text-sm">
                Every vintage piece in our collection is hand-selected for its quality,
                character, and enduring appeal.
              </p>
            </AnimatedCard>
            <AnimatedCard className="card p-6 hover:shadow-md transition-shadow duration-300">
              <div className="w-12 h-12 bg-modern-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-modern-primary" />
              </div>
              <h3 className="font-semibold text-text mb-2">Modern Essentials</h3>
              <p className="text-text-muted text-sm">
                Our new products are chosen for their design, functionality, and
                ability to complement any style.
              </p>
            </AnimatedCard>
            <AnimatedCard className="card p-6 hover:shadow-md transition-shadow duration-300">
              <div className="w-12 h-12 bg-vintage-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-vintage-accent" />
              </div>
              <h3 className="font-semibold text-text mb-2">Personal Touch</h3>
              <p className="text-text-muted text-sm">
                We believe shopping should be personal. Our team is always here to help
                you find exactly what you&apos;re looking for.
              </p>
            </AnimatedCard>
            <AnimatedCard className="card p-6 hover:shadow-md transition-shadow duration-300">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Leaf className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-text mb-2">Sustainable Shopping</h3>
              <p className="text-text-muted text-sm">
                By giving pre-loved items a new home, we&apos;re reducing waste and
                promoting a more sustainable way to shop.
              </p>
            </AnimatedCard>
          </div>
          <h2 className="text-2xl font-bold font-playfair text-text mt-12 mb-6">Our Promise</h2>
          <p className="text-text-light leading-relaxed mb-6">
            When you shop with {companyName}, you&apos;re not just buying a product—you&apos;re
            becoming part of a community that values quality, sustainability, and the stories
            that objects carry with them.
          </p>
          <p className="text-text-light leading-relaxed">
            Every item is carefully inspected, honestly described, and shipped with care.
            We stand behind everything we sell and are committed to your complete satisfaction.
          </p>
        </div>
      </AnimatedSection>

      {/* Product Examples */}
      {sampleProducts.length > 0 && (
        <AnimatedSection id="examples" className="py-16 bg-vintage-background">
          <div className="container-wide">
            <h2 className="text-2xl md:text-3xl font-bold font-playfair text-text mb-2 flex items-center gap-3">
              <Package className="w-8 h-8 text-vintage-primary" />
              From Our Collection
            </h2>
            <p className="text-text-muted mb-8 max-w-2xl">
              A sample of the vintage treasures and modern finds we curate for our customers.
            </p>
            <div className="product-grid">
              {sampleProducts.map((product: any) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className={`group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                    Array.isArray(product.tags) && product.tags.some((t: any) => (typeof t === 'string' ? t : t?.name) === 'vintage')
                      ? 'product-card-vintage'
                      : 'product-card-modern'
                  }`}
                >
                  <div className="relative aspect-square overflow-hidden bg-gray-50">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <Package className="w-12 h-12 text-vintage-primary/30" />
                      </div>
                    )}
                    <span className={`tag absolute top-2 left-2 ${
                      Array.isArray(product.tags) && product.tags.some((t: any) => (typeof t === 'string' ? t : t?.name) === 'vintage')
                        ? 'tag-vintage'
                        : 'tag-new'
                    }`}>
                      {Array.isArray(product.tags) && product.tags.some((t: any) => (typeof t === 'string' ? t : t?.name) === 'vintage') ? 'Vintage' : 'New'}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-text group-hover:text-vintage-primary transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-sm text-text-muted mt-1 line-clamp-2 flex-1">{product.description}</p>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="price">R{Number(product.price || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/products" className="btn btn-primary">
                View All Products
              </Link>
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-modern-primary text-white">
        <div className="container-wide text-center">
          <h2 className="text-3xl font-bold font-playfair mb-4">
            Ready to Explore?
          </h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Discover our collection of vintage treasures and modern finds.
          </p>
          <Link href="/products" className="btn btn-gold text-lg px-8 py-3">
            Shop Now
          </Link>
        </div>
      </section>
      </AboutPageClient>
    </div>
  )
}
