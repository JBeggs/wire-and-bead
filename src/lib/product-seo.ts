import type { Product } from '@/lib/types'

type ProductSeoInput = Pick<
  Product,
  'name' | 'seo_title' | 'seo_description' | 'seo_keywords' | 'short_description' | 'description' | 'image'
>

/**
 * Build title, description, keywords for product pages.
 * Mirrors JavaMellow buildProductSeo: seo_* fields override; else use product details.
 */
export function buildProductSeo(
  product: ProductSeoInput,
  companyName: string,
): { title: string; description: string; keywords: string } {
  const title = product.seo_title
    ? `${product.seo_title} | ${companyName}`
    : product.name
      ? `${product.name} | ${companyName}`
      : ''
  const description =
    product.seo_description ?? product.short_description ?? product.description ?? ''
  const keywords = product.seo_keywords ?? ''
  return { title, description, keywords }
}

/**
 * Absolute HTTPS URL for og:image (WhatsApp / social crawlers require absolute URLs).
 */
export function buildProductOgImage(product: Pick<Product, 'image'>): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://3pillars.pythonanywhere.com/api'
  const backendOrigin = apiBase.replace(/\/api\/?$/, '')
  if (!product.image) {
    return `${backendOrigin}/og-image.jpg`
  }
  return product.image.startsWith('http')
    ? product.image
    : `${backendOrigin}${product.image.startsWith('/') ? '' : '/'}${product.image}`
}
