export const DEFAULT_LABEL_ACCENT = '#B87333'

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

export const PRODUCT_PRINT_LABEL_CSS = `
  @page { margin: 8mm; }
  .product-print-label-root * { box-sizing: border-box; }
  .product-print-label-root {
    font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    color: #141414;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .product-print-label-root .label {
    max-width: 360px;
    margin: 0 auto;
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
    max-height: 52px;
    max-width: 180px;
    width: auto;
    object-fit: contain;
    margin: 0 auto 10px;
    display: block;
  }
  .product-print-label-root .brand-name {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--label-accent, #B87333);
    margin: 0;
  }
  .product-print-label-root .brand-tagline {
    margin: 4px 0 0;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b6560;
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
    margin-bottom: 14px;
  }
  .product-print-label-root .product-image {
    width: 100%;
    max-height: 190px;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }
  .product-print-label-root h1 {
    font-size: 19px;
    line-height: 1.25;
    margin: 0 0 8px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #141414;
  }
  .product-print-label-root .desc {
    font-size: 11px;
    line-height: 1.45;
    color: #5c574f;
    margin: 0 0 12px;
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
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--label-accent, #B87333);
  }
  .product-print-label-root .compare {
    font-size: 14px;
    color: #9a948c;
    text-decoration: line-through;
    font-weight: 500;
  }
  .product-print-label-root .meta {
    display: inline-block;
    text-align: left;
    background: #faf9f7;
    border: 1px solid #ece8e3;
    border-radius: 10px;
    padding: 10px 14px;
    margin-bottom: 12px;
    min-width: 78%;
  }
  .product-print-label-root .meta-row {
    font-size: 10px;
    line-height: 1.5;
    color: #5c574f;
  }
  .product-print-label-root .meta-row + .meta-row { margin-top: 4px; }
  .product-print-label-root .meta-label {
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #8a837a;
    font-size: 9px;
    margin-right: 6px;
  }
  .product-print-label-root .meta-value {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #141414;
  }
  .product-print-label-root .owner-name {
    font-weight: 600;
    color: #141414;
    font-size: 11px;
  }
  .product-print-label-root .footer {
    padding: 14px 18px 16px;
    background: #faf9f7;
    border-top: 1px solid #ece8e3;
    text-align: center;
  }
  .product-print-label-root .scan-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--label-accent, #B87333);
    margin-bottom: 8px;
  }
  .product-print-label-root .qr {
    width: 132px;
    margin: 0 auto 8px;
    padding: 8px;
    background: #fff;
    border: 1px solid #ece8e3;
    border-radius: 10px;
  }
  .product-print-label-root .qr svg {
    width: 116px;
    height: 116px;
    display: block;
    margin: 0 auto;
  }
  .product-print-label-root .url {
    font-size: 9px;
    color: #8a837a;
    word-break: break-all;
    line-height: 1.35;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  @media print {
    [data-print-chrome] { display: none !important; }
    body { background: #fff !important; }
    .product-print-label-page { padding: 0 !important; background: #fff !important; }
    .product-print-label-root .card { box-shadow: none; }
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
