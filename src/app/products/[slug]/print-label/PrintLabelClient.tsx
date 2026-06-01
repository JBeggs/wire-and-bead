'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import ProductPrintLabelCard from '@/components/products/ProductPrintLabelCard'
import {
  buildDynamicPageCss,
  LABEL_PAPER_OPTIONS,
  readStoredPaperSize,
  readStoredThermalMode,
  storePaperSize,
  storeThermalMode,
  type LabelPaperSize,
  type ProductPrintLabelData,
} from '@/lib/product-print-label'

const PRINT_LABEL_BODY_CLASS = 'product-print-label-active'

type PrintLabelClientProps = ProductPrintLabelData & {
  productSlug: string
}

export default function PrintLabelClient({ productSlug, ...label }: PrintLabelClientProps) {
  const [printing, setPrinting] = useState(false)
  const [paperSize, setPaperSize] = useState<LabelPaperSize>('80mm')
  const [thermalMode, setThermalMode] = useState(true)

  useEffect(() => {
    setPaperSize(readStoredPaperSize())
    setThermalMode(readStoredThermalMode())
    document.body.classList.add(PRINT_LABEL_BODY_CLASS)
    return () => {
      document.body.classList.remove(PRINT_LABEL_BODY_CLASS)
    }
  }, [])

  const paperOption = useMemo(
    () => LABEL_PAPER_OPTIONS.find((o) => o.id === paperSize) ?? LABEL_PAPER_OPTIONS[0],
    [paperSize],
  )

  const dynamicPageCss = useMemo(() => buildDynamicPageCss(paperSize), [paperSize])

  const handlePaperChange = (value: LabelPaperSize) => {
    setPaperSize(value)
    storePaperSize(value)
  }

  const handleThermalChange = (checked: boolean) => {
    setThermalMode(checked)
    storeThermalMode(checked)
  }

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
      <style dangerouslySetInnerHTML={{ __html: dynamicPageCss }} />

      <div data-print-chrome className="no-print mx-auto mb-6 max-w-lg space-y-4">
        <div className="flex items-center justify-between gap-3">
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

        <div className="rounded-2xl border border-[#e8e4df] bg-white p-4 text-sm text-[#141414] shadow-sm">
          <p className="mb-3 font-semibold">Print settings</p>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8a837a]">
              Paper width
            </span>
            <select
              value={paperSize}
              onChange={(e) => handlePaperChange(e.target.value as LabelPaperSize)}
              className="w-full rounded-lg border border-[#e8e4df] bg-white px-3 py-2 text-sm"
            >
              {LABEL_PAPER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-[#8a837a]">{paperOption.hint}</span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={thermalMode}
              onChange={(e) => handleThermalChange(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#e8e4df]"
            />
            <span>
              <span className="font-medium">Thermal printer mode</span>
              <span className="mt-0.5 block text-xs text-[#8a837a]">
                Pure black &amp; white, no grey backgrounds, square corners — best for receipt and
                label printers.
              </span>
            </span>
          </label>

          <div className="mt-4 rounded-lg bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#5c574f]">
            <p className="font-semibold text-[#141414]">In your phone&apos;s print dialog:</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Set margins to <strong>None</strong> (or minimum)</li>
              <li>Turn off <strong>Headers &amp; footers</strong></li>
              <li>Select your thermal printer, or choose paper size to match above</li>
              <li>Images are already greyscale for thermal output</li>
            </ul>
          </div>
        </div>
      </div>

      <ProductPrintLabelCard
        {...label}
        paperSize={paperSize}
        thermalMode={thermalMode}
        previewWidth={paperOption.previewWidth}
      />
    </div>
  )
}
