export const DEFAULT_LABEL_ACCENT = '#B87333'

export type LabelPaperSize = '58mm' | '80mm' | '100mm' | 'full'

export const LABEL_PAPER_OPTIONS: Array<{
  id: LabelPaperSize
  label: string
  hint: string
  pageSize: string
  previewWidth: string
}> = [
  {
    id: '80mm',
    label: '80mm thermal',
    hint: 'Most common receipt / label printers (3.15")',
    pageSize: '80mm auto',
    previewWidth: '80mm',
  },
  {
    id: '58mm',
    label: '58mm thermal',
    hint: 'Narrow receipt printers (2.28")',
    pageSize: '58mm auto',
    previewWidth: '58mm',
  },
  {
    id: '100mm',
    label: '100mm label',
    hint: 'Wide shipping / shelf labels (~4")',
    pageSize: '100mm auto',
    previewWidth: '100mm',
  },
  {
    id: 'full',
    label: 'Full page',
    hint: 'A4 / Letter — label fills the sheet',
    pageSize: 'auto',
    previewWidth: '100%',
  },
]

const PAPER_STORAGE_KEY = 'print-label-paper'
const THERMAL_STORAGE_KEY = 'print-label-thermal'

export function readStoredPaperSize(): LabelPaperSize {
  if (typeof window === 'undefined') return '80mm'
  const v = window.sessionStorage.getItem(PAPER_STORAGE_KEY)
  return LABEL_PAPER_OPTIONS.some((o) => o.id === v) ? (v as LabelPaperSize) : '80mm'
}

export function readStoredThermalMode(): boolean {
  if (typeof window === 'undefined') return true
  const v = window.sessionStorage.getItem(THERMAL_STORAGE_KEY)
  return v !== 'false'
}

export function storePaperSize(size: LabelPaperSize): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(PAPER_STORAGE_KEY, size)
}

export function storeThermalMode(thermal: boolean): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(THERMAL_STORAGE_KEY, thermal ? 'true' : 'false')
}

export function labelTypeScale(paperSize: LabelPaperSize): number {
  if (paperSize === '58mm') return 0.88
  if (paperSize === '100mm') return 1.08
  if (paperSize === 'full') return 1.2
  return 1
}

export function buildDynamicPageCss(paperSize: LabelPaperSize): string {
  const option = LABEL_PAPER_OPTIONS.find((o) => o.id === paperSize) ?? LABEL_PAPER_OPTIONS[0]
  const fullPage = paperSize === 'full'
  const typeScale = labelTypeScale(paperSize)
  return `
@media print {
  @page {
    margin: 0;
    size: ${option.pageSize};
  }
  html, body {
    width: ${fullPage ? '100%' : option.previewWidth} !important;
    max-width: 100% !important;
    height: auto !important;
    min-height: ${fullPage ? '100vh' : 'auto'} !important;
    font-size: 16px !important;
    -webkit-text-size-adjust: none !important;
    text-size-adjust: none !important;
  }
  .product-print-label-page,
  .product-print-label-root,
  .product-print-label-root .label,
  .product-print-label-root .card {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
  }
  .product-print-label-root {
    --label-type-scale: ${typeScale};
    -webkit-text-size-adjust: none !important;
    text-size-adjust: none !important;
  }
  .product-print-label-root .label {
    max-width: none !important;
  }
  .product-print-label-root .card {
    border-radius: ${fullPage ? '0' : '0'};
    min-height: ${fullPage ? '100vh' : 'auto'};
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
`
}

