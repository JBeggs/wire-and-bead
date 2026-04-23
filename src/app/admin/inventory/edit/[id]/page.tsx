'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import ProductForm from '@/components/products/ProductForm'
import { ecommerceApi } from '@/lib/api'
import { Product } from '@/lib/types'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { profile, loading: authLoading } = useAuth()
  const { showError } = useToast()
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  // Authorization check
  const isAuthorized = profile?.role === 'admin' || profile?.role === 'business_owner'

  useEffect(() => {
    if (!authLoading && !isAuthorized) {
      router.push('/login')
    }
  }, [isAuthorized, authLoading, router])

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true)
      const response: any = await ecommerceApi.products.get(id)
      // Handle wrapped response if necessary, though get usually returns the object directly
      const productData = response?.data || response
      setProduct(productData)
    } catch (error) {
      console.error('Error fetching product:', error)
      showError('Failed to load product details')
    } finally {
      setLoading(false)
    }
  }, [id, showError])

  useEffect(() => {
    if (isAuthorized && id) {
      fetchProduct()
    }
  }, [isAuthorized, id, fetchProduct])

  if (authLoading || !isAuthorized || loading) {
    return (
      <div className="min-h-screen bg-vintage-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-vintage-primary opacity-50" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-vintage-background flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-16 h-16 text-text-muted mb-4 opacity-20" />
        <h2 className="text-2xl font-bold font-playfair text-text mb-2">Product Not Found</h2>
        <p className="text-text-muted mb-6">The product you are trying to edit could not be found or has been deleted.</p>
        <Link href="/admin/inventory" className="btn btn-primary px-8">
          Back to Inventory
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-vintage-background">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="container-wide py-4 flex items-center gap-4">
          <Link href="/admin/inventory" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-text-light" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-playfair text-text truncate max-w-[200px] sm:max-w-md">
              Edit: {product.name}
            </h1>
            <p className="text-xs text-text-muted uppercase tracking-widest font-bold">Store Admin</p>
          </div>
        </div>
      </div>

      <div className="container-narrow py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
          <ProductForm 
            product={product}
            onClose={() => router.push('/admin/inventory')} 
            onSuccess={() => router.push('/admin/inventory')}
            inline={true}
          />
        </div>
      </div>
    </div>
  )
}
