'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Product } from '@/lib/types'
import { Clock, Sparkles, Edit2, Trash2, Package, TimerReset } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ecommerceApi } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
import { useRouter } from 'next/navigation'
import { formatCountdown, getMinQuantity, isBundleProduct, isTimedProduct } from '@/lib/product-utils'
import { getProductBundleImages } from '@/lib/image-utils'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import HomeProductQuickModal from '@/components/home/HomeProductQuickModal'

interface ProductCardProps {
  product: Product
  /**
   * When true: extra card hover lift (home rails), optional quick-view modal via Details button.
   * Image and title always link to the product page — never removed.
   */
  homeQuickView?: boolean
}

function BundleTileGrid({
  urls,
  productName,
  onAllLoaded,
}: {
  urls: string[]
  productName: string
  onAllLoaded: () => void
}) {
  const loadedRef = useRef<Set<number>>(new Set())
  const n = urls.length
  const markTile = (index: number) => {
    loadedRef.current.add(index)
    if (loadedRef.current.size >= n) onAllLoaded()
  }
  return (
    <div className="product-image-bundle grid grid-cols-2 gap-1 w-full h-full p-1">
      {urls.map((url, i) => (
        <div
          key={`${url}-${i}`}
          className="bundle-cell aspect-square rounded-lg overflow-hidden bg-white border border-gray-100 flex items-center justify-center"
        >
          <img
            src={url}
            alt={i === 0 ? productName : ''}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            onLoad={() => markTile(i)}
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = '/images/products/default.svg'
              markTile(i)
            }}
          />
        </div>
      ))}
    </div>
  )
}

