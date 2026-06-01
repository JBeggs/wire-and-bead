'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import ProductPrintLabelCard from '@/components/products/ProductPrintLabelCard'
import type { ProductPrintLabelData } from '@/lib/product-print-label'

type PrintLabelClientProps = ProductPrintLabelData & {
  productSlug: string
}

export default function PrintLabelClient({ productSlug, ...label }: PrintLabelClientProps) {
  const [printing, setPrinting] = useState(false)

  const handlePrint = useCallback(async () => {
    setPrinting(true)
    try {
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('.product-print-label-root img'))
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
            new Promise<void>((resolve) => window.setTimeout(resolve, 8000)),
          ]),
        ),
      )
      window.print()
    } finally {
      setPrinting(false)
    }
  }, [])

  return (
    <div className="product-print-label-page min-h-screen bg-[#f3f1ed] px-4 py-6">
      <div data-print-chrome className="mx-auto mb-6 flex max-w-md items-center justify-between gap-3">
        <Link
          href={`/products/${productSlug}`}
          className="inline-flex items-center gap-2 rounded-full border border-[#e8e4df] bg-white px-4 py-2 text-sm font-medium text-[#141414]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <button
          type="button"
          onClick={() => void handlePrint()}
          disabled={printing}
          className="inline-flex items-center gap-2 rounded-full bg-[#B87333] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Printer className="h-4 w-4" />
          {printing ? 'Preparing…' : 'Print / Save PDF'}
        </button>
      </div>

      <ProductPrintLabelCard {...label} />
    </div>
  )
}
