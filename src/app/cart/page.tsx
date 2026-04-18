'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ecommerceApi } from '@/lib/api'
import { Cart, CartItem, SupplierDeliveryBreakdownItem } from '@/lib/types'
import { useToast } from '@/contexts/ToastContext'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Clock, Sparkles, Package, TimerReset, Truck, Shield } from 'lucide-react'
import { formatCartCountdown, getCartItemImages, getCartItemKey, getItemMinQuantity, getItemStockQuantity, groupCartItems, normalizeCartResponse, OTHER_GROUP } from '@/lib/cart-utils'
import { isBundleProduct } from '@/lib/product-utils'
import { getProductBundleImages } from '@/lib/image-utils'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const DELIVERY_GROUP_STORAGE_KEY = 'deliveryGroupMapV1'
const DELIVERY_GROUP_TTL_MS = 6 * 60 * 60 * 1000

type DeliveryGroupStore = Record<string, { slug: string; createdAt: number }>

function getDeliveryGroupStore(): DeliveryGroupStore {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(DELIVERY_GROUP_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function cleanupDeliveryGroupStore(store: DeliveryGroupStore): DeliveryGroupStore {
  const now = Date.now()
  const cleaned: DeliveryGroupStore = {}
  Object.entries(store).forEach(([token, entry]) => {
    if (!entry || typeof entry.slug !== 'string' || !entry.slug) return
    if (typeof entry.createdAt !== 'number') return
    if (now - entry.createdAt > DELIVERY_GROUP_TTL_MS) return
    cleaned[token] = entry
  })
  return cleaned
}

function setDeliveryGroupStore(store: DeliveryGroupStore): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(DELIVERY_GROUP_STORAGE_KEY, JSON.stringify(store))
}

function ensureDeliveryGroupTokenForSlug(slug: string): string {
  const store = cleanupDeliveryGroupStore(getDeliveryGroupStore())
  const existing = Object.entries(store).find(([, value]) => value.slug === slug)
  if (existing) {
    setDeliveryGroupStore(store)
    return existing[0]
  }
  const token = `${slug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  store[token] = { slug, createdAt: Date.now() }
  setDeliveryGroupStore(store)
  return token
}

function getDeliveryGroupUrl(slug: string): string {
  const token = ensureDeliveryGroupTokenForSlug(slug)
  return `/products?delivery_group=${encodeURIComponent(token)}&supplier_slug=${encodeURIComponent(slug)}`
}

function ItemImage({ item }: { item: CartItem }) {
  const images = getCartItemImages(item)
  const isBundle = item.is_bundle === true
  const mainImage = images[0]

  if (isBundle && images.length > 1) {
    return (
      <div className="cart-item-bundle-images grid grid-cols-2 gap-0.5 h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 p-0.5">
        {images.slice(0, 4).map((url, i) => (
          <div key={`${url}-${i}`} className="aspect-square overflow-hidden rounded bg-white border border-gray-200">
            <img
              src={url}
              alt={i === 0 ? item.product_name || 'Product' : ''}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = '/images/products/default.svg' }}
            />
          </div>
        ))}
      </div>
    )
  }

  if (mainImage) {
    return (
      <img
        src={mainImage}
        alt={item.product_name || 'Product'}
        className="h-24 w-24 flex-shrink-0 object-cover rounded-lg"
        onError={(e) => { (e.target as HTMLImageElement).src = '/images/products/default.svg' }}
      />
    )
  }

  return (
    <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
      {Array.isArray(item.product?.tags) && item.product?.tags.some((t: unknown) => (typeof t === 'string' ? t : (t as { name?: string })?.name) === 'vintage') ? (
        <Clock className="h-8 w-8 text-vintage-primary/30" />
      ) : (
        <Sparkles className="h-8 w-8 text-modern-primary/30" />
      )}
    </div>
  )
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [_tick, setTick] = useState(Date.now())
  const [gumtreeDeliveryBlocked, setGumtreeDeliveryBlocked] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const { showError, showSuccess } = useToast()
  const { user } = useAuth()
  const { cart: contextCart, refreshCart, updateItemQuantity, removeItemFromCart, clearCart } = useCart()

  const fetchCart = async () => {
    if (!user) {
      await refreshCart()
      setLoading(false)
      return
    }
    try {
      const response = await ecommerceApi.cart.get() as any
      const normalized = normalizeCartResponse(response)
      if (normalized?.items?.length) {
        const enrichedItems = await Promise.all(
          normalized.items.map(async (item: CartItem) => {
            if (item.is_bundle !== true) return item
            if (Array.isArray(item.bundle_images) && item.bundle_images.length > 0) return item
            try {
              const productId = item.product_id || item.product?.id
              if (!productId) return item
              const productResponse = await ecommerceApi.products.get(String(productId)) as any
              const product = productResponse?.data ?? productResponse
              const images = getProductBundleImages(product)
              if (images.length > 0) {
                return { ...item, bundle_images: images, product: { ...(item.product || {}), image: product?.image || item.product?.image } as any }
              }
            } catch {
              // Ignore enrichment failures and keep original item.
            }
            return item
          })
        )
        const gumtreeBlocked = enrichedItems.some((item: any) =>
          String(item?.supplier_slug ?? item?.supplierSlug ?? '').trim().toLowerCase() === 'gumtree' && item?.gumtree_origin_complete === false
        )
        setGumtreeDeliveryBlocked(gumtreeBlocked)
        setCart({ ...normalized, items: enrichedItems })
      } else {
        setGumtreeDeliveryBlocked(false)
        setCart(normalized)
      }
      await refreshCart()
    } catch (error) {
      console.error('Error fetching cart:', error)
      setCart(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCart()
  }, [user])

  useEffect(() => {
    if (!user) {
      const localItems = contextCart?.items || []
      const gumtreeBlocked = localItems.some((item: any) =>
        String(item?.supplier_slug ?? item?.supplierSlug ?? '').trim().toLowerCase() === 'gumtree' && item?.gumtree_origin_complete === false
      )
      setGumtreeDeliveryBlocked(gumtreeBlocked)
      setCart(contextCart || null)
    }
  }, [contextCart, user])

  // For guest users: fetch cart quote to show Perfect Dealz weight-based rate and supplier delivery
  useEffect(() => {
    if (user || !cart || !cart.items?.length) return
    // Skip if we already have breakdown (e.g. from backend)
    if ((cart.supplier_delivery_breakdown?.length ?? 0) > 0) return
    const fetchQuote = async () => {
      try {
        const items = cart!.items!.map((item: CartItem) => ({
          product_id: item.product_id || item.id,
          quantity: item.quantity || 1,
        }))
        const response = await ecommerceApi.cart.quote(items) as any
        const data = response?.data ?? response
        if (data?.supplier_delivery != null || (data?.supplier_delivery_breakdown?.length ?? 0) > 0) {
          setCart((prev) => prev ? {
            ...prev,
            supplier_delivery: data.supplier_delivery != null ? Number(data.supplier_delivery) : prev.supplier_delivery ?? 0,
            supplier_delivery_breakdown: data.supplier_delivery_breakdown ?? prev.supplier_delivery_breakdown ?? [],
            total: Math.max(0, Number(prev.subtotal ?? 0) + Number(data.supplier_delivery ?? 0) - Number(prev.discount ?? 0)),
          } : prev)
        }
      } catch (err) {
        console.error('Cart quote fetch failed:', err)
      }
    }
    fetchQuote()
  }, [user, cart?.id, cart?.items?.length])

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const items = cart?.items || []

  const removeItem = async (productId: string, silent = false) => {
    setUpdating(productId)
    try {
      await removeItemFromCart(productId)
      if (!silent) showSuccess('Item removed from cart')
      await fetchCart()
    } catch (error: any) {
      showError(error?.details?.error?.message || error.message || 'Failed to remove item')
    } finally {
      setUpdating(null)
    }
  }

  const handleClearCart = () => {
    setClearConfirmOpen(true)
  }

  const handleClearCartConfirm = async () => {
    setClearConfirmOpen(false)
    try {
      await clearCart()
      showSuccess('Cart cleared')
      await fetchCart()
    } catch (error: any) {
      showError(error?.details?.error?.message || error.message || 'Failed to clear cart')
    }
  }

  useEffect(() => {
    const timeouts: number[] = []
    items.forEach((item) => {
      if (!item.timed_expires_at) return
      const productId = getCartItemKey(item)
      const msUntilExpiry = new Date(item.timed_expires_at).getTime() - Date.now()
      if (msUntilExpiry <= 0) {
        removeItem(productId, true)
        return
      }
      const timeout = window.setTimeout(() => {
        removeItem(productId, true)
      }, msUntilExpiry)
      timeouts.push(timeout)
    })
    return () => timeouts.forEach((timeout) => window.clearTimeout(timeout))
  }, [items])

  const updateQuantity = async (productId: string, newQuantity: number) => {
    const item = items.find((entry) => getCartItemKey(entry) === productId)
    if (!item || newQuantity < 1) return
    const minQty = getItemMinQuantity(item)
    if (newQuantity < minQty) {
      showError(`Minimum order quantity is ${minQty}`)
      return
    }
    if (isBundleProduct(item) && newQuantity > 1) {
      showError('Bundles are limited to one per customer.')
      return
    }
    const stockQty = getItemStockQuantity(item)
    if (stockQty != null && newQuantity > stockQty) {
      showError(`Only ${stockQty} available`)
      return
    }

    setUpdating(productId)
    try {
      await updateItemQuantity(productId, newQuantity)
      await fetchCart()
    } catch (error: any) {
      const errorMsg = error?.details?.error?.message || error.message || 'Failed to update quantity'
      showError(errorMsg)
    } finally {
      setUpdating(null)
    }
  }

  const groups = useMemo(() => {
    return groupCartItems(items).sort((a, b) => {
      if (a.slug === OTHER_GROUP) return 1
      if (b.slug === OTHER_GROUP) return -1
      return a.slug.localeCompare(b.slug)
    })
  }, [items])

  const breakdown = cart?.supplier_delivery_breakdown ?? []
  const normalizeSlug = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, '').replace(/-/g, '').replace(/_/g, '')
  const getBreakdownForSlug = (slug: string) =>
    breakdown.filter((e) => normalizeSlug(e.supplier_slug || '') === normalizeSlug(slug))
  const getDeliveryCostFromBreakdown = (slug: string) =>
    getBreakdownForSlug(slug).reduce((sum, e) => sum + Number(e.delivery_cost ?? 0), 0)

  const supplierDelivery = Number(cart?.supplier_delivery ?? 0)
  const discount = Number(cart?.discount || 0)
  const subtotal = Number(cart?.subtotal || 0)
  const total = Math.max(0, subtotal + supplierDelivery - discount)

  if (loading) {
    return (
      <div className="min-h-screen bg-vintage-background py-12">
        <div className="container-wide">
          <div className="animate-pulse">
            <div className="mb-8 h-8 w-48 rounded bg-gray-200" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded bg-gray-200" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-vintage-background py-12" data-cy="cart-container">
      <div className="container-wide">
        <h1 className="mb-8 text-3xl font-bold font-playfair text-text">Shopping Cart</h1>

        {items.length === 0 ? (
          <div className="card p-12 text-center" data-cy="cart-empty">
            <ShoppingCart className="mx-auto mb-4 h-16 w-16 text-text-muted opacity-30" />
            <h2 className="mb-2 text-xl font-semibold text-text">Your cart is empty</h2>
            <p className="mb-6 text-text-muted">Start shopping to add items to your cart</p>
            <Link href="/products" className="btn btn-primary">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3" data-cy="cart-content">
            <div className="space-y-6 lg:col-span-2">
              <div className="cart-header-card">
                <h2 className="text-2xl font-bold font-playfair text-text">Cart Items</h2>
                <button type="button" onClick={handleClearCart} className="clear-cart-btn" data-cy="cart-clear">
                  Clear Cart
                </button>
              </div>

              {groups.map((group) => {
                const groupBreakdown = getBreakdownForSlug(group.slug)
                const weightBasedEntry = groupBreakdown.find((e) => e.weight_based === true)
                const primaryDeliveryEntry = groupBreakdown.find((e) => Number(e.delivery_cost ?? 0) > 0)
                const deliveryCost = getDeliveryCostFromBreakdown(group.slug)
                const breakdownThresholdMet = groupBreakdown.some((e) => e.threshold_met === true)
                const breakdownAmountToFree = groupBreakdown.find((e) => (e.amount_to_free_delivery ?? 0) > 0)?.amount_to_free_delivery
                const thresholdMet = breakdownThresholdMet || (group.threshold != null && !group.belowThreshold)
                const amountToFree = breakdownAmountToFree ?? group.amountToFreeDelivery ?? 0
                const showBelowThreshold = !thresholdMet && (amountToFree > 0 || group.belowThreshold)
                const thresholdUnavailable = (group as { thresholdUnavailable?: boolean }).thresholdUnavailable === true
                const hasWeightCost = weightBasedEntry && (weightBasedEntry.total_weight_kg ?? 0) > 0 && (weightBasedEntry.delivery_cost ?? 0) > 0
                const showGroupHeader = group.isImport || deliveryCost > 0 || showBelowThreshold || hasWeightCost
                const headerLabel = deliveryCost > 0
                  ? `Our supplier has a flat delivery rate for these products (R${deliveryCost.toFixed(2)})`
                  : 'This delivery group has a free-delivery threshold'

                return (
                <section key={group.slug} className="cart-supplier-group">
                  {showGroupHeader && (
                    <div className="cart-supplier-group-header">
                      {group.isImport ? (
                        <p className="flex items-center gap-2 text-sm text-text-muted">
                          <Truck className="h-4 w-4" />
                          Courier Guy handles this delivery group. Delivery selected at checkout.
                        </p>
                      ) : (
                        <>
                          <h3 className="cart-supplier-header">{headerLabel}</h3>
                          {showBelowThreshold && group.threshold != null && (
                            <>
                              {thresholdUnavailable ? (
                                <p className="supplier-threshold-note text-amber-700">
                                  Free delivery threshold unavailable (cost price not set for some products).
                                </p>
                              ) : (
                                <p className="supplier-threshold-note">
                                  Add R{Number(amountToFree).toFixed(2)} more to unlock free delivery for this group.
                                </p>
                              )}
                              <Link href={getDeliveryGroupUrl(group.slug)} className="supplier-group-link">
                                View all products in this delivery group
                              </Link>
                            </>
                          )}
                          {deliveryCost > 0 && group.slug !== OTHER_GROUP && !showBelowThreshold && (
                            <Link href={getDeliveryGroupUrl(group.slug)} className="supplier-group-link">
                              Browse more products from this supplier
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <div className="space-y-4 p-4">
                  {group.items.map((item) => {
                    const productId = getCartItemKey(item)
                    const minQty = getItemMinQuantity(item)
                    const stockQty = getItemStockQuantity(item)
                    const atStockLimit = stockQty != null && item.quantity >= stockQty
                    const countdown = formatCartCountdown(item)
                    const isTimed = Boolean(item.timed_expires_at)
                    const isBundle = isBundleProduct(item)
                    const itemDeliveryNote = deliveryCost > 0
                      ? (primaryDeliveryEntry?.weight_based && primaryDeliveryEntry?.total_weight_kg != null
                        ? `Delivery: R${deliveryCost.toFixed(2)} (weight-based, ${Number(primaryDeliveryEntry.total_weight_kg).toFixed(1)} kg)`
                        : `Delivery: R${deliveryCost.toFixed(2)} (applies once for this product group)`)
                      : null

                    return (
                      <div key={productId} className="card flex flex-col sm:flex-row gap-4 p-4 min-w-0 overflow-hidden" data-cy="cart-item">
                        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 self-start sm:self-auto">
                          {isBundle && (
                            <span className="absolute left-2 top-2 z-10 rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                              <span className="inline-flex items-center gap-1"><Package className="h-3 w-3" />Bundle</span>
                            </span>
                          )}
                          {isTimed && (
                            <span className="absolute bottom-2 left-2 z-10 rounded-full bg-amber-600 px-2 py-1 text-xs font-semibold text-white">
                              <span className="inline-flex items-center gap-1"><TimerReset className="h-3 w-3" />Timed</span>
                            </span>
                          )}
                          <ItemImage item={item} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-4">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-text break-words line-clamp-2">
                                {item.product_name || item.product?.name || 'Product'}
                              </h3>
                              <p className="mt-1 text-sm text-text-muted">
                                R{Number(item.price).toFixed(2)} each
                                {minQty > 1 ? ` · Min ${minQty}` : ''}
                                {stockQty != null && stockQty <= 5 ? ` · Only ${stockQty} left` : ''}
                              </p>
                              {itemDeliveryNote && (
                                <p className="mt-1 text-sm text-[#5a4a3d]">{itemDeliveryNote}</p>
                              )}
                              {item.product?.delivery_time && (
                                <p className="mt-1 text-sm text-text-muted">Delivery: {item.product.delivery_time}</p>
                              )}
                              {isTimed && (
                                <p className={`mt-2 text-sm font-semibold ${countdown === 'Expired' ? 'text-red-600' : 'text-amber-700'}`}>
                                  {countdown}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => removeItem(productId)}
                              disabled={updating === productId}
                              className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-5 w-5" />
                              Remove
                            </button>
                          </div>

                          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3 sm:gap-0">
                              <span className="sm:hidden text-xs font-medium uppercase tracking-wide text-[#6b5344] w-16">Quantity</span>
                              <div className="quantity-control">
                              <button
                                onClick={() => updateQuantity(productId, item.quantity - 1)}
                                disabled={updating === productId || item.quantity <= minQty}
                                className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-text hover:bg-[#6b5438] hover:text-white disabled:opacity-50"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              {!isBundle && (
                                <button
                                  onClick={() => updateQuantity(productId, item.quantity + 1)}
                                  disabled={updating === productId || atStockLimit}
                                  className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-text hover:bg-[#6b5438] hover:text-white disabled:opacity-50"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            </div>

                            <div className="flex items-center gap-3 sm:gap-0 sm:text-right">
                              <span className="sm:hidden text-xs font-medium uppercase tracking-wide text-[#6b5344]">Item Total</span>
                              <div>
                              <p className="hidden sm:block item-total-label">Item Total</p>
                              <p className="font-bold text-vintage-primary">
                                R{Number(item.price * item.quantity).toFixed(2)}
                              </p>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    )
                  })}
                  </div>
                </section>
                );
              })}
            </div>

            <div className="lg:col-span-1">
              <div className="card sticky top-24 p-6">
                <h2 className="mb-4 text-lg font-semibold text-text">Order Summary</h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Subtotal</span>
                    <span className="font-medium">R{subtotal.toFixed(2)}</span>
                  </div>
                  {supplierDelivery > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Supplier delivery</span>
                      <span className="font-medium">R{supplierDelivery.toFixed(2)}</span>
                    </div>
                  )}
                  {(() => {
                    const entries = (cart?.supplier_delivery_breakdown ?? []).filter(
                      (e: SupplierDeliveryBreakdownItem) => Number(e.delivery_cost ?? 0) > 0
                    )
                    return entries.length > 0 ? (
                      <div className="supplier-breakdown">
                        {entries.map((entry: SupplierDeliveryBreakdownItem) => (
                          <div key={`${entry.supplier_slug}-summary`} className="supplier-breakdown-item">
                            <span>
                              {entry.weight_based
                                ? `Weight-based (${Number(entry.total_weight_kg ?? 0).toFixed(1)} kg)`
                                : 'Flat delivery rate'}
                            </span>
                            <span>R{Number(entry.delivery_cost ?? 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ) : null
                  })()}
                  <div className="my-4 divider" />
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-vintage-primary">
                      R{total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {user ? (
                  <Link
                    href={gumtreeDeliveryBlocked ? '#' : '/checkout'}
                    aria-disabled={gumtreeDeliveryBlocked}
                    className={`btn btn-primary mt-6 w-full py-3 ${gumtreeDeliveryBlocked ? 'pointer-events-none opacity-50' : ''}`}
                    data-cy="checkout-link"
                  >
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                ) : (
                  <Link
                    href="/login?return=/checkout"
                    className="btn btn-primary mt-6 w-full py-3"
                    data-cy="checkout-link"
                  >
                    Log in to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                )}
                {gumtreeDeliveryBlocked && (
                  <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    Item cannot be delivered. Please contact support.
                  </p>
                )}

                <Link href="/products" className="btn btn-secondary mt-3 w-full">
                  Continue Shopping
                </Link>

                <div className="trust-badges-grid">
                  <div className="trust-badge-card">
                    <Shield className="mx-auto mb-1 h-5 w-5" />
                    <span>Secure Checkout</span>
                  </div>
                  <div className="trust-badge-card">
                    <Package className="mx-auto mb-1 h-5 w-5" />
                    <span>Free Returns</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear cart"
        message="Are you sure you want to clear your cart?"
        confirmLabel="Clear cart"
        danger
        onConfirm={handleClearCartConfirm}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </div>
  )
}
