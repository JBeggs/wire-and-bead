'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ecommerceApi } from '@/lib/api'
import { Cart, CartItem, Product } from '@/lib/types'
import { useAuth } from './AuthContext'
import { normalizeCartResponse } from '@/lib/cart-utils'
import { isBundleProduct } from '@/lib/product-utils'

interface CartContextType {
  cart: Cart | null
  itemCount: number
  loading: boolean
  refreshCart: () => Promise<void>
  addItemToCart: (product: Product, quantity: number) => Promise<void>
  updateItemQuantity: (productId: string, quantity: number) => Promise<void>
  removeItemFromCart: (productId: string) => Promise<void>
  clearCart: () => Promise<void>
  syncCartAfterLogin: (force?: boolean) => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const LOCAL_CART_KEY = 'pp_local_cart_v1'
const LOCAL_CART_EXPIRY_MS = 24 * 60 * 60 * 1000

type MergeChoice = 'keep-backend' | 'use-local' | 'merge'

interface LocalCartData {
  items: CartItem[]
  createdAt: number
}

function toCartFromLocal(local: LocalCartData): Cart {
  const subtotal = local.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
  const nowIso = new Date().toISOString()
  return {
    id: 'local-cart',
    session_id: 'local',
    items: local.items,
    subtotal,
    supplier_delivery: 0,
    shipping: 0,
    tax: 0,
    discount: 0,
    total: subtotal,
    currency: 'ZAR',
    created_at: new Date(local.createdAt).toISOString(),
    updated_at: nowIso,
  }
}

function readLocalCart(): LocalCartData {
  if (typeof window === 'undefined') return { items: [], createdAt: Date.now() }
  try {
    const raw = window.localStorage.getItem(LOCAL_CART_KEY)
    if (!raw) return { items: [], createdAt: Date.now() }
    const parsed = JSON.parse(raw) as LocalCartData
    if (!parsed || !Array.isArray(parsed.items)) return { items: [], createdAt: Date.now() }
    const createdAt = Number(parsed.createdAt || Date.now())
    if (Date.now() - createdAt > LOCAL_CART_EXPIRY_MS) {
      window.localStorage.removeItem(LOCAL_CART_KEY)
      return { items: [], createdAt: Date.now() }
    }
    return { items: parsed.items, createdAt }
  } catch {
    return { items: [], createdAt: Date.now() }
  }
}

function writeLocalCart(data: LocalCartData): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(data))
}

