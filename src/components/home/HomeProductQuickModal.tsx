'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X, ShoppingCart, Plus, Minus, Package, TimerReset } from 'lucide-react'
import { Product } from '@/lib/types'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  formatCountdown,
  getMinQuantity,
  getStockQuantity,
  isBundleProduct,
} from '@/lib/product-utils'
import { getProductBundleImages } from '@/lib/image-utils'

interface HomeProductQuickModalProps {
  product: Product
  open: boolean
  onClose: () => void
}

export default function HomeProductQuickModal({ product, open, onClose }: HomeProductQuickModalProps) {
  const { cart, addItemToCart, updateItemQuantity, removeItemFromCart } = useCart()
  const { showSuccess, showError } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(() => formatCountdown(product.timed_expires_at))

  const minQty = getMinQuantity(product)
  const isBundle = isBundleProduct(product)
  const stockQty = getStockQuantity(product)
  const maxQuantity = isBundle ? 1 : stockQty != null && stockQty > 0 ? Math.min(99, stockQty) : 99
  const isExpired = countdown === 'Expired'

  const lineItem = useMemo(
    () => (cart?.items ?? []).find((i) => String(i.product_id ?? i.id) === String(product.id)),
    [cart?.items, product.id]
  )
  const inCartQty = lineItem?.quantity ?? 0

  const heroImage = useMemo(() => {
    const urls = getProductBundleImages(product)
    return urls[0] || product.image || ''
  }, [product])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  /** Lock document scroll while modal is open (fixed-body pattern works on iOS Safari). */
  useEffect(() => {
    if (!open) return
    const body = document.body
    const scrollY = window.scrollY
    const prevOverflow = body.style.overflow
    const prevPosition = body.style.position
    const prevTop = body.style.top
    const prevLeft = body.style.left
    const prevRight = body.style.right
    const prevWidth = body.style.width

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'

    return () => {
      body.style.overflow = prevOverflow
      body.style.position = prevPosition
      body.style.top = prevTop
      body.style.left = prevLeft
      body.style.right = prevRight
      body.style.width = prevWidth
      window.scrollTo(0, scrollY)
    }
  }, [open])

  useEffect(() => {
    if (!product.timed_expires_at) {
      setCountdown('')
      return
    }
    setCountdown(formatCountdown(product.timed_expires_at))
    const t = window.setInterval(() => setCountdown(formatCountdown(product.timed_expires_at)), 1000)
    return () => window.clearInterval(t)
  }, [product.timed_expires_at])

  const handleAdd = async () => {
    if (isExpired) {
      showError('This timed product has expired')
      return
    }
    const cartHasBundle = cart?.items?.some((i) => i.is_bundle) ?? false
    if (isBundle && cartHasBundle) {
      showError('Bundles are limited to one per customer.')
      return
    }
    setLoading(true)
    try {
      await addItemToCart(product, minQty)
      showSuccess(`${product.name} added to cart`)
      router.refresh()
    } catch (e: any) {
      showError(e?.message || 'Failed to add to cart')
    } finally {
      setLoading(false)
    }
  }

  const handleInc = async () => {
    if (!lineItem || isExpired) return
    if (isBundle && lineItem.quantity >= 1) return
    const next = Math.min(maxQuantity, lineItem.quantity + 1)
    if (next === lineItem.quantity) return
    setLoading(true)
    try {
      await updateItemQuantity(String(product.id), next)
      router.refresh()
    } catch (e: any) {
      showError(e?.message || 'Could not update quantity')
    } finally {
      setLoading(false)
    }
  }

  const handleDec = async () => {
    if (!lineItem) return
    setLoading(true)
    try {
      if (lineItem.quantity <= 1) {
        await removeItemFromCart(String(product.id))
      } else {
        await updateItemQuantity(String(product.id), lineItem.quantity - 1)
      }
      router.refresh()
    } catch (e: any) {
      showError(e?.message || 'Could not update cart')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const isVintage = Array.isArray(product.tags) && product.tags.some((t) => (typeof t === 'string' ? t : t.name) === 'vintage')

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overscroll-contain bg-black/45 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="home-quick-view-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200 border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex justify-end p-2 bg-white/95 border-b border-gray-100 z-10">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-text-muted hover:bg-gray-100 hover:text-text transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 pt-2 space-y-4">
          {heroImage ? (
            <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
              <img src={heroImage} alt="" className="w-full h-full object-contain" />
            </div>
          ) : null}

          <div>
            <h2 id="home-quick-view-title" className="text-2xl font-bold font-playfair text-text leading-tight">
              {product.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className={`text-2xl font-bold ${isVintage ? 'text-vintage-primary' : 'text-modern-primary'}`}>
                R{Number(product.price).toFixed(2)}
              </span>
              {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
                <span className="text-lg text-text-muted line-through">R{Number(product.compare_at_price).toFixed(2)}</span>
              )}
            </div>
          </div>

          {isBundle && (
            <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
              <Package className="w-4 h-4" />
              Bundle
            </p>
          )}
          {product.timed_expires_at && (
            <p
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                isExpired ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              <TimerReset className="w-4 h-4" />
              {countdown || '—'}
            </p>
          )}

          {product.description ? (
            <p className="text-sm text-text-light leading-relaxed whitespace-pre-line line-clamp-8">{product.description}</p>
          ) : null}

          <div className="pt-2 border-t border-gray-100 space-y-4">
            {inCartQty < 1 ? (
              <button
                type="button"
                onClick={handleAdd}
                disabled={loading || isExpired || (isBundle && (cart?.items?.some((i) => i.is_bundle) ?? false))}
                className={`w-full py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-colors ${
                  isExpired
                    ? 'bg-gray-200 text-text-muted cursor-not-allowed'
                    : isVintage
                      ? 'bg-vintage-primary text-white hover:bg-vintage-primary-dark'
                      : 'bg-modern-primary text-white hover:bg-modern-primary-dark'
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                {loading ? 'Adding…' : isExpired ? 'Expired' : user ? 'Add to cart' : 'Add to cart (guest)'}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-4 py-1">
                <span className="text-sm font-medium text-text-muted sr-only">Quantity in cart</span>
                <button
                  type="button"
                  onClick={handleDec}
                  disabled={loading}
                  className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  aria-label="Decrease quantity or remove"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="min-w-[3rem] text-center text-2xl font-bold text-text tabular-nums">{inCartQty}</span>
                <button
                  type="button"
                  onClick={handleInc}
                  disabled={loading || isBundle || inCartQty >= maxQuantity || isExpired}
                  className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            )}

            <Link
              href={`/products/${product.slug}`}
              className="block text-center text-sm font-semibold text-vintage-primary hover:underline"
              prefetch={false}
              onClick={onClose}
            >
              View full product page
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
