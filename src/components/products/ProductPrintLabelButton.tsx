'use client'

import { useCallback } from 'react'
import QRCode from 'qrcode'
import { Printer } from 'lucide-react'
import { getProductCardImages } from '@/lib/image-utils'
import { formatMoney } from '@/lib/money'
import type { Product } from '@/lib/types'

type PrintProduct = Pick<
  Product,
  | 'name'
  | 'slug'
  | 'price'
  | 'compare_at_price'
  | 'sku'
  | 'short_description'
  | 'image'
  | 'images'
> & {
  image_thumbnail?: string | null
  image_thumbnails?: string[] | null
}

interface ProductPrintLabelButtonProps {
  product: PrintProduct
  companyName: string
  currency: string
  locale: string
  /** Full-width CTA on product page; compact icon on inventory rows. */
  variant?: 'button' | 'icon'
  className?: string
}

const PRINT_LABEL_ROOT_ID = 'product-print-label-root'
const PRINT_LABEL_STYLE_ID = 'product-print-label-styles'
const IMAGE_LOAD_TIMEOUT_MS = 5000
const CLEANUP_FALLBACK_MS = 30000

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildLabelHtml(args: {
  companyName: string
  productName: string
  price: string
  comparePrice: string | null
  sku: string | null
  description: string
  imageUrl: string
  productUrl: string
  qrSvg: string
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
    qrSvg,
  } = args

  return `
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
    <div class="qr" role="img" aria-label="QR code">${qrSvg}</div>
    <div class="url">${escapeHtml(productUrl)}</div>
  </div>`
}

function injectPrintStyles(): void {
  if (document.getElementById(PRINT_LABEL_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = PRINT_LABEL_STYLE_ID
  style.textContent = `
    @media print {
      @page { margin: 10mm; }
      body > *:not(#${PRINT_LABEL_ROOT_ID}) { display: none !important; }
      #${PRINT_LABEL_ROOT_ID} {
        display: block !important;
        position: static !important;
        left: auto !important;
        opacity: 1 !important;
        visibility: visible !important;
      }
    }
    @media screen {
      /* Off-screen, not display:none — Android otherwise skips loading img src before print. */
      #${PRINT_LABEL_ROOT_ID} {
        position: fixed !important;
        left: -10000px !important;
        top: 0 !important;
        width: 340px !important;
        overflow: hidden !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
        z-index: -1 !important;
      }
    }
    #${PRINT_LABEL_ROOT_ID} {
      box-sizing: border-box;
      font-family: system-ui, -apple-system, sans-serif;
      color: #111;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    #${PRINT_LABEL_ROOT_ID} * { box-sizing: border-box; }
    #${PRINT_LABEL_ROOT_ID} .label {
      max-width: 340px;
      margin: 0 auto;
      padding: 8px 4px 12px;
      text-align: center;
    }
    #${PRINT_LABEL_ROOT_ID} .brand {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 10px;
    }
    #${PRINT_LABEL_ROOT_ID} .product-image {
      width: 100%;
      max-height: 200px;
      object-fit: contain;
      margin: 0 auto 12px;
      display: block;
    }
    #${PRINT_LABEL_ROOT_ID} h1 {
      font-size: 18px;
      line-height: 1.25;
      margin: 0 0 8px;
      font-weight: 700;
    }
    #${PRINT_LABEL_ROOT_ID} .desc {
      font-size: 12px;
      line-height: 1.4;
      color: #444;
      margin: 0 0 10px;
    }
    #${PRINT_LABEL_ROOT_ID} .prices { margin: 0 0 10px; }
    #${PRINT_LABEL_ROOT_ID} .price {
      font-size: 24px;
      font-weight: 800;
      color: #111;
    }
    #${PRINT_LABEL_ROOT_ID} .compare {
      font-size: 14px;
      color: #888;
      text-decoration: line-through;
      margin-left: 6px;
    }
    #${PRINT_LABEL_ROOT_ID} .sku {
      font-size: 11px;
      color: #666;
      font-family: ui-monospace, monospace;
      margin-bottom: 12px;
    }
    #${PRINT_LABEL_ROOT_ID} .qr {
      width: 148px;
      margin: 0 auto 8px;
    }
    #${PRINT_LABEL_ROOT_ID} .qr svg {
      width: 148px;
      height: 148px;
      display: block;
      margin: 0 auto;
    }
    #${PRINT_LABEL_ROOT_ID} .url {
      font-size: 10px;
      color: #666;
      word-break: break-all;
      line-height: 1.3;
    }
  `
  document.head.appendChild(style)
}

function toAbsoluteFetchUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url
  if (typeof window === 'undefined') return url
  return `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`
}

/** Embed product photo inline so Android print/PDF includes it reliably. */
async function fetchImageDataUrl(url: string): Promise<string> {
  const absolute = toAbsoluteFetchUrl(url)
  if (!absolute || absolute.startsWith('data:')) return absolute

  try {
    const res = await fetch(absolute, { cache: 'no-store', credentials: 'same-origin' })
    if (!res.ok) return absolute
    const blob = await res.blob()
    if (!blob.size) return absolute
    return await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || absolute))
      reader.onerror = () => resolve(absolute)
      reader.readAsDataURL(blob)
    })
  } catch {
    return absolute
  }
}

async function waitForImages(root: HTMLElement, timeoutMs: number): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'))
  if (imgs.length === 0) return

  await Promise.all(
    imgs.map((img) =>
      Promise.race([
        (async () => {
          if (img.complete && img.naturalHeight > 0) return
          if (typeof img.decode === 'function') {
            try {
              await img.decode()
              if (img.naturalHeight > 0) return
            } catch {
              /* fall through to load listeners */
            }
          }
          await new Promise<void>((resolve) => {
            const done = () => resolve()
            if (img.complete && img.naturalHeight > 0) {
              done()
              return
            }
            img.addEventListener('load', done, { once: true })
            img.addEventListener('error', done, { once: true })
          })
        })(),
        new Promise<void>((resolve) => window.setTimeout(resolve, timeoutMs)),
      ]),
    ),
  )
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
    const qrSvg = await QRCode.toString(productUrl, {
      type: 'svg',
      width: 180,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
    const imageUrl = await fetchImageDataUrl(getProductCardImages(product)[0])
    const price = formatMoney(Number(product.price), currency, locale)
    const comparePrice =
      product.compare_at_price != null && Number(product.compare_at_price) > Number(product.price)
        ? formatMoney(Number(product.compare_at_price), currency, locale)
        : null
    const description = (product.short_description || '').replace(/\s+/g, ' ').trim().slice(0, 160)
    const sku = (product.sku || '').trim() || null

    injectPrintStyles()

    document.getElementById(PRINT_LABEL_ROOT_ID)?.remove()

    const root = document.createElement('div')
    root.id = PRINT_LABEL_ROOT_ID
    root.setAttribute('aria-hidden', 'true')
    root.innerHTML = buildLabelHtml({
      companyName,
      productName: product.name,
      price,
      comparePrice,
      sku,
      description,
      imageUrl,
      productUrl,
      qrSvg,
    })
    document.body.appendChild(root)

    await waitForImages(root, IMAGE_LOAD_TIMEOUT_MS)

    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      root.remove()
      window.onafterprint = null
    }

    window.onafterprint = cleanup
    window.setTimeout(cleanup, CLEANUP_FALLBACK_MS)

    window.print()
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