function clearLocalCart(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LOCAL_CART_KEY)
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const mergeResolverRef = useRef<((choice: MergeChoice) => void) | null>(null)
  const [mergePrompt, setMergePrompt] = useState<{ localCount: number; backendCount: number } | null>(null)

  const requestMergeChoice = useCallback((localCount: number, backendCount: number) => {
    return new Promise<MergeChoice>((resolve) => {
      mergeResolverRef.current = resolve
      setMergePrompt({ localCount, backendCount })
    })
  }, [])

  const refreshCart = useCallback(async () => {
    if (!user) {
      const local = readLocalCart()
      setCart(local.items.length > 0 ? toCartFromLocal(local) : null)
      setLoading(false)
      return
    }

    try {
      const response = await ecommerceApi.cart.get() as any
      setCart(normalizeCartResponse(response))
    } catch (error) {
      console.error('Error refreshing cart:', error)
      setCart(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  const addItemToCart = useCallback(async (product: Product, quantity: number) => {
    if (user) {
      await ecommerceApi.cart.addItem(product.id, quantity)
      await refreshCart()
      return
    }
    const local = readLocalCart()
    const isBundle = Boolean((product as any).is_bundle) || (Array.isArray((product as any).bundle_product_ids) && (product as any).bundle_product_ids!.length > 0)
    if (isBundle && local.items.some((i) => i.is_bundle)) {
      throw new Error('Bundles are limited to one per customer.')
    }
    const nowIso = new Date().toISOString()
    const idx = local.items.findIndex((item) => item.product_id === product.id)
    if (idx >= 0) {
      local.items[idx] = {
        ...local.items[idx],
        quantity: local.items[idx].quantity + quantity,
        subtotal: (local.items[idx].quantity + quantity) * Number(local.items[idx].price || product.price || 0),
      }
    } else {
      const newItem: CartItem = {
        id: product.id,
        product_id: product.id,
        product_name: product.name,
        product_image: product.image,
        product_sku: product.sku,
        quantity,
        price: Number(product.price || 0),
        cost_price: product.cost_price != null ? Number(product.cost_price) : undefined,
        subtotal: Number(product.price || 0) * quantity,
        min_quantity: product.min_quantity ?? undefined,
        is_bundle: isBundleProduct(product),
        bundle_product_ids: Array.isArray((product as any).bundle_product_ids) ? (product as any).bundle_product_ids : undefined,
        timed_expires_at: product.timed_expires_at,
        bundle_images: product.bundle_images as any,
        supplier_slug: (product as { supplier_slug?: string; supplierSlug?: string }).supplier_slug ?? (product as { supplierSlug?: string }).supplierSlug ?? undefined,
        supplier_delivery_cost: product.supplier_delivery_cost as any,
        free_delivery_threshold: product.free_delivery_threshold as any,
        featured: product.featured,
        created_at: nowIso,
        product,
      }
      local.items.push(newItem)
    }
    writeLocalCart({ items: local.items, createdAt: Date.now() })
    setCart(toCartFromLocal({ items: local.items, createdAt: Date.now() }))
  }, [refreshCart, user])

  const updateItemQuantity = useCallback(async (productId: string, quantity: number) => {
    if (quantity < 1) return
    if (user) {
      await ecommerceApi.cart.updateItem(productId, quantity)
      await refreshCart()
      return
    }
    const local = readLocalCart()
    const existing = local.items.find((i) => String(i.product_id ?? i.id) === String(productId))
    if (existing && isBundleProduct(existing) && quantity > 1) {
      throw new Error('Bundles are limited to one per customer.')
    }
    local.items = local.items.map((item) => {
      if (item.product_id !== productId) return item
      const price = Number(item.price || 0)
      return {
        ...item,
        quantity,
        subtotal: price * quantity,
      }
    })
    writeLocalCart({ items: local.items, createdAt: Date.now() })
    setCart(toCartFromLocal({ items: local.items, createdAt: Date.now() }))
  }, [refreshCart, user])

  const removeItemFromCart = useCallback(async (productId: string) => {
    if (user) {
      await ecommerceApi.cart.removeItem(productId)
      await refreshCart()
      return
    }
    const local = readLocalCart()
    local.items = local.items.filter((item) => item.product_id !== productId)
    if (local.items.length === 0) {
      clearLocalCart()
      setCart(null)
      return
    }
    writeLocalCart({ items: local.items, createdAt: Date.now() })
    setCart(toCartFromLocal({ items: local.items, createdAt: Date.now() }))
  }, [refreshCart, user])

  const clearCart = useCallback(async () => {
    if (user) {
      await ecommerceApi.cart.clear()
      await refreshCart()
      return
    }
    clearLocalCart()
    setCart(null)
  }, [refreshCart, user])

  const syncCartAfterLogin = useCallback(async (force = false) => {
    if (!force && !user) return
    const local = readLocalCart()
    if (!local.items.length) return

    let backendCart: Cart | null = null
    try {
      const response = await ecommerceApi.cart.get() as any
      backendCart = normalizeCartResponse(response)
    } catch {
      backendCart = null
    }
    const backendItems = backendCart?.items || []

    let choice: MergeChoice = 'merge'
    if (backendItems.length > 0) {
      choice = await requestMergeChoice(local.items.length, backendItems.length)
    } else {
      choice = 'use-local'
    }

    if (choice === 'keep-backend') {
      clearLocalCart()
      await refreshCart()
      return
    }

    const addItemOrSkipBundle = async (item: CartItem) => {
      const pid = String(item.product_id ?? item.id ?? '')
      if (!pid) return
      try {
        await ecommerceApi.cart.addItem(pid, item.quantity ?? 1)
      } catch (err: any) {
        const code = err?.details?.error?.code ?? err?.code
        if (code === 'BUNDLE_LIMIT_ONE' || err?.message?.includes('BUNDLE_LIMIT_ONE') || err?.message?.includes('one per customer')) {
          return
        }
        throw err
      }
    }

    if (choice === 'use-local') {
      try {
        if (backendItems.length > 0) {
          await ecommerceApi.cart.clear()
        }
      } catch {
        // Ignore clear failures and continue to add local items.
      }
      for (const item of local.items) {
        await addItemOrSkipBundle(item)
      }
      clearLocalCart()
      await refreshCart()
      return
    }

    // merge
    for (const item of local.items) {
      await addItemOrSkipBundle(item)
    }
    clearLocalCart()
    await refreshCart()
  }, [refreshCart, requestMergeChoice, user])

  useEffect(() => {
    refreshCart()
  }, [refreshCart, user])


  const itemCount = useMemo(
    () => cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0,
    [cart?.items]
  )

  const closeMergePrompt = (choice: MergeChoice) => {
    const resolver = mergeResolverRef.current
    mergeResolverRef.current = null
    setMergePrompt(null)
    resolver?.(choice)
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        loading,
        refreshCart,
        addItemToCart,
        updateItemQuantity,
        removeItemFromCart,
        clearCart,
        syncCartAfterLogin,
      }}
    >
      {children}
      {mergePrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-text">Merge carts?</h3>
            <p className="mt-2 text-sm text-text-muted">
              You have {mergePrompt.localCount} item(s) in your local cart and {mergePrompt.backendCount} item(s) in your account cart.
            </p>
            <div className="mt-5 space-y-2">
              <button className="btn btn-primary w-full" onClick={() => closeMergePrompt('merge')}>
                Merge both carts
              </button>
              <button className="btn btn-secondary w-full" onClick={() => closeMergePrompt('use-local')}>
                Use local cart
              </button>
              <button className="btn btn-secondary w-full" onClick={() => closeMergePrompt('keep-backend')}>
                Keep account cart
              </button>
            </div>
          </div>
        </div>
      )}
    </CartContext.Provider>
  )
}

const CART_DEFAULT: CartContextType = {
  cart: null,
  itemCount: 0,
  loading: false,
  refreshCart: async () => {},
  addItemToCart: async () => {},
  updateItemQuantity: async () => {},
  removeItemFromCart: async () => {},
  clearCart: async () => {},
  syncCartAfterLogin: async () => {},
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

/** Safe version that returns defaults when outside CartProvider. Use when component may render outside provider (e.g. Header). */
export function useCartSafe(): CartContextType {
  const context = useContext(CartContext)
  return context ?? CART_DEFAULT
}
