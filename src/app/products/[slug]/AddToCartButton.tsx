'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ecommerceApi } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
import { useCart } from '@/contexts/CartContext'
import { Product } from '@/lib/types'
import { useAuth } from '@/contexts/AuthContext'
import { ShoppingCart, Plus, Minus, Lock } from 'lucide-react'

interface AddToCartButtonProps {
  product: Product
}

export default function AddToCartButton({ product }: AddToCartButtonProps) {
  const { user } = useAuth()
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const { showSuccess, showError } = useToast()
  const { refreshCart } = useCart()
  const router = useRouter()

  const handleAddToCart = async () => {
    // alert('AddToCartButton: handleAddToCart clicked')
    console.log('AddToCartButton: handleAddToCart clicked', { productId: product.id, quantity, user: !!user })
    const stockQuantity = product.stock_quantity ?? product.quantity ?? 0
    if (stockQuantity === 0) {
      console.warn('AddToCartButton: Product out of stock')
      return
    }

    if (!user) {
      console.warn('AddToCartButton: No user logged in')
      return
    }

    setLoading(true)
    try {
      console.log('AddToCartButton: Calling addItem API...')
      // Use the correct endpoint from JavaMellow if needed
      const response = await ecommerceApi.cart.addItem(product.id, quantity)
      console.log('AddToCartButton: addItem response', response)
      showSuccess(`${product.name} added to cart!`)
      await refreshCart()
      router.refresh()
    } catch (error: any) {
      console.error('AddToCartButton: addItem failed', error)
      const errorMsg = error?.details?.error?.message || error.message || 'Failed to add to cart'
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const stockQuantity = product.stock_quantity ?? product.quantity ?? 0
  const isOutOfStock = stockQuantity === 0
  const maxQuantity = Math.min(stockQuantity || 10, 10)

  return (
    <div className="space-y-4">
      {/* Quantity Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-text">Quantity:</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1 || isOutOfStock}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-12 text-center font-medium text-lg">{quantity}</span>
          <button
            onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
            disabled={quantity >= maxQuantity || isOutOfStock}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add to Cart Button */}
      <div className="space-y-2">
        <button
          onClick={handleAddToCart}
          data-cy="add-to-cart"
          disabled={loading || isOutOfStock || !user}
          className={`w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 transition-colors ${
            !user
              ? 'bg-gray-200 text-text-muted cursor-not-allowed'
              : isOutOfStock
              ? 'bg-gray-200 text-text-muted cursor-not-allowed'
              : (Array.isArray(product.tags) && product.tags.some((t: any) => (typeof t === 'string' ? t : t.name) === 'vintage'))
              ? 'bg-vintage-primary text-white hover:bg-vintage-primary-dark'
              : 'bg-modern-primary text-white hover:bg-modern-primary-dark'
          } shadow-lg shadow-vintage-primary/10`}
        >
          {!user ? <Lock className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
          {loading ? 'Adding...' : !user ? 'Login to Purchase' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
        
        {!user && (
          <p className="text-xs text-center text-vintage-accent font-bold uppercase tracking-wider">
            Please <Link href="/login" className="underline">login</Link> or <Link href="/register" className="underline">register</Link> to add items to your cart
          </p>
        )}
      </div>
    </div>
  )
}
