'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import {
  labelAccentSoft,
  PRODUCT_PRINT_LABEL_CSS,
  type LabelPaperSize,
  type ProductPrintLabelData,
} from '@/lib/product-print-label'

type ProductPrintLabelCardProps = ProductPrintLabelData & {
  paperSize?: LabelPaperSize
  thermalMode?: boolean
  previewWidth?: string
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
            maxWidth: previewWidth,
            width: '100%',
          } as React.CSSProperties
        }
      >
        <div className="label">
          <div className="card">
            <section className="page page-brand">
              <div className="header">
                {logoSrc ? <img className="logo" src={logoSrc} alt={companyName} /> : null}
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
                  <img className="product-image" src={imageSrc} alt="" />
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
