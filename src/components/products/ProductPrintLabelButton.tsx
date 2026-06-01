'use client'

import { useCallback } from 'react'
import QRCode from 'qrcode'
import { Printer } from 'lucide-react'
import { getLogoCardUrl, getProductCardImages } from '@/lib/image-utils'
import { formatMoney } from '@/lib/money'
import { formatOwnerName } from '@/lib/format-owner-name'
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
  | 'owner_first_name'
  | 'owner_last_name'
> & {
  image_thumbnail?: string | null
  image_thumbnails?: string[] | null
}

interface ProductPrintLabelButtonProps {
  product: PrintProduct
  companyName: string
  currency: string
  locale: string
  ownerName?: string | null
  ownerPhone?: string | null
  logoUrl?: string | null
  tagline?: string | null
  brandColor?: string | null
  variant?: 'button' | 'icon'
  className?: string
}

const IMAGE_LOAD_TIMEOUT_MS = 8000
const DEFAULT_ACCENT = '#B87333'

function resolveAccentColor(brandColor?: string | null): string {
  const raw = String(brandColor || '').trim()
  if (/^#[0-9A-Fa-f]{3,8}$/.test(raw)) return raw
  if (/^rgb\(/i.test(raw)) return raw
  return DEFAULT_ACCENT
}

function accentSoft(accent: string): string {
  if (accent.startsWith('#') && accent.length === 7) {
    return `${accent}18`
  }
  return 'rgba(184, 115, 51, 0.12)'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Safe for HTML attribute values (data URLs, proxied media paths). */
function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function buildPrintDocument(args: {
  companyName: string
  tagline: string | null
  accent: string
  logoSrc: string | null
  productName: string
  price: string
  comparePrice: string | null
  sku: string | null
  description: string
  imageSrc: string
  productUrl: string
  qrSvg: string
  ownerName: string | null
  ownerPhone: string | null
}): string {
  const {
    companyName,
    tagline,
    accent,
    logoSrc,
    productName,
    price,
    comparePrice,
    sku,
    description,
    imageSrc,
    productUrl,
    qrSvg,
    ownerName,
    ownerPhone,
  } = args

  const soft = accentSoft(accent)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(productName)}</title>
  <style>
    @page { margin: 8mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      color: #141414;
      margin: 0;
      padding: 0;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label {
      max-width: 360px;
      margin: 0 auto;
    }
    .card {
      border: 1.5px solid #e8e4df;
      border-radius: 14px;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 8px 28px rgba(20, 20, 20, 0.08);
    }
    .header {
      padding: 16px 18px 14px;
      text-align: center;
      background: linear-gradient(180deg, ${soft} 0%, #fff 100%);
      border-bottom: 3px solid ${accent};
    }
    .logo {
      max-height: 52px;
      max-width: 180px;
      width: auto;
      object-fit: contain;
      margin: 0 auto 10px;
      display: block;
    }
    .brand-name {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: ${accent};
      margin: 0;
    }
    .brand-tagline {
      margin: 4px 0 0;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #6b6560;
    }
    .body {
      padding: 16px 18px 14px;
      text-align: center;
    }
    .photo-frame {
      background: #f7f5f2;
      border: 1px solid #ece8e3;
      border-radius: 12px;
      padding: 10px;
      margin-bottom: 14px;
    }
    .product-image {
      width: 100%;
      max-height: 190px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    h1 {
      font-size: 19px;
      line-height: 1.25;
      margin: 0 0 8px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #141414;
    }
    .desc {
      font-size: 11px;
      line-height: 1.45;
      color: #5c574f;
      margin: 0 0 12px;
    }
    .price-row {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .price {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: ${accent};
    }
    .compare {
      font-size: 14px;
      color: #9a948c;
      text-decoration: line-through;
      font-weight: 500;
    }
    .meta {
      display: inline-block;
      text-align: left;
      background: #faf9f7;
      border: 1px solid #ece8e3;
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 12px;
      min-width: 78%;
    }
    .meta-row {
      font-size: 10px;
      line-height: 1.5;
      color: #5c574f;
    }
    .meta-row + .meta-row { margin-top: 4px; }
    .meta-label {
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #8a837a;
      font-size: 9px;
      margin-right: 6px;
    }
    .meta-value {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #141414;
    }
    .owner-name {
      font-weight: 600;
      color: #141414;
      font-size: 11px;
    }
    .footer {
      padding: 14px 18px 16px;
      background: #faf9f7;
      border-top: 1px solid #ece8e3;
      text-align: center;
    }
    .scan-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: ${accent};
      margin-bottom: 8px;
    }
    .qr {
      width: 132px;
      margin: 0 auto 8px;
      padding: 8px;
      background: #fff;
      border: 1px solid #ece8e3;
      border-radius: 10px;
    }
    .qr svg {
      width: 116px;
      height: 116px;
      display: block;
      margin: 0 auto;
    }
    .url {
      font-size: 9px;
      color: #8a837a;
      word-break: break-all;
      line-height: 1.35;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="card">
      <div class="header">
        ${
          logoSrc
            ? `<img class="logo" src="${escapeAttr(logoSrc)}" alt="${escapeAttr(companyName)}" />`
            : ''
        }
        <p class="brand-name">${escapeHtml(companyName)}</p>
        ${tagline ? `<p class="brand-tagline">${escapeHtml(tagline)}</p>` : ''}
      </div>
      <div class="body">
        <div class="photo-frame">
          <img class="product-image" src="${escapeAttr(imageSrc)}" alt="" />
        </div>
        <h1>${escapeHtml(productName)}</h1>
        ${description ? `<p class="desc">${escapeHtml(description)}</p>` : ''}
        <div class="price-row">
          <span class="price">${escapeHtml(price)}</span>
          ${comparePrice ? `<span class="compare">${escapeHtml(comparePrice)}</span>` : ''}
        </div>
        ${
          sku || ownerName || ownerPhone
            ? `<div class="meta">${
                sku
                  ? `<div class="meta-row"><span class="meta-label">SKU</span><span class="meta-value">${escapeHtml(sku)}</span></div>`
                  : ''
              }${
                ownerName
                  ? `<div class="meta-row"><span class="meta-label">Contact</span><span class="owner-name">${escapeHtml(ownerName)}</span></div>`
                  : ''
              }${
                ownerPhone
                  ? `<div class="meta-row"><span class="meta-value">${escapeHtml(ownerPhone)}</span></div>`
                  : ''
              }</div>`
            : ''
        }
      </div>
      <div class="footer">
        <div class="scan-label">Scan to view online</div>
        <div class="qr" role="img" aria-label="QR code">${qrSvg}</div>
        <div class="url">${escapeHtml(productUrl)}</div>
      </div>
    </div>
  </div>
</body>
</html>`
}

function toAbsoluteFetchUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url
  if (typeof window === 'undefined') return url
  return `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`
}

function imageFromLoadedDom(proxiedUrl: string): string | null {
  if (typeof document === 'undefined' || !proxiedUrl) return null
  const absolute = toAbsoluteFetchUrl(proxiedUrl)
  const candidates = document.querySelectorAll<HTMLImageElement>('img')
  for (const img of candidates) {
    const src = img.currentSrc || img.src
    if (!src) continue
    if (src !== absolute && src !== proxiedUrl && !src.endsWith(proxiedUrl)) continue
    if (!img.complete || img.naturalWidth === 0) continue
    try {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) continue
      ctx.drawImage(img, 0, 0)
      return canvas.toDataURL('image/jpeg', 0.92)
    } catch {
      continue
    }
  }
  return null
}

async function fetchImageDataUrl(url: string): Promise<string> {
  const absolute = toAbsoluteFetchUrl(url)
  if (!absolute || absolute.startsWith('data:')) return absolute

  const fromDom = imageFromLoadedDom(url)
  if (fromDom) return fromDom

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

async function waitForImages(doc: Document, timeoutMs: number): Promise<void> {
  const imgs = Array.from(doc.querySelectorAll('img'))
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
              /* continue */
            }
          }
          await new Promise<void>((resolve) => {
            if (img.complete && img.naturalHeight > 0) {
              resolve()
              return
            }
            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true })
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
  ownerName: ownerNameProp,
  ownerPhone,
  logoUrl,
  tagline,
  brandColor,
  variant = 'button',
  className = '',
}: ProductPrintLabelButtonProps) {
  const handlePrint = useCallback(async () => {
    if (typeof window === 'undefined') return

    const ownerName =
      ownerNameProp?.trim() ||
      formatOwnerName(product.owner_first_name, product.owner_last_name)
    const phone = ownerPhone?.trim() || null
    const accent = resolveAccentColor(brandColor)
    const taglineText = tagline?.trim() || null

    const productUrl = `${window.location.origin}/products/${product.slug}`
    const qrSvg = await QRCode.toString(productUrl, {
      type: 'svg',
      width: 180,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
    const logoCandidate = logoUrl ? getLogoCardUrl(null, logoUrl) : ''
    const logoSrc =
      logoCandidate && !logoCandidate.includes('default.svg')
        ? await fetchImageDataUrl(logoCandidate)
        : null
    const imageSrc = await fetchImageDataUrl(getProductCardImages(product)[0])
    const price = formatMoney(Number(product.price), currency, locale)
    const comparePrice =
      product.compare_at_price != null && Number(product.compare_at_price) > Number(product.price)
        ? formatMoney(Number(product.compare_at_price), currency, locale)
        : null
    const description = (product.short_description || '').replace(/\s+/g, ' ').trim().slice(0, 160)
    const sku = (product.sku || '').trim() || null

    const html = buildPrintDocument({
      companyName,
      tagline: taglineText,
      accent,
      logoSrc,
      productName: product.name,
      price,
      comparePrice,
      sku,
      description,
      imageSrc,
      productUrl,
      qrSvg,
      ownerName,
      ownerPhone: phone,
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

    const printAndCleanup = async () => {
      try {
        await waitForImages(doc, IMAGE_LOAD_TIMEOUT_MS)
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } finally {
        window.setTimeout(() => iframe.remove(), 2000)
      }
    }

    if (iframe.contentWindow?.document.readyState === 'complete') {
      await printAndCleanup()
    } else {
      iframe.onload = () => {
        void printAndCleanup()
      }
    }
  }, [brandColor, companyName, currency, locale, logoUrl, ownerNameProp, ownerPhone, product, tagline])

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
