'use client'

import Link from 'next/link'
import { Printer } from 'lucide-react'
import type { Product } from '@/lib/types'

type PrintProduct = Pick<Product, 'slug'>

interface ProductPrintLabelButtonProps {
  product: PrintProduct
  variant?: 'button' | 'icon'
  className?: string
}

export default function ProductPrintLabelButton({
  product,
  variant = 'button',
  className = '',
}: ProductPrintLabelButtonProps) {
  const href = `/products/${product.slug}/print-label`

  if (variant === 'icon') {
    return (
      <Link
        href={href}
        className={`md:hidden p-2 text-text-muted hover:text-vintage-primary hover:bg-vintage-primary/5 rounded-lg transition-all ${className}`}
        title="Print label"
        aria-label="Open product print label"
      >
        <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
      </Link>
    )
  }

  return (
    <Link
      href={href}
      aria-label="Open product print label"
      className={`md:hidden flex w-full items-center justify-center gap-2 rounded-full border border-border-default bg-surface py-3 text-base font-medium text-text transition-colors hover:bg-bg active:scale-95 ${className}`}
    >
      <Printer className="w-5 h-5" aria-hidden="true" />
      Print label
    </Link>
  )
}