export function resolveLabelAccentColor(brandColor?: string | null): string {
  const raw = String(brandColor || '').trim()
  if (/^#[0-9A-Fa-f]{3,8}$/.test(raw)) return raw
  if (/^rgb\(/i.test(raw)) return raw
  return DEFAULT_LABEL_ACCENT
}

export function labelAccentSoft(accent: string): string {
  if (accent.startsWith('#') && accent.length === 7) {
    return `${accent}18`
  }
  return 'rgba(184, 115, 51, 0.12)'
}

/** Split a product URL across up to 3 lines for label printing. */
export function formatPrintLabelUrlLines(url: string): string[] {
  const trimmed = url.trim()
  if (!trimmed) return []

  try {
    const absolute = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
    const parsed = new URL(absolute)
    const origin = `${parsed.protocol}//${parsed.host}`
    const pathAndQuery = `${parsed.pathname}${parsed.search}${parsed.hash}`.replace(/^\//, '')

    if (!pathAndQuery) return [origin]

    const lines = [origin]
    if (pathAndQuery.length <= 32) {
      lines.push(pathAndQuery)
      return lines
    }

    const segments = pathAndQuery.split('/')
    if (segments.length >= 2) {
      const mid = Math.ceil(segments.length / 2)
      lines.push(segments.slice(0, mid).join('/'))
      const tail = segments.slice(mid).join('/')
      if (tail) lines.push(tail)
      return lines.filter(Boolean).slice(0, 3)
    }

    const chunk = Math.ceil(pathAndQuery.length / 2)
    lines.push(pathAndQuery.slice(0, chunk))
    lines.push(pathAndQuery.slice(chunk))
    return lines.filter(Boolean).slice(0, 3)
  } catch {
    const chunk = Math.ceil(trimmed.length / 3)
    return [
      trimmed.slice(0, chunk),
      trimmed.slice(chunk, chunk * 2),
      trimmed.slice(chunk * 2),
    ].filter(Boolean)
  }
}

export const PRODUCT_PRINT_LABEL_CSS = `
  .product-print-label-root * { box-sizing: border-box; }
  .product-print-label-root {
    font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    color: #141414;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    --label-media-size: 90%;
    --label-type-scale: 1;
    /* Screen preview only — mm renders large on monitors; PDF uses 1. */
    --label-preview-scale: 0.58;
    /* Physical units so screen preview and PDF/print render the same size. */
    --label-fs-brand: calc(12mm * var(--label-type-scale) * var(--label-preview-scale));
    --label-fs-tagline: calc(7mm * var(--label-type-scale) * var(--label-preview-scale));
    --label-fs-title: calc(13mm * var(--label-type-scale) * var(--label-preview-scale));
    --label-fs-desc: calc(13mm * var(--label-type-scale) * var(--label-preview-scale));
    --label-fs-price: calc(17mm * var(--label-type-scale) * var(--label-preview-scale));
    --label-fs-compare: calc(8.5mm * var(--label-type-scale) * var(--label-preview-scale));
    --label-fs-meta: calc(9.5mm * var(--label-type-scale) * var(--label-preview-scale));
    --label-fs-meta-label: calc(7.5mm * var(--label-type-scale) * var(--label-preview-scale));
    --label-fs-phone: calc(12mm * var(--label-type-scale) * var(--label-preview-scale));
    --label-fs-scan: calc(13mm * var(--label-type-scale) * var(--label-preview-scale));
    --label-fs-url: calc(8mm * var(--label-type-scale) * var(--label-preview-scale));
  }
  .product-print-label-root .label {
    max-width: 360px;
    margin: 0 auto;
    width: 100%;
  }
  .product-print-label-root .card {
    border: 1.5px solid #e8e4df;
    border-radius: 14px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 8px 28px rgba(20, 20, 20, 0.08);
  }
  .product-print-label-root .header {
    padding: 16px 18px 14px;
    text-align: center;
    border-bottom: 3px solid var(--label-accent, #B87333);
    background: linear-gradient(180deg, var(--label-accent-soft, rgba(184,115,51,0.12)) 0%, #fff 100%);
  }
  .product-print-label-root .logo {
    width: 90%;
    max-width: 90%;
    height: auto;
    object-fit: contain;
    margin: 0 auto 16px;
    display: block;
    filter: grayscale(100%);
    -webkit-filter: grayscale(100%);
  }
  .product-print-label-root .brand-name {
    font-size: var(--label-fs-brand);
    line-height: 1.1;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--label-accent, #B87333);
    margin: 0 auto;
    width: 90%;
  }
  .product-print-label-root .brand-tagline {
    margin: 12px auto 0;
    font-size: var(--label-fs-tagline);
    line-height: 1.3;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #6b6560;
    width: 90%;
  }
  .product-print-label-root .body {
    padding: 16px 18px 14px;
    text-align: center;
  }
  .product-print-label-root .photo-frame {
    background: #f7f5f2;
    border: 1px solid #ece8e3;
    border-radius: 12px;
    padding: 10px;
    margin: 0 auto 14px;
    width: var(--label-media-size);
    max-width: 100%;
  }
  .product-print-label-root .product-image {
    width: 100%;
    height: auto;
    aspect-ratio: 1 / 1;
    max-height: none;
    object-fit: contain;
    display: block;
    margin: 0 auto;
    filter: grayscale(100%);
    -webkit-filter: grayscale(100%);
  }
  .product-print-label-root h1 {
    font-size: var(--label-fs-title);
    line-height: 1.15;
    margin: 0 auto 18px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #141414;
    width: 90%;
  }
  .product-print-label-root .desc {
    font-size: var(--label-fs-desc);
    line-height: 1.4;
    color: #5c574f;
    margin: 0 auto 22px;
    width: 90%;
  }
  .product-print-label-root .price-row {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }
  .product-print-label-root .price {
    font-size: var(--label-fs-price);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--label-accent, #B87333);
  }
  .product-print-label-root .compare {
    font-size: var(--label-fs-compare);
    color: #9a948c;
    text-decoration: line-through;
    font-weight: 500;
  }
  .product-print-label-root .meta {
    display: block;
    text-align: center;
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 16px 18px;
    margin: 0 auto 12px;
    width: 90%;
  }
  .product-print-label-root .meta-row {
    font-size: var(--label-fs-meta);
    line-height: 1.4;
    color: #5c574f;
    text-align: center;
  }
  .product-print-label-root .meta-row + .meta-row { margin-top: 16px; }
  .product-print-label-root .meta-label {
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #8a837a;
    font-size: var(--label-fs-meta-label);
    margin-right: 0;
    display: block;
    margin-bottom: 4px;
  }
  .product-print-label-root .meta-value {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #141414;
    font-size: var(--label-fs-meta);
    display: block;
  }
  .product-print-label-root .owner-name {
    font-weight: 600;
    color: #141414;
    font-size: var(--label-fs-meta);
    display: block;
  }
  .product-print-label-root .meta-row-phone {
    margin-top: 12px;
  }
  .product-print-label-root .meta-phone {
    font-size: var(--label-fs-phone);
    font-weight: 800;
    font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    letter-spacing: 0.02em;
  }
  .product-print-label-root .footer {
    padding: 14px 18px 16px;
    background: #faf9f7;
    border-top: 1px solid #ece8e3;
    text-align: center;
  }
  .product-print-label-root .scan-label {
    font-size: var(--label-fs-scan);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--label-accent, #B87333);
    margin-bottom: 16px;
  }
  .product-print-label-root .qr {
    width: var(--label-media-size);
    max-width: 100%;
    margin: 0 auto 8px;
    padding: 8px;
    background: #fff;
    border: 1px solid #ece8e3;
    border-radius: 10px;
    box-sizing: border-box;
  }
  .product-print-label-root .qr svg {
    width: 100%;
    height: auto;
    aspect-ratio: 1 / 1;
    display: block;
    margin: 0 auto;
  }
  .product-print-label-root .url {
    font-size: var(--label-fs-url);
    color: #8a837a;
    line-height: 1.35;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    width: 90%;
    margin: 12px auto 0;
    padding-bottom: 6mm;
  }
  .product-print-label-root .url-line {
    display: block;
    word-break: break-all;
  }
  .product-print-label-root .page-qr .footer {
    padding-bottom: 10mm;
  }

  /* Thermal mode — high contrast, no grey fills or accent colour */
  .product-print-label-root[data-thermal="true"] .header {
    background: #fff !important;
    border-bottom: 2px solid #000;
  }
  .product-print-label-root[data-thermal="true"] .brand-name,
  .product-print-label-root[data-thermal="true"] .brand-tagline,
  .product-print-label-root[data-thermal="true"] .price,
  .product-print-label-root[data-thermal="true"] .scan-label,
  .product-print-label-root[data-thermal="true"] h1,
  .product-print-label-root[data-thermal="true"] .desc,
  .product-print-label-root[data-thermal="true"] .meta-row,
  .product-print-label-root[data-thermal="true"] .meta-label,
  .product-print-label-root[data-thermal="true"] .meta-value,
  .product-print-label-root[data-thermal="true"] .owner-name,
  .product-print-label-root[data-thermal="true"] .meta-phone,
  .product-print-label-root[data-thermal="true"] .url,
  .product-print-label-root[data-thermal="true"] .compare {
    color: #000 !important;
  }
  .product-print-label-root[data-thermal="true"] .photo-frame,
  .product-print-label-root[data-thermal="true"] .footer,
  .product-print-label-root[data-thermal="true"] .qr {
    background: #fff !important;
    border-color: #000 !important;
    border-radius: 0;
  }
  .product-print-label-root[data-thermal="true"] .meta {
    background: transparent !important;
    border: none !important;
    border-radius: 0;
  }
  .product-print-label-root[data-thermal="true"] .card {
    border: 1px solid #000;
    border-radius: 0;
    box-shadow: none;
  }
  .product-print-label-root[data-thermal="true"] .qr svg {
    filter: contrast(1.25);
  }

  @media print {
    html, body {
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    body.product-print-label-active header,
    body.product-print-label-active footer,
    body.product-print-label-active nav,
    body.product-print-label-active [data-print-chrome],
    body.product-print-label-active [data-cookie-consent],
    body.product-print-label-active .no-print {
      display: none !important;
      visibility: hidden !important;
    }
    .product-print-label-page {
      padding: 0 !important;
      background: #fff !important;
      min-height: auto !important;
    }
    .product-print-label-root .card { box-shadow: none; }
    .product-print-label-root .logo,
    .product-print-label-root .product-image {
      filter: grayscale(100%) !important;
      -webkit-filter: grayscale(100%) !important;
    }
    .product-print-label-root[data-thermal="true"] .header {
      background: #fff !important;
    }
    /* Full-size type in print/PDF (screen preview uses --label-preview-scale). */
    .product-print-label-root {
      --label-preview-scale: 1;
      --label-fs-brand: calc(12mm * var(--label-type-scale));
      --label-fs-tagline: calc(7mm * var(--label-type-scale));
      --label-fs-title: calc(13mm * var(--label-type-scale));
      --label-fs-desc: calc(13mm * var(--label-type-scale));
      --label-fs-price: calc(17mm * var(--label-type-scale));
      --label-fs-compare: calc(8.5mm * var(--label-type-scale));
      --label-fs-meta: calc(9.5mm * var(--label-type-scale));
      --label-fs-meta-label: calc(7.5mm * var(--label-type-scale));
      --label-fs-phone: calc(12mm * var(--label-type-scale));
      --label-fs-scan: calc(13mm * var(--label-type-scale));
      --label-fs-url: calc(8mm * var(--label-type-scale));
    }
    /* Lock typography in print/PDF — browsers often shrink px text vs screen preview. */
    .product-print-label-root,
    .product-print-label-root * {
      -webkit-text-size-adjust: none !important;
      text-size-adjust: none !important;
    }
    .product-print-label-root .brand-name { font-size: var(--label-fs-brand) !important; }
    .product-print-label-root .brand-tagline { font-size: var(--label-fs-tagline) !important; }
    .product-print-label-root h1 { font-size: var(--label-fs-title) !important; }
    .product-print-label-root .desc { font-size: var(--label-fs-desc) !important; }
    .product-print-label-root .price { font-size: var(--label-fs-price) !important; }
    .product-print-label-root .compare { font-size: var(--label-fs-compare) !important; }
    .product-print-label-root .meta-row,
    .product-print-label-root .meta-value,
    .product-print-label-root .owner-name { font-size: var(--label-fs-meta) !important; }
    .product-print-label-root .meta-label { font-size: var(--label-fs-meta-label) !important; }
    .product-print-label-root .meta-phone { font-size: var(--label-fs-phone) !important; font-weight: 800 !important; }
    .product-print-label-root .scan-label { font-size: var(--label-fs-scan) !important; }
    .product-print-label-root .url { font-size: var(--label-fs-url) !important; }
    .product-print-label-root .meta {
      background: transparent !important;
      border: none !important;
      text-align: center !important;
    }
    .product-print-label-root .meta-row,
    .product-print-label-root .meta-value,
    .product-print-label-root .owner-name {
      text-align: center !important;
    }
    /* Three pages: 1) brand + contact, 2) product, 3) QR code. */
    .product-print-label-root .card {
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    .product-print-label-root .page {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .product-print-label-root .page + .page {
      page-break-before: always !important;
      break-before: page !important;
    }
  }
`

export type ProductPrintLabelData = {
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
  ownerName: string | null
  ownerPhone: string | null
}
