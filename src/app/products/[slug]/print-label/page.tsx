import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { serverEcommerceApi } from '@/lib/api-server'
import { getCompany } from '@/lib/company'
import { getRequestSiteOrigin } from '@/lib/media-proxy'
import { formatOwnerName } from '@/lib/format-owner-name'
import { getLogoCardUrl, getProductCardImages } from '@/lib/image-utils'
import { formatMoney } from '@/lib/money'
import { resolveLocale } from '@/lib/locale'
import { resolveLabelAccentColor } from '@/lib/product-print-label'
import type { Product } from '@/lib/types'
import PrintLabelClient from './PrintLabelClient'

export const dynamic = 'force-dynamic'

interface PrintLabelPageProps {
  params: Promise<{ slug: string }>
}

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const response: unknown = await serverEcommerceApi.products.getBySlug(slug)
    if (
      response &&
      typeof response === 'object' &&
      'success' in response &&
      (response as { success?: boolean }).success &&
      'data' in response
    ) {
      return (response as { data: Product }).data
    }
    if (response && typeof response === 'object' && 'id' in response) {
      return response as Product
    }
    return null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PrintLabelPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  return {
    title: product ? `Print label — ${product.name}` : 'Print label',
    robots: { index: false, follow: false },
  }
}

export default async function ProductPrintLabelPage({ params }: PrintLabelPageProps) {
  const { slug } = await params
  const [product, company, siteOrigin] = await Promise.all([
    getProduct(slug),
    getCompany(),
    getRequestSiteOrigin(),
  ])

  if (!product) notFound()

  const locale = resolveLocale(company)
  const ownerName = formatOwnerName(product.owner_first_name, product.owner_last_name)
  const ownerPhone = company.contact.phone?.trim() || null
  const accent = resolveLabelAccentColor(company.brandColor)
  const tagline = company.tagline?.trim() || null
  const logoCandidate = company.logoUrl ? getLogoCardUrl(null, company.logoUrl) : ''
  const logoSrc =
    logoCandidate && !logoCandidate.includes('default.svg') ? logoCandidate : null
  const imageSrc = getProductCardImages(product)[0]
  const price = formatMoney(Number(product.price), company.currency, locale)
  const comparePrice =
    product.compare_at_price != null && Number(product.compare_at_price) > Number(product.price)
      ? formatMoney(Number(product.compare_at_price), company.currency, locale)
      : null
  const description = (product.short_description || '').replace(/\s+/g, ' ').trim().slice(0, 160)
  const sku = (product.sku || '').trim() || null
  const origin = siteOrigin || ''
  const productUrl = origin ? `${origin.replace(/\/$/, '')}/products/${product.slug}` : `/products/${product.slug}`

  return (
    <PrintLabelClient
      productSlug={product.slug}
      companyName={company.name}
      tagline={tagline}
      accent={accent}
      logoSrc={logoSrc}
      productName={product.name}
      price={price}
      comparePrice={comparePrice}
      sku={sku}
      description={description}
      imageSrc={imageSrc}
      productUrl={productUrl}
      ownerName={ownerName}
      ownerPhone={ownerPhone}
    />
  )
}