export default function ProductCard({ product, homeQuickView = false }: ProductCardProps) {
  const { profile } = useAuth()
  const { showSuccess, showError } = useToast()
  const router = useRouter()
  const isAuthorized = profile?.role === 'admin' || profile?.role === 'business_owner'
  const isVintage = Array.isArray(product.tags) && product.tags.some(t => (typeof t === 'string' ? t : t.name) === 'vintage')
  const isBundle = isBundleProduct(product)
  const isTimed = isTimedProduct(product)
  const minQty = getMinQuantity(product)
  const bundleImages = getProductBundleImages(product)
  const mainImage = bundleImages[0]
  const showBundleGrid = isBundle && bundleImages.length > 1
  const bundleDisplayUrls = showBundleGrid ? bundleImages.slice(0, 4) : []
  const bundleKey = bundleDisplayUrls.join('|')
  const nBundleTiles = bundleDisplayUrls.length

  const [countdown, setCountdown] = useState(() => formatCountdown(product.timed_expires_at))
  const [mainImageLoaded, setMainImageLoaded] = useState(false)
  const [bundleAllLoaded, setBundleAllLoaded] = useState(nBundleTiles === 0)
  const [prevBundleKey, setPrevBundleKey] = useState(bundleKey)
  if (bundleKey !== prevBundleKey) {
    setPrevBundleKey(bundleKey)
    setBundleAllLoaded(nBundleTiles === 0)
  }
  const mainImgRef = useRef<HTMLImageElement>(null)
  const mainImageEpoch = `${mainImage ?? ''}|${showBundleGrid}`
  const [prevMainImageEpoch, setPrevMainImageEpoch] = useState(mainImageEpoch)
  if (mainImageEpoch !== prevMainImageEpoch) {
    setPrevMainImageEpoch(mainImageEpoch)
    setMainImageLoaded(false)
  }
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [homeModalOpen, setHomeModalOpen] = useState(false)

  useLayoutEffect(() => {
    if (showBundleGrid || !mainImage) return
    const el = mainImgRef.current
    if (el?.complete && el.naturalHeight > 0) {
      queueMicrotask(() => {
        setMainImageLoaded(true)
      })
    }
  }, [mainImage, showBundleGrid])

  const needsImageReveal = showBundleGrid || Boolean(mainImage)
  const imagesReady = showBundleGrid ? bundleAllLoaded : mainImage ? mainImageLoaded : true

  useEffect(() => {
    if (!product.timed_expires_at) return
    let cancelled = false
    const sync = () => setCountdown(formatCountdown(product.timed_expires_at))
    const t = window.setTimeout(() => {
      if (!cancelled) sync()
    }, 0)
    const interval = window.setInterval(sync, 1000)
    return () => {
      cancelled = true
      window.clearTimeout(t)
      window.clearInterval(interval)
    }
  }, [product.timed_expires_at])

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleteConfirmOpen(true)
  }

  const imageArea = (
    <>
      {showBundleGrid ? (
        <BundleTileGrid
          key={bundleKey}
          urls={bundleDisplayUrls}
          productName={product.name}
          onAllLoaded={() => setBundleAllLoaded(true)}
        />
      ) : mainImage ? (
        <>
          {!mainImageLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse z-[1]" />
          )}
          <img
            ref={mainImgRef}
            src={mainImage}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className={`w-full h-full object-contain group-hover:scale-[1.02] transition-opacity duration-300 ${mainImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setMainImageLoaded(true)}
            onError={(e) => {
              const el = e.target as HTMLImageElement
              el.src = '/images/products/default.svg'
              setMainImageLoaded(true)
            }}
          />
        </>
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          {isVintage ? (
            <Clock className="w-12 h-12 text-vintage-primary/30" />
          ) : (
            <Sparkles className="w-12 h-12 text-modern-primary/30" />
          )}
        </div>
      )}
    </>
  )

  const handleDeleteConfirm = async () => {
    setDeleteConfirmOpen(false)
    try {
      await ecommerceApi.products.delete(product.id)
      showSuccess('Product deleted successfully')
      router.refresh()
    } catch (error) {
      console.error('Error deleting product:', error)
      showError('Failed to delete product')
    }
  }

  return (
    <div className="h-full" data-cy="product-card">
      <div
        className={`${isVintage ? 'product-card-vintage' : 'product-card-modern'} group relative h-full flex flex-col transition-[opacity,transform,box-shadow] duration-300 ${
          needsImageReveal && !imagesReady ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'
        } ${
          homeQuickView
            ? `hover:-translate-y-1 hover:shadow-2xl rounded-lg ${
                isVintage ? 'hover:ring-2 hover:ring-vintage-primary/20' : 'hover:ring-2 hover:ring-modern-primary/20'
              }`
            : ''
        }`}
        aria-busy={needsImageReveal && !imagesReady ? true : undefined}
      >
        <div className="relative overflow-hidden aspect-square bg-gray-50">
          <Link href={`/products/${product.slug}`} className="absolute inset-0 z-0 block" prefetch={false}>
            {imageArea}
          </Link>
          
          <div className="absolute top-2 left-2 z-10 pointer-events-none flex flex-col gap-2">
            <span className={`tag ${isVintage ? 'tag-vintage' : 'tag-new'}`}>
              {isVintage ? 'Vintage' : 'New'}
            </span>
            {isBundle && (
              <span className="tag bg-blue-600 text-white flex items-center gap-1">
                <Package className="w-3 h-3" />
                Bundle
              </span>
            )}
            {isTimed && (
              <span className="tag bg-amber-600 text-white flex items-center gap-1">
                <TimerReset className="w-3 h-3" />
                Timed
              </span>
            )}
          </div>
          
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="tag tag-sale absolute top-2 right-2 z-10 pointer-events-none">Sale</span>
          )}

          {product.featured && (
            <span className="tag tag-featured absolute top-10 right-2 z-10 pointer-events-none shadow-sm">Featured</span>
          )}

          {/* Admin Actions Overlay */}
          {isAuthorized && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-20">
              <Link
                href={`/admin/inventory/edit/${product.id}`}
                className="bg-white p-2 rounded-full text-vintage-primary hover:bg-vintage-primary hover:text-white transition-all shadow-lg"
                title="Edit Product"
                prefetch={false}
              >
                <Edit2 className="w-5 h-5" />
              </Link>
              <button
                onClick={handleDelete}
                className="bg-white p-2 rounded-full text-vintage-accent hover:bg-vintage-accent hover:text-white transition-all shadow-lg"
                title="Delete Product"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
        
        <div className="p-4 flex-1 flex flex-col">
          <Link href={`/products/${product.slug}`} className="group/title" prefetch={false}>
            <h3
              className={`font-semibold text-text line-clamp-1 transition-colors ${
                isVintage
                  ? 'group-hover/title:text-vintage-primary group-hover:text-vintage-primary'
                  : 'group-hover/title:text-modern-primary group-hover:text-modern-primary'
              }`}
            >
              {product.name}
            </h3>
          </Link>
          {product.description && (
            <p className="text-sm text-text-muted mt-1 line-clamp-2 min-h-[40px]">{product.description}</p>
          )}
          {isTimed && countdown && (
            <p className={`mt-2 text-sm font-semibold ${countdown === 'Expired' ? 'text-red-600' : 'text-amber-700'}`}>
              {countdown}
            </p>
          )}
          {product.delivery_time && (
            <p className="mt-2 text-sm text-text-muted">Delivery: {product.delivery_time}</p>
          )}
          {minQty > 1 && (
            <p className="mt-1 text-sm text-text-muted">Min: {minQty}</p>
          )}
          {product.track_inventory && (
            <>
              {product.quantity === 0 && (
                <p className="mt-2 text-sm font-medium text-red-600">Out of stock</p>
              )}
              {product.quantity > 0 && product.quantity <= 5 && (
                <p className="mt-2 text-sm font-medium text-amber-700">Only {product.quantity} left!</p>
              )}
            </>
          )}
          <div className="mt-auto pt-3 flex items-center gap-2">
            <span className={`price ${isVintage ? '' : 'text-modern-primary'}`}>
              R{Number(product.price).toFixed(2)}
            </span>
            {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
              <span className="price-original">R{Number(product.compare_at_price).toFixed(2)}</span>
            )}
          </div>
          {homeQuickView && (
            <button
              type="button"
              onClick={() => setHomeModalOpen(true)}
              className={`mt-3 w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isVintage
                  ? 'bg-vintage-primary text-white hover:bg-vintage-primary-dark shadow-sm'
                  : 'bg-modern-primary text-white hover:bg-modern-primary-dark shadow-sm'
              }`}
            >
              Details
            </button>
          )}
        </div>
      </div>
      {homeQuickView && homeModalOpen && (
        <HomeProductQuickModal product={product} open onClose={() => setHomeModalOpen(false)} />
      )}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete product"
        message={`Are you sure you want to delete "${product.name}"?`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  )
}
