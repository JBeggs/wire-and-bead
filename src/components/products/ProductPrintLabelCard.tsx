'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import {
  labelAccentSoft,
  labelTypeScale,
  PRODUCT_PRINT_LABEL_CSS,
  type LabelPaperSize,
  type ProductPrintLabelData,
} from '@/lib/product-print-label'

type ProductPrintLabelCardProps = ProductPrintLabelData & {
  paperSize?: LabelPaperSize
  thermalMode?: boolean
  previewWidth?: string
}

// Pixel width images are downscaled to for low-res thermal printers.
const LOW_RES_TARGET_WIDTH = 384

// Vector (SVG) sources are resolution-independent and rasterise to a blank
// canvas, so they must never be downscaled — keep the crisp original.
function isVectorSource(src: string): boolean {
  return /\.svg\b/i.test(src) || /image\/svg/i.test(src)
}

// Redraw an image at a low pixel width so it prints cleanly on low-res
// (thermal) printers. Resolves to null on canvas taint / load failure so the
// caller can keep the original source.
function downscaleToDataUrl(src: string, targetWidth: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const w = Math.min(targetWidth, img.naturalWidth || targetWidth)
        const scale = w / (img.naturalWidth || w)
        const h = Math.max(1, Math.round((img.naturalHeight || w) * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.imageSmoothingEnabled = true
        ctx.drawImage(img, 0, 0, w, h)
        const dataUrl = canvas.toDataURL('image/png')
        resolve(dataUrl.startsWith('data:image') ? dataUrl : null)
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export default function ProductPrintLabelCard({
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
  ownerName,
  ownerPhone,
  paperSize = '80mm',
  thermalMode = true,
  previewWidth = '80mm',
}: ProductPrintLabelCardProps) {
  const [qrSvg, setQrSvg] = useState('')
  const [lowResImage, setLowResImage] = useState(imageSrc)
  const [lowResLogo, setLowResLogo] = useState(logoSrc)

  useEffect(() => {
    let cancelled = false
    void QRCode.toString(productUrl, {
      type: 'svg',
      width: 180,
      margin: 1,
      errorCorrectionLevel: 'M',
    }).then((svg) => {
      if (!cancelled) setQrSvg(svg)
    })
    return () => {
      cancelled = true
    }
  }, [productUrl])

  // Downscale the product image to a low pixel width so it prints cleanly on
  // low-resolution (thermal) printers instead of muddy, over-detailed greys.
  useEffect(() => {
    let cancelled = false
    setLowResImage(imageSrc)
    if (!imageSrc || isVectorSource(imageSrc)) return
    void downscaleToDataUrl(imageSrc, LOW_RES_TARGET_WIDTH).then((dataUrl) => {
      if (!cancelled && dataUrl) setLowResImage(dataUrl)
    })
    return () => {
      cancelled = true
    }
  }, [imageSrc])

  // Downscale the logo the same way for low-res printers.
  useEffect(() => {
    let cancelled = false
    setLowResLogo(logoSrc)
    if (!logoSrc || isVectorSource(logoSrc)) return
    void downscaleToDataUrl(logoSrc, LOW_RES_TARGET_WIDTH).then((dataUrl) => {
      if (!cancelled && dataUrl) setLowResLogo(dataUrl)
    })
    return () => {
      cancelled = true
    }
  }, [logoSrc])

  const soft = labelAccentSoft(accent)

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRODUCT_PRINT_LABEL_CSS }} />
      <div
        className="product-print-label-root mx-auto"
        data-thermal={thermalMode ? 'true' : 'false'}
        data-paper={paperSize}
        style={
          {
            '--label-accent': accent,
            '--label-accent-soft': soft,
            '--label-type-scale': labelTypeScale(paperSize),
            maxWidth: previewWidth,
            width: '100%',
          } as React.CSSProperties
        }
      >
        <div className="label">
          <div className="card">
            <section className="page page-brand">
              <div className="header">
                {lowResLogo ? <img className="logo" src={lowResLogo} alt={companyName} /> : null}
                <p className="brand-name">{companyName}</p>
                {tagline ? <p className="brand-tagline">{tagline}</p> : null}
              </div>
              {sku || ownerName || ownerPhone ? (
                <div className="meta">
                  {sku ? (
                    <div className="meta-row">
                      <span className="meta-label">SKU</span>
                      <span className="meta-value">{sku}</span>
                    </div>
                  ) : null}
                  {ownerName ? (
                    <div className="meta-row">
                      <span className="meta-label">Contact</span>
                      <span className="owner-name">{ownerName}</span>
                    </div>
                  ) : null}
                  {ownerPhone ? (
                    <div className="meta-row">
                      <span className="meta-value">{ownerPhone}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="page page-product">
              <div className="body">
                <div className="photo-frame">
                  <img className="product-image" src={lowResImage} alt="" />
                </div>
                <h1>{productName}</h1>
                {description ? <p className="desc">{description}</p> : null}
                <div className="price-row">
                  <span className="price">{price}</span>
                  {comparePrice ? <span className="compare">{comparePrice}</span> : null}
                </div>
              </div>
            </section>

            <section className="page page-qr">
              <div className="footer">
                <div className="scan-label">Scan to view online</div>
                {qrSvg ? (
                  <div className="qr" role="img" aria-label="QR code" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                ) : (
                  <div className="qr" aria-hidden="true" />
                )}
                <div className="url">{productUrl}</div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
