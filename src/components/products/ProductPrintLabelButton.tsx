'use client'

import { useCallback } from 'react'
import QRCode from 'qrcode'
import { Printer } from 'lucide-react'
import { getProductBundleImages, getPublicImageUrl } from '@/lib/image-utils'
import { formatMoney } from '@/lib/money'
import type { Product } from '@/lib/types'

type PrintProduct = Pick<
  Product,
  'name' | 'slug' | 'price' | 'compare_at_price' | 'sku' | 'short_description' | 'image' | 'images'
>

interface ProductPrintLabelButtonProps {
  product: PrintProduct
  companyName: string
  currency: string
  locale: string
  /** Full-width CTA on product page; compact icon on inventory rows. */
  variant?: 'button' | 'icon'
  className?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildPrintDocument(args: {
  companyName: string
  productName: string
  price: string
  comparePrice: string | null
  sku: string | null
  description: string
  imageUrl: string
  productUrl: string
  qrDataUrl: string
}): string {
  const {
    companyName,
    productName,
    price,
    comparePrice,
    sku,
    description,
    imageUrl,
    productUrl,
    qrDataUrl,
  } = args

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(productName)}</title>
  <style>
    @page { margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      color: #111;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label {
      max-width: 340px;
      margin: 0 auto;
      padding: 8px 4px 12px;
      text-align: center;
    }
    .brand {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 10px;
    }
    .product-image {
      width: 100%;
      max-height: 200px;
      object-fit: contain;
      margin: 0 auto 12px;
      display: block;
    }
    h1 {
      font-size: 18px;
      line-height: 1.25;
      margin: 0 0 8px;
      font-weight: 700;
    }
    .desc {
      font-size: 12px;
      line-height: 1.4;
      color: #444;
      margin: 0 0 10px;
    }
    .prices {
      margin: 0 0 10px;
    }
    .price {
      font-size: 24px;
      font-weight: 800;
      color: #111;
    }
    .compare {
      font-size: 14px;
      color: #888;
      text-decoration: line-through;
      margin-left: 6px;
    }
    .sku {
      font-size: 11px;
      color: #666;
      font-family: ui-monospace, monospace;
      margin-bottom: 12px;
    }
    .qr {
      width: 148px;
      height: 148px;
      margin: 0 auto 8px;
      display: block;
    }
    .url {
      font-size: 10px;
      color: #666;
      word-break: break-all;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="brand">${escapeHtml(companyName)}</div>
    <img class="product-image" src="${escapeHtml(imageUrl)}" alt="" />
    <h1>${escapeHtml(productName)}</h1>
    ${description ? `<p class="desc">${escapeHtml(description)}</p>` : ''}
    <div class="prices">
      <span class="price">${escapeHtml(price)}</span>
      ${comparePrice ? `<span class="compare">${escapeHtml(comparePrice)}</span>` : ''}
    </div>
    ${sku ? `<div class="sku">SKU: ${escapeHtml(sku)}</div>` : ''}
    <img class="qr" src="${qrDataUrl}" alt="QR code" />
    <div class="url">${escapeHtml(productUrl)}</div>
  </div>
</body>
</html>`
}

export default function ProductPrintLabelButton({
  product,
  companyName,
  currency,
  locale,
  variant = 'button',
  className = '',
}: ProductPrintLabelButtonProps) {
  const handlePrint = useCallback(async () => {
    if (typeof window === 'undefined') return

    const productUrl = `${window.location.origin}/products/${product.slug}`
    const qrDataUrl = await QRCode.toDataURL(productUrl, {
      width: 180,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
    const images = getProductBundleImages(product)
    const imageUrl = getPublicImageUrl(images[0] ?? '')
    const price = formatMoney(Number(product.price), currency, locale)
    const comparePrice =
      product.compare_at_price != null && Number(product.compare_at_price) > Number(product.price)
        ? formatMoney(Number(product.compare_at_price), currency, locale)
        : null
    const description = (product.short_description || '').replace(/\s+/g, ' ').trim().slice(0, 160)
    const sku = (product.sku || '').trim() || null

    const html = buildPrintDocument({
      companyName,
      productName: product.name,
      price,
      comparePrice,
      sku,
      description,
      imageUrl,
      productUrl,
      qrDataUrl,
    })

    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.position = 'fixed'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) {
      iframe.remove()
      return
    }

    doc.open()
    doc.write(html)
    doc.close()

    const printAndCleanup = () => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } finally {
        window.setTimeout(() => iframe.remove(), 1500)
      }
    }

    if (iframe.contentWindow?.document.readyState === 'complete') {
      window.setTimeout(printAndCleanup, 150)
    } else {
      iframe.onload = () => window.setTimeout(printAndCleanup, 150)
    }
  }, [companyName, currency, locale, product])

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={() => void handlePrint()}
        className={`md:hidden p-2 text-text-muted hover:text-vintage-primary hover:bg-vintage-primary/5 rounded-lg transition-all ${className}`}
        title="Print label"
        aria-label="Print product label with QR code"
      >
        <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => void handlePrint()}
      aria-label="Print product label with QR code"
      className={`md:hidden flex w-full items-center justify-center gap-2 rounded-full border border-border-default bg-surface py-3 text-base font-medium text-text transition-colors hover:bg-bg active:scale-95 ${className}`}
    >
      <Printer className="w-5 h-5" aria-hidden="true" />
      Print label
    </button>
  )
}
