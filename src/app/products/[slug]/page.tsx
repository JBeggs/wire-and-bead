import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { serverEcommerceApi } from '@/lib/api-server'
export const dynamic = 'force-dynamic'
import { Product } from '@/lib/types'
import { buildProductOgImage, buildProductSeo, publicSiteOrigin } from '@/lib/product-seo'
import { ArrowLeft, Shield, Info, Phone, FileText, Package, TimerReset, Truck } from 'lucide-react'
import AddToCartButton from './AddToCartButton'
import ProductGallery from './ProductGallery'
import WhatsAppShareButton from './WhatsAppShareButton'
import { getMinQuantity, getStockQuantity, isBundleProduct, isGumtreeProduct, isTimedProduct } from '@/lib/product-utils'
import { getCompany } from '@/lib/company'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const response: any = await serverEcommerceApi.products.getBySlug(slug)
    
    // The public API returns { success: true, data: { ...product } }
    if (response?.success && response?.data) {
      return response.data as Product
    }

    // Fallback for other potential response structures
    const productsData = response
    if (productsData && !Array.isArray(productsData) && (productsData as any).slug === slug) {
      return productsData as Product
    }

    const products = Array.isArray(productsData) 
      ? productsData 
      : (productsData as any)?.data || (productsData as any)?.results || []
    
    if (!Array.isArray(products)) {
      return (productsData as any) || null
    }

    // Find the product that matches the slug exactly
    const product = products.find((p: any) => p.slug === slug)
    return product || products[0] || null
  } catch (error) {
    console.error('Error fetching product:', error)
    return null
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const [product, company] = await Promise.all([getProduct(slug), getCompany()])
  const companyName = company.name

  if (!product) {
    return { title: `Product | ${companyName}` }
  }

  const { title, description, keywords } = buildProductSeo(product, companyName)
  const ogImage = buildProductOgImage(product) || company.ogImageUrl || '/api/og-default'
  const site = publicSiteOrigin()
  const ogUrl = site ? `${site}/products/${slug}` : undefined

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    openGraph: {
      title,
      description,
      type: 'website',
      ...(ogUrl ? { url: ogUrl } : {}),
      images: [{ url: ogImage, alt: product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    notFound()
  }

  const isVintage = Array.isArray(product.tags) 
    ? product.tags.some(t => (typeof t === 'string' ? t : t.name) === 'vintage')
    : false
  const hasDiscount = product.compare_at_price && Number(product.compare_at_price) > Number(product.price)
  const discountPercent = hasDiscount 
    ? Math.round((1 - Number(product.price) / Number(product.compare_at_price!)) * 100)
    : 0
  const isBundle = isBundleProduct(product)
  const isTimed = isTimedProduct(product)
  const isGumtree = isGumtreeProduct(product)
  const minQty = getMinQuantity(product)

  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Breadcrumb */}
      <div className="bg-surface border-b border-border-default sticky top-[73px] z-30">
        <div className="container-wide py-4">
          <div className="flex items-center justify-between gap-4">
            <Link href="/products" className="flex items-center text-text-muted hover:text-primary transition-colors font-medium flex-shrink-0" prefetch={false}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back<span className="hidden md:inline"> to Products</span>
            </Link>
            <div className="flex flex-col items-end text-right min-w-0">
              <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
                {(product as any).category_name || product.category?.name || 'General'}
              </span>
              <span className="text-sm font-medium text-text truncate max-w-full">{product.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <section className="py-8 md:py-12">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">
            {/* Left Column: Gallery */}
            <ProductGallery product={product} />

            {/* Right Column: Info */}
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl md:text-5xl font-bold font-playfair text-text leading-tight mb-4">
                  {product.name}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold ${isVintage ? 'text-vintage-primary' : 'text-modern-primary'}`}>
                      R{Number(product.price).toFixed(2)}
                    </span>
                    {hasDiscount && (
                      <span className="text-xl text-text-muted line-through">
                        R{Number(product.compare_at_price).toFixed(2)}
                      </span>
                    )}
                  </div>
                  {hasDiscount && (
                    <span className="bg-vintage-accent text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                      SAVE {discountPercent}%
                    </span>
                  )}
                  {isBundle && (
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold inline-flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Bundle
                    </span>
                  )}
                  {isTimed && (
                    <span className="bg-amber-600 text-white px-3 py-1 rounded-full text-sm font-bold inline-flex items-center gap-2">
                      <TimerReset className="w-4 h-4" />
                      Timed
                    </span>
                  )}
                </div>

                {!isGumtree && product.short_description && (
                  <p className="text-lg text-text-light leading-relaxed italic border-l-4 border-vintage-primary/20 pl-4 py-1 mb-6">
                    {product.short_description}
                  </p>
                )}
              </div>

              {/* Add to Cart Section */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs uppercase font-bold tracking-widest text-text-muted">Availability</p>
                    {(() => {
                      const stockQty = getStockQuantity(product)
                      // stock 0 = supplier controlled / endless; only show Out of Stock when we track and are out
                      const isOutOfStock = product.track_inventory === true && stockQty != null && stockQty <= 0
                      if (isOutOfStock) {
                        return (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-red-600 font-bold">Out of Stock</span>
                          </div>
                        )
                      }
                      if (stockQty != null && stockQty > 0 && stockQty <= 5) {
                        return (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-amber-700 font-bold">Only {stockQty} left</span>
                          </div>
                        )
                      }
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-green-600 font-bold">In Stock</span>
                        </div>
                      )
                    })()}
                  </div>
                  {product.sku && (
                    <div className="text-right space-y-1">
                      <p className="text-xs uppercase font-bold tracking-widest text-text-muted">SKU</p>
                      <p className="font-mono text-sm text-text-light">{product.sku}</p>
                    </div>
                  )}
                </div>

                <AddToCartButton product={product} />
                <WhatsAppShareButton product={product} />

                <div className="grid gap-3 text-sm text-text-muted">
                  {product.delivery_time && (
                    <p className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-vintage-primary" />
                      Delivery: {product.delivery_time}
                    </p>
                  )}
                  {minQty > 1 && (
                    <p>Minimum order quantity: {minQty}</p>
                  )}
                  {product.supplier_slug && (
                    <p>Supplier: {product.supplier_slug}</p>
                  )}
                </div>
                
                <p className="text-[10px] text-center text-text-muted uppercase tracking-widest font-bold">
                  Personalized Service for All Orders
                </p>
              </div>

              {/* Description Tabs/Sections */}
              <div className="space-y-6">
                {((isGumtree && (product.description || '').trim()) || (!isGumtree && product.description)) && (
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-text">
                      <Info className="w-4 h-4 text-vintage-primary" />
                      About this item
                    </h3>
                    <p className="text-text-light leading-relaxed whitespace-pre-line">
                      {isGumtree ? (product.description || '').trim() : product.description}
                    </p>
                  </div>
                )}

                {/* Specs: hide for Gumtree (no reliable weight/dims from listing scrape) */}
                {!isGumtree &&
                  (product.weight || (Number(product.dimension_length) > 0 || Number(product.dimension_width) > 0 || Number(product.dimension_height) > 0)) && (
                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
                    {product.weight && (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest">Weight</p>
                        <p className="text-sm font-medium text-text">{product.weight} {product.weight_unit || 'g'}</p>
                      </div>
                    )}
                    {(Number(product.dimension_length) > 0 || Number(product.dimension_width) > 0 || Number(product.dimension_height) > 0) && (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest">Dimensions</p>
                        <p className="text-sm font-medium text-text">
                          {product.dimension_length}x{product.dimension_width}x{product.dimension_height} cm
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Trust Badges / Process Explanation */}
              <div className="pt-8 border-t border-gray-100">
                <div className="bg-white rounded-2xl p-6 border border-vintage-primary/10 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-text flex items-center gap-2">
                    <Phone className="w-4 h-4 text-vintage-primary" />
                    How to Purchase
                  </h3>
                  <div className="space-y-3">
                    <p className="text-sm text-text-light leading-relaxed">
                      Due to the unique nature of our collection, we provide a personalized service for every sale. 
                    </p>
                    {Number(product.price) >= 2000 ? (
                      <div className="bg-vintage-background/50 p-4 rounded-lg border-l-4 border-vintage-primary animate-in fade-in slide-in-from-left-2">
                        <p className="text-sm text-text-light leading-relaxed">
                          A representative will contact you to arrange viewing, paperwork, and delivery details before any payment is taken.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-modern-background/50 p-4 rounded-lg border-l-4 border-modern-primary animate-in fade-in slide-in-from-left-2">
                        <p className="text-sm text-text-light leading-relaxed">
                          You can pay securely via Yoco at checkout. We will then contact you to finalize delivery or collection.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-50">
                    <div className="text-center group">
                      <div className="w-10 h-10 mx-auto mb-2 bg-vintage-background rounded-full flex items-center justify-center group-hover:text-vintage-primary transition-colors">
                        <Phone className="w-5 h-5" />
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-tighter text-text-muted">Personalized</p>
                    </div>
                    <div className="text-center group">
                      <div className="w-10 h-10 mx-auto mb-2 bg-vintage-background rounded-full flex items-center justify-center group-hover:text-vintage-primary transition-colors">
                        <Shield className="w-5 h-5" />
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-tighter text-text-muted">Secure</p>
                    </div>
                    <div className="text-center group">
                      <div className="w-10 h-10 mx-auto mb-2 bg-vintage-background rounded-full flex items-center justify-center group-hover:text-vintage-primary transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-tighter text-text-muted">Paperwork</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
