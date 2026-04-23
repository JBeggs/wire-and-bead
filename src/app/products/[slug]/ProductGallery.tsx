'use client'

import { useState } from 'react'
import { Product } from '@/lib/types'
import { Clock, Sparkles } from 'lucide-react'
import { getProductBundleImages } from '@/lib/image-utils'

interface ProductGalleryProps {
  product: Product
}

export default function ProductGallery({ product }: ProductGalleryProps) {
  const allImages = getProductBundleImages(product)
  const [activeImage, setActiveImage] = useState(allImages[0] || '')
  const isVintage = Array.isArray(product.tags) && product.tags.some(t => (typeof t === 'string' ? t : t.name) === 'vintage')

  if (allImages.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
        {isVintage ? (
          <Clock className="w-24 h-24 text-vintage-primary/20" />
        ) : (
          <Sparkles className="w-24 h-24 text-modern-primary/20" />
        )}
      </div>
    )
  }

  const displayImages = allImages

  return (
    <div className="space-y-4">
      {/* Main image: letterbox tall/wide sources instead of cropping (object-cover). */}
      <div className="relative flex min-h-[280px] max-h-[min(90vh,920px)] w-full items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 p-3 shadow-sm">
        <img
          src={activeImage}
          alt={product.name}
          className="max-h-[min(86vh,880px)] w-auto max-w-full object-contain"
          onError={(e) => { (e.target as HTMLImageElement).src = '/images/products/default.svg' }}
        />
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className={`tag ${isVintage ? 'tag-vintage' : 'tag-new'} shadow-md`}>
            {isVintage ? 'Vintage' : 'New'}
          </span>
          {product.featured && (
            <span className="tag tag-featured shadow-md">Featured</span>
          )}
        </div>
      </div>

      {/* Thumbnails — wrap (parent caps image count via getProductBundleImages) */}
      {displayImages.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {displayImages.map((img, index) => (
            <button
              key={index}
              onClick={() => setActiveImage(img)}
              className={`aspect-square rounded-lg overflow-hidden border-2 bg-gray-50 transition-all ${
                activeImage === img 
                  ? 'border-vintage-primary shadow-md scale-95' 
                  : 'border-transparent hover:border-gray-300 opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={img}
                alt={`${product.name} thumbnail ${index + 1}`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = '/images/products/default.svg' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
