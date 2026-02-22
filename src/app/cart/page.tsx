'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ecommerceApi } from '@/lib/api'
import { Cart, CartItem } from '@/lib/types'
import { useToast } from '@/contexts/ToastContext'
import { useCart } from '@/contexts/CartContext'
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Clock, Sparkles } from 'lucide-react'

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const { showError, showSuccess } = useToast()
  const { refreshCart } = useCart()

  useEffect(() => {
    fetchCart()
  }, [])

  const fetchCart = async () => {
    try {
      const response = await ecommerceApi.cart.get() as any
      console.log('🔍 CART RESPONSE:', JSON.stringify(response, null, 2))
      
      // Handle the paginated response structure: { count, results: [cart] }
      let cartData = null
      if (response?.results && Array.isArray(response.results)) {
        cartData = response.results[0]
      } else if (response?.data) {
        cartData = response.data
      } else {
        cartData = response
      }
      
      setCart(cartData)
      await refreshCart()
    } catch (error) {
      console.error('Error fetching cart:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    
    setUpdating(itemId)
    try {
      await ecommerceApi.cart.updateItem(itemId, newQuantity)
      await fetchCart()
    } catch (error: any) {
      // Check for specific stock errors from the backend
      const errorMsg = error?.details?.error?.message || error.message || 'Failed to update quantity'
      showError(errorMsg)
    } finally {
      setUpdating(null)
    }
  }

  const removeItem = async (itemId: string) => {
    setUpdating(itemId)
    try {
      await ecommerceApi.cart.removeItem(itemId)
      showSuccess('Item removed from cart')
      await fetchCart()
    } catch (error: any) {
      showError(error.message || 'Failed to remove item')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-vintage-background py-12">
        <div className="container-wide">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const items = cart?.items || []

  return (
    <div className="min-h-screen bg-vintage-background py-12" data-cy="cart-container">
      <div className="container-wide">
        <h1 className="text-3xl font-bold font-playfair text-text mb-8">Shopping Cart</h1>

        {items.length === 0 ? (
          <div className="card p-12 text-center" data-cy="cart-empty">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-30" />
            <h2 className="text-xl font-semibold text-text mb-2">Your cart is empty</h2>
            <p className="text-text-muted mb-6">Start shopping to add items to your cart</p>
            <Link href="/products" className="btn btn-primary">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8" data-cy="cart-content">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item: CartItem) => (
                <div key={item.id} className="card p-4 flex gap-4" data-cy="cart-item">
                  {/* Product Image */}
                  <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    {(item as any).product_image ? (
                      <img
                        src={(item as any).product_image}
                        alt={item.product_name || 'Product'}
                        className="w-full h-full object-cover"
                      />
                    ) : item.product?.image ? (
                      <img
                        src={item.product?.image}
                        alt={item.product_name || 'Product'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {Array.isArray(item.product?.tags) && item.product?.tags.some((t: any) => (typeof t === 'string' ? t : t.name) === 'vintage') ? (
                          <Clock className="w-8 h-8 text-vintage-primary/30" />
                        ) : (
                          <Sparkles className="w-8 h-8 text-modern-primary/30" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-semibold text-text">
                          {item.product_name || item.product?.name || 'Product'}
                        </h3>
                        {Array.isArray(item.product?.tags) && item.product?.tags.some((t: any) => (typeof t === 'string' ? t : t.name) === 'vintage') && (
                          <span className="tag tag-vintage text-xs">Vintage</span>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={updating === item.id}
                        className="text-text-muted hover:text-vintage-accent transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={updating === item.id || item.quantity <= 1}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={updating === item.id}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Price */}
                      <span className="font-bold text-vintage-primary">
                        R{Number(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-24">
                <h2 className="text-lg font-semibold text-text mb-4">Order Summary</h2>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Subtotal</span>
                    <span className="font-medium">R{Number(cart?.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Shipping</span>
                    <span className="font-medium">
                      {cart?.shipping ? `R${Number(cart.shipping).toFixed(2)}` : 'Calculated at checkout'}
                    </span>
                  </div>
                  {cart?.tax && Number(cart.tax) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Tax</span>
                      <span className="font-medium">R{Number(cart.tax).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="divider my-4" />
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-vintage-primary">
                      R{Number(cart?.total || cart?.subtotal || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <Link href="/checkout" className="btn btn-primary w-full mt-6 py-3" data-cy="checkout-link">
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>

                <Link href="/products" className="btn btn-secondary w-full mt-3">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
