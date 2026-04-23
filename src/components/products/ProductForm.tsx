'use client'

import { useState, useEffect } from 'react'
import { ecommerceApi } from '@/lib/api'
import { Product, Category } from '@/lib/types'
import { X, Upload, Loader2, Save, Image as ImageIcon, Trash2, Plus, Info, Search, Package, Truck, Tag as TagIcon, AlertCircle } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { useCompany } from '@/contexts/CompanyContext'

interface ProductFormProps {
  product?: Product
  onClose: () => void
  onSuccess?: () => void
  inline?: boolean
}

type TabType = 'general' | 'inventory' | 'shipping' | 'seo' | 'media'

export default function ProductForm({ product, onClose, onSuccess, inline = false }: ProductFormProps) {
  const company = useCompany()
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingCategories, setFetchingCategories] = useState(true)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { showSuccess, showError } = useToast()

  const [formData, setFormData] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    short_description: product?.short_description || '',
    price: product?.price || 0,
    compare_at_price: product?.compare_at_price || 0,
    cost_price: product?.cost_price || 0,
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    quantity: product?.stock_quantity ?? product?.quantity ?? 0,
    track_inventory: product?.track_inventory ?? true,
    allow_backorder: product?.allow_backorder ?? false,
    weight: product?.weight || 0,
    weight_unit: product?.weight_unit || 'g',
    dimension_length: product?.dimension_length || 0,
    dimension_width: product?.dimension_width || 0,
    dimension_height: product?.dimension_height || 0,
    category_id: product?.category_id ? String(product.category_id) : (typeof product?.category === 'object' && product.category ? String((product.category as any).id || '') : (product?.category ? String(product.category) : '')),
    is_active: product?.is_active ?? true,
    featured: product?.featured ?? false,
    status: product?.status || 'draft',
    color: product?.color || '',
    featured_image_id: product?.featured_image_id || '',
    seo_title: product?.seo_title || '',
    seo_description: product?.seo_description || '',
    seo_keywords: product?.seo_keywords || '',
    canonical_url: product?.canonical_url || '',
    tags: Array.isArray(product?.tags) ? product.tags.map(t => typeof t === 'string' ? t : t.name) : []
  })

  // Ecommerce product images (URLs from /v1/products/images/upload-multiple/)
  const getMainImageUrl = () => product?.image || null
  const getExtraImageUrls = (): { url: string }[] => {
    const imgs = product?.images
    if (!imgs || !Array.isArray(imgs)) return []
    return imgs.map((img: any) => ({ url: typeof img === 'string' ? img : (img?.url ?? '') })).filter((x: any) => x?.url)
  }
  const [featuredImage, setFeaturedImage] = useState<{ url: string } | null>(
    getMainImageUrl() ? { url: getMainImageUrl()! } : null
  )
  const [additionalImages, setAdditionalImages] = useState<{ url: string }[]>(getExtraImageUrls())
  const [uploadingImage, setUploadingImage] = useState(false)
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [])

  // Sync category_id if it changes in product or when categories load
  useEffect(() => {
    if (product && !formData.category_id) {
      const catId = product.category_id || (typeof product.category === 'object' ? (product.category as any)?.id : product.category)
      if (catId) {
        setFormData(prev => ({ ...prev, category_id: String(catId) }))
      }
    }
  }, [product, categories])

  // Sync is_active with status
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      is_active: prev.status === 'active'
    }))
  }, [formData.status])

  const fetchCategories = async () => {
    try {
      setFetchingCategories(true)
      const data = await ecommerceApi.categories.list()
      setCategories(Array.isArray(data) ? data : (data as any)?.data || (data as any)?.results || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      showError('Failed to load categories')
    } finally {
      setFetchingCategories(false)
    }
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const newTag = tagInput.trim().toLowerCase()
      if (newTag && !formData.tags.includes(newTag)) {
        setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag] }))
        setTagInput('')
      }
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isFeatured: boolean = false) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      setUploadingImage(true)
      const res = await ecommerceApi.products.uploadImages(Array.from(files))
      const uploaded = (res?.data || []).filter((x: any) => x?.url).map((x: any) => ({ url: x.url }))
      if (uploaded.length === 0) {
        showError('No images were uploaded')
        return
      }

      if (isFeatured && uploaded.length > 0) {
        setFeaturedImage(uploaded[0])
        if (uploaded.length > 1) {
          setAdditionalImages(prev => [...prev, ...uploaded.slice(1)])
        }
      } else {
        setAdditionalImages(prev => [...prev, ...uploaded])
      }
      showSuccess(`${uploaded.length} image(s) uploaded successfully`)
    } catch (error) {
      console.error('Error uploading image:', error)
      showError('Failed to upload image(s)')
    } finally {
      setUploadingImage(false)
    }
  }

  const removeAdditionalImage = (url: string) => {
    setAdditionalImages(prev => prev.filter(m => m.url !== url))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    setErrors({})
    setLoading(true)

    try {
      // Basic client-side validation for all required fields
      const newErrors: Record<string, string> = {}
      if (!formData.name) newErrors.name = 'Product name is required'
      if (!formData.price) newErrors.price = 'Price is required'
      if (!formData.category_id) newErrors.category_id = 'Category is required'
      if (!featuredImage?.url) newErrors.image = 'At least one product image is required'
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        const msg = `Please fill in all required fields: ${Object.keys(newErrors).map(k => k.replace('_id', '').replace('name', 'Name').replace('image', 'Image')).join(', ')}`
        setValidationError(msg)
        showError(msg)
        setLoading(false)
        if (newErrors.image) setActiveTab('media')
        else if (newErrors.name || newErrors.price || newErrors.category_id) setActiveTab('general')
        return
      }

      const payload = {
        ...formData,
        image: featuredImage!.url,
        images: additionalImages.map(m => m.url),
        category: formData.category_id,
        stock_quantity: formData.quantity,
      }

      const { category_id: _category_id, featured_image_id: _featured_image_id, quantity: _quantity, ...backendPayload } = payload as any

      if (product) {
        console.log('ProductForm: Updating product', product.id)
        await ecommerceApi.products.update(product.id, backendPayload)
        showSuccess('Product updated successfully!')
      } else {
        console.log('ProductForm: Creating product')
        await ecommerceApi.products.create(backendPayload)
        showSuccess('Product created successfully!')
      }
      if (onSuccess) onSuccess()
      onClose()
    } catch (error: any) {
      console.error('ProductForm: Save failed', error)
      
      let errorMessage = 'Failed to save product'
      
      // Handle detailed validation errors from the API
      if (error?.details?.error?.message) {
        // If it's a stringified object of field errors, try to make it readable
        const details = error.details.error.message
        if (typeof details === 'string' && details.includes('{')) {
          try {
            // Clean up the Django-style error string if possible
            errorMessage = details.replace(/[{}'\[\]]/g, '').replace(/ErrorDetail\(string=(.*?), code=.*\)/g, '$1')
          } catch {
            errorMessage = details
          }
        } else {
          errorMessage = details
        }
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      setValidationError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Info },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'seo', label: 'SEO', icon: Search },
    { id: 'media', label: 'Media', icon: ImageIcon },
  ]

  return (
    <div className={inline ? "w-full flex flex-col min-h-0" : "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"}>
      <div className={inline ? "w-full flex flex-col" : "bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 h-[90vh]"}>
        {/* Header - Only show if not inline */}
        {!inline && (
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white z-10">
            <div>
              <h2 className="text-2xl font-bold font-playfair text-text">
                {product ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-sm text-text-muted mt-1">
                {formData.name || 'Untitled Product'}
              </p>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text transition-colors p-2 hover:bg-gray-100 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 overflow-x-auto no-scrollbar scroll-smooth sticky top-0 z-20">
          <div className="flex min-w-full">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex flex-1 items-center justify-center gap-2 px-4 sm:px-6 py-4 text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-vintage-primary text-vintage-primary bg-white'
                    : 'border-transparent text-text-muted hover:text-text hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className={`${inline ? "" : "flex-1 overflow-y-auto"} p-4 sm:p-8`}>
          <form onSubmit={handleSubmit} className="space-y-8">
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value })
                      if (errors.name) setErrors(prev => {
                        const { name: _name, ...rest } = prev
                        return rest
                      })
                    }}
                    className={`w-full pl-4 pr-4 py-3 bg-gray-50 border rounded-md focus:bg-white focus:ring-4 focus:ring-vintage-primary/10 transition-all outline-none ${
                      errors.name ? 'border-red-500 ring-4 ring-red-500/10' : 'border-gray-200'
                    }`}
                    placeholder="e.g. Vintage Leather Satchel"
                    required
                  />
                  {errors.name && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light">
                    Category *
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => {
                      setFormData({ ...formData, category_id: e.target.value })
                      setValidationError(null)
                      if (errors.category_id) setErrors(prev => {
                        const { category_id: _category_id, ...rest } = prev
                        return rest
                      })
                    }}
                    className={`w-full pl-4 pr-4 py-3 bg-gray-50 border rounded-md focus:bg-white focus:ring-4 focus:ring-vintage-primary/10 transition-all outline-none ${
                      errors.category_id ? 'border-red-500 ring-4 ring-red-500/10' : 'border-gray-200'
                    }`}
                    disabled={fetchingCategories}
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                    ))}
                  </select>
                  {errors.category_id && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.category_id}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light">
                  Short Description
                </label>
                <input
                  type="text"
                  value={formData.short_description}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:ring-4 focus:ring-vintage-primary/10 transition-all outline-none"
                  placeholder="Brief summary for listings (max 150 chars)"
                  maxLength={150}
                />
              </div>

              <div className="space-y-2">
                <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light">
                  Full Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:ring-4 focus:ring-vintage-primary/10 transition-all outline-none min-h-[150px]"
                  placeholder="Detailed product information..."
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light">
                    Price (R) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value)
                      setFormData({ ...formData, price: isNaN(val) ? 0 : val })
                      if (errors.price) setErrors(prev => {
                        const { price: _price, ...rest } = prev
                        return rest
                      })
                    }}
                    className={`w-full pl-4 pr-4 py-3 bg-gray-50 border rounded-md focus:bg-white focus:ring-4 focus:ring-vintage-primary/10 transition-all outline-none font-mono ${
                      errors.price ? 'border-red-500 ring-4 ring-red-500/10' : 'border-gray-200'
                    }`}
                    required
                  />
                  {errors.price && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.price}</p>}
                </div>

                <div className="space-y-2">
                  <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light">
                    Sale Price (R)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.compare_at_price ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value)
                      setFormData({ ...formData, compare_at_price: isNaN(val) ? 0 : val })
                    }}
                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:ring-4 focus:ring-vintage-primary/10 transition-all outline-none font-mono text-vintage-accent"
                  />
                </div>

                <div className="space-y-2">
                  <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light">
                    Cost Price (R)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost_price ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value)
                      setFormData({ ...formData, cost_price: isNaN(val) ? 0 : val })
                    }}
                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:ring-4 focus:ring-vintage-primary/10 transition-all outline-none font-mono text-text-muted"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6 pt-4 border-t border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 transition-all checked:bg-vintage-primary checked:border-vintage-primary"
                    />
                    <Save className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none" />
                  </div>
                  <span className="text-sm font-bold text-text group-hover:text-vintage-primary transition-colors">
                    Featured Item
                  </span>
                </label>

                <div className="flex items-center gap-3 ml-auto">
                  <span className="text-xs uppercase tracking-wider font-bold text-text-light">Status:</span>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-bold focus:ring-2 focus:ring-vintage-primary/10 outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Tag Management */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light block">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map(tag => (
                    <span 
                      key={tag} 
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        tag === 'vintage' ? 'bg-vintage-primary text-white' : 'bg-gray-100 text-text-light'
                      }`}
                    >
                      {tag}
                      <button 
                        type="button" 
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="relative max-w-xs">
                  <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:bg-white transition-all outline-none text-sm"
                    placeholder="Add a tag and press Enter..."
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light">
                    SKU (Stock Keeping Unit)
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white transition-all outline-none font-mono"
                    placeholder="e.g. VIN-LDR-001"
                  />
                </div>

                <div className="space-y-2">
                  <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light">
                    Barcode (UPC/EAN)
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white transition-all outline-none font-mono"
                    placeholder="e.g. 123456789012"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light">
                    Current Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={formData.quantity ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseInt(e.target.value)
                      setFormData({ ...formData, quantity: isNaN(val) ? 0 : val })
                    }}
                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white transition-all outline-none font-mono"
                  />
                </div>

                <div className="space-y-4 pt-8">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.track_inventory}
                        onChange={(e) => setFormData({ ...formData, track_inventory: e.target.checked })}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 transition-all checked:bg-vintage-primary checked:border-vintage-primary"
                      />
                      <Save className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none" />
                    </div>
                    <span className="text-sm font-bold text-text group-hover:text-vintage-primary transition-colors">
                      Track Inventory Levels
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.allow_backorder}
                        onChange={(e) => setFormData({ ...formData, allow_backorder: e.target.checked })}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 transition-all checked:bg-vintage-primary checked:border-vintage-primary"
                      />
                      <Save className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none" />
                    </div>
                    <span className="text-sm font-bold text-text group-hover:text-vintage-primary transition-colors">
                      Allow Backorders (Sell when out of stock)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light">
                    Weight
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                      className="flex-1 pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white transition-all outline-none font-mono"
                    />
                    <select
                      value={formData.weight_unit}
                      onChange={(e) => setFormData({ ...formData, weight_unit: e.target.value })}
                      className="w-24 px-3 py-3 bg-white border border-gray-200 rounded-md font-bold outline-none"
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="lb">lb</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light block">
                  Dimensions (cm)
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted uppercase font-bold">Length</span>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.dimension_length}
                      onChange={(e) => setFormData({ ...formData, dimension_length: parseFloat(e.target.value) })}
                      className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted uppercase font-bold">Width</span>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.dimension_width}
                      onChange={(e) => setFormData({ ...formData, dimension_width: parseFloat(e.target.value) })}
                      className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted uppercase font-bold">Height</span>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.dimension_height}
                      onChange={(e) => setFormData({ ...formData, dimension_height: parseFloat(e.target.value) })}
                      className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2">
                <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light">
                  SEO Title (Meta Title)
                </label>
                <input
                  type="text"
                  value={formData.seo_title}
                  onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                  className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white transition-all outline-none"
                  placeholder="Search engine title (max 60 chars)"
                  maxLength={60}
                />
                <div className="flex justify-between text-[10px] uppercase font-bold text-text-muted px-1">
                  <span>Preview: {formData.seo_title || formData.name} | {company.name}</span>
                  <span>{formData.seo_title.length}/60</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light">
                  SEO Description (Meta Description)
                </label>
                <textarea
                  value={formData.seo_description}
                  onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                  className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white transition-all outline-none"
                  placeholder="Brief summary for search results (max 160 chars)"
                  rows={3}
                  maxLength={160}
                />
                <div className="flex justify-end text-[10px] uppercase font-bold text-text-muted px-1">
                  <span>{formData.seo_description.length}/160</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white transition-all outline-none font-mono text-sm"
                    placeholder="vintage-leather-satchel"
                  />
                </div>

                <div className="space-y-2">
                  <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light">
                    Canonical URL
                  </label>
                  <input
                    type="url"
                    value={formData.canonical_url}
                    onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white transition-all outline-none font-mono text-sm"
                    placeholder="https://example.com/products/..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light">
                  SEO Keywords
                </label>
                <input
                  type="text"
                  value={formData.seo_keywords}
                  onChange={(e) => setFormData({ ...formData, seo_keywords: e.target.value })}
                  className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white transition-all outline-none"
                  placeholder="vintage, leather, satchel, handmade (comma separated)"
                />
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Featured Image */}
              <div className="space-y-4">
                <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Main Featured Image
                </label>
                <div className="flex items-start gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <div className="w-48 h-48 bg-white rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden shadow-inner relative group">
                    {featuredImage ? (
                      <>
                        <img src={featuredImage.url} alt="Featured" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            type="button"
                            onClick={() => {
                              setFeaturedImage(null)
                              setFormData(prev => ({ ...prev, featured_image_id: '' }))
                            }}
                            className="bg-white p-2 rounded-full text-vintage-accent hover:scale-110 transition-transform"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <ImageIcon className="w-12 h-12 text-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-text">Upload your primary image</p>
                      <p className="text-xs text-text-muted leading-relaxed">
                        This image will be shown in search results and at the top of the product page.
                        Recommended: 1200x1200px, under 2MB.
                      </p>
                    </div>
                    <div className="relative inline-block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, true)}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        disabled={uploadingImage}
                      />
                      <button
                        type="button"
                        className="btn btn-primary px-6 flex items-center gap-2"
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {featuredImage ? 'Change Main Image' : 'Select Main Image'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Images */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="form-label text-xs uppercase tracking-wider font-bold text-text-light flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-text-muted" />
                    Gallery Images
                  </label>
                  <span className="text-[10px] font-bold text-text-muted uppercase bg-gray-100 px-2 py-1 rounded">
                    {additionalImages.length} Images Added
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {additionalImages.map((img) => (
                    <div key={img.url} className="aspect-square bg-gray-50 rounded-lg border border-gray-200 overflow-hidden relative group shadow-sm">
                      <img src={img.url} alt="Gallery" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removeAdditionalImage(img.url)}
                          className="bg-white p-1.5 rounded-full text-vintage-accent hover:scale-110 transition-transform"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center relative group hover:border-vintage-primary/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, false)}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      disabled={uploadingImage}
                    />
                    <div className="text-center p-4">
                      {uploadingImage ? (
                        <Loader2 className="w-6 h-6 animate-spin text-vintage-primary mx-auto" />
                      ) : (
                        <>
                          <Plus className="w-6 h-6 text-gray-300 mx-auto group-hover:text-vintage-primary transition-colors" />
                          <span className="text-[10px] font-bold text-text-muted uppercase mt-1 block group-hover:text-vintage-primary">Add More</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col gap-4 sticky bottom-0 z-10">
          {validationError && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-bold">{validationError}</p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn btn-secondary px-8 font-bold" disabled={loading}>
              {inline ? 'Back' : 'Cancel'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || uploadingImage}
              className="btn btn-primary px-10 flex items-center gap-2 font-bold shadow-lg shadow-vintage-primary/20"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {product ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
