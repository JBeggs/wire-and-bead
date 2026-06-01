'use client'

import { useState, useEffect, useCallback } from 'react'
import { ecommerceApi } from '@/lib/api'
import { Product } from '@/lib/types'
import { Edit2, Trash2, Loader2, Search, ExternalLink, Image as ImageIcon, ArrowLeft, Plus, Settings, Filter, Download, CheckSquare, Square, AlertCircle, Star } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import ProductForm from '@/components/products/ProductForm'
import CategoryManager from '@/components/products/CategoryManager'
import BulkEditModal from '@/components/products/BulkEditModal'
import PaginationNav from '@/components/ui/PaginationNav'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useCompany } from '@/contexts/CompanyContext'
import ProductPrintLabelButton from '@/components/products/ProductPrintLabelButton'
import { formatOwnerName } from '@/lib/format-owner-name'
import { resolveLocale } from '@/lib/locale'

export default function InventoryPage() {
  const { profile, loading: authLoading } = useAuth()
  const company = useCompany()
  const locale = resolveLocale(company)
  const searchParams = useSearchParams()
  const pageFromUrl = parseInt(searchParams.get('page') || '1', 10)
  const limitFromUrl = searchParams.get('limit') || '20'
  const statusFromUrl = searchParams.get('status') || 'all'
  const featuredFromUrl = searchParams.get('featured') || ''
  const searchFromUrl = searchParams.get('search') || ''

  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [counts, setCounts] = useState<{ total: number; active: number; draft: number; expired: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => Promise<void> }>({
    open: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  })
  const { showSuccess, showError } = useToast()
  const router = useRouter()

  const isAuthorized = profile?.role === 'admin' || profile?.role === 'business_owner'

  const fetchProducts = useCallback(async () => {
    if (!isAuthorized) return
    try {
      setLoading(true)
      const params: Record<string, string | number> = {
        page: pageFromUrl,
        limit: limitFromUrl === 'all' ? 9999 : parseInt(limitFromUrl, 10) || 20,
      }
      if (statusFromUrl !== 'all') params.status = statusFromUrl
      if (featuredFromUrl === 'true') params.featured = 'true'
      if (featuredFromUrl === 'false') params.featured = 'false'
      if (searchFromUrl.trim()) params.search = searchFromUrl.trim()
      const response: any = await ecommerceApi.products.listForAdmin(params)
      const productData = response?.data || (Array.isArray(response) ? response : response?.results || [])
      setProducts(productData)
      const pag = response?.pagination
      if (pag) {
        setPagination({
          page: pag.page ?? 1,
          totalPages: pag.totalPages ?? 1,
          total: pag.total ?? productData.length,
        })
      } else {
        setPagination({ page: 1, totalPages: 1, total: productData.length })
      }
      if (response?.counts) {
        setCounts(response.counts)
      } else {
        setCounts(null)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      showError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [isAuthorized, pageFromUrl, limitFromUrl, statusFromUrl, featuredFromUrl, searchFromUrl, showError])

  useEffect(() => {
    if (!authLoading && !isAuthorized) {
      router.push('/login')
    }
  }, [isAuthorized, authLoading, router])

  const updateUrl = useCallback((updates: { page?: number; limit?: string; status?: string; featured?: string; search?: string }) => {
    const params = new URLSearchParams(searchParams.toString())
    if (updates.page !== undefined) params.set('page', String(updates.page))
    if (updates.limit !== undefined) {
      if (updates.limit) params.set('limit', updates.limit)
      else params.delete('limit')
    }
    if (updates.status !== undefined) params.set('status', updates.status)
    if (updates.featured !== undefined) {
      if (updates.featured) params.set('featured', updates.featured)
      else params.delete('featured')
    }
    if (updates.search !== undefined) {
      if (updates.search) params.set('search', updates.search)
      else params.delete('search')
    }
    router.push(`/admin/inventory?${params.toString()}`)
  }, [router, searchParams])

  useEffect(() => {
    if (isAuthorized) {
      fetchProducts()
    }
  }, [isAuthorized, fetchProducts])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(products.map(p => p.id)))
    }
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    setConfirmDialog({
      open: true,
      title: 'Archive products',
      message: `Archive ${count} product(s)? This will remove them from the store.`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }))
        try {
          await ecommerceApi.products.bulk({ operation: 'delete', ids: [...selectedIds] })
          showSuccess(`${count} product(s) archived`)
          setSelectedIds(new Set())
          fetchProducts()
        } catch (error) {
          console.error('Error bulk deleting:', error)
          showError('Failed to archive products')
        }
      },
    })
  }

  const handleBulkEdit = () => {
    setIsBulkEditOpen(true)
  }

  const handleBulkEditSubmit = async (data: Record<string, unknown>) => {
    if (selectedIds.size === 0) return
    try {
      await ecommerceApi.products.bulk({ operation: 'update', ids: [...selectedIds], data })
      showSuccess(`${selectedIds.size} product(s) updated`)
      setSelectedIds(new Set())
      setIsBulkEditOpen(false)
      fetchProducts()
    } catch (error) {
      console.error('Error bulk updating:', error)
      showError('Failed to update products')
    }
  }

  const handleDelete = (product: Product) => {
    setConfirmDialog({
      open: true,
      title: 'Delete product',
      message: `Are you sure you want to delete "${product.name}"?`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }))
        try {
          await ecommerceApi.products.delete(product.id)
          showSuccess('Product deleted successfully')
          fetchProducts()
        } catch (error) {
          console.error('Error deleting product:', error)
          showError('Failed to delete product')
        }
      },
    })
  }

  const handleExportCsv = () => {
    const cols = ['name', 'sku', 'price', 'stock_quantity', 'status', 'description', 'category', 'created_at']
    const escape = (v: unknown) => {
      if (v == null) return ''
      const s = String(v)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const header = cols.join(',')
    const rows = products.map(p => cols.map(c => {
      if (c === 'category') return escape((p.category as { name?: string })?.name ?? '')
      const v = (p as unknown as Record<string, unknown>)[c]
      return escape(v)
    }).join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showSuccess('Products exported')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase">Active</span>
      case 'draft':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700 uppercase">Draft</span>
      case 'archived':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 uppercase">Archived</span>
      default:
        return null
    }
  }

  if (authLoading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-vintage-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-vintage-primary opacity-50" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-vintage-background pb-20">
      {/* Header Area */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="container-wide py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/products" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-text-light" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold font-playfair text-text">Inventory Management</h1>
                <p className="text-xs text-text-muted uppercase tracking-widest font-bold">Store Admin</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCsv}
                disabled={products.length === 0}
                className="btn btn-secondary btn-sm flex items-center gap-2"
                title="Export products to CSV"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="btn btn-secondary btn-sm flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Categories
              </button>
              <button
                onClick={() => setIsProductModalOpen(true)}
                className="btn btn-primary btn-sm flex items-center gap-2 shadow-lg shadow-vintage-primary/20"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="bg-gray-50 border-t border-gray-100">
          <div className="container-wide py-3">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <form
                className="relative flex-1 w-full"
                onSubmit={(e) => {
                  e.preventDefault()
                  updateUrl({ search: (e.target as HTMLFormElement).search?.value || '', page: 1 })
                }}
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  name="search"
                  type="text"
                  placeholder="Search by name or SKU..."
                  defaultValue={searchFromUrl}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-4 focus:ring-vintage-primary/10 outline-none transition-all text-sm"
                />
              </form>
              
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                <Filter className="w-4 h-4 text-text-muted flex-shrink-0" />
                <div className="flex gap-1 flex-wrap items-center">
                  <button
                    type="button"
                    onClick={() => updateUrl({ featured: featuredFromUrl === 'true' ? '' : 'true', page: 1 })}
                    className={`min-h-[44px] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 flex-shrink-0 ${
                      featuredFromUrl === 'true' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-white text-text-muted border border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" />
                    Featured
                  </button>
                  {['all', 'active', 'draft', ...(counts && 'expired' in counts ? ['expired'] : [])].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateUrl({ status, page: 1 })}
                      className={`min-h-[44px] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all flex-shrink-0 ${
                        statusFromUrl === status 
                          ? 'bg-vintage-primary text-white' 
                          : 'bg-white text-text-muted border border-gray-200 hover:border-vintage-primary/30'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-text-muted border-l border-gray-200 pl-4">
                <div className="flex flex-col items-center">
                  <span className="text-text text-sm">{counts?.total ?? pagination.total}</span>
                  <span>Total</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-green-600 text-sm">{counts?.active ?? products.filter(p => p.status === 'active' && !p.is_expired).length}</span>
                  <span>Active</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-yellow-600 text-sm">{counts?.draft ?? products.filter(p => p.status === 'draft').length}</span>
                  <span>Drafts</span>
                </div>
                {counts && 'expired' in counts && (
                  <div className="flex flex-col items-center">
                    <span className="text-amber-600 text-sm">{counts.expired}</span>
                    <span>Expired</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-wide py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-50">
            <Loader2 className="w-12 h-12 animate-spin text-vintage-primary mb-4" />
            <p className="font-bold text-text uppercase tracking-widest text-xs">Syncing Inventory...</p>
          </div>
        ) : products.length > 0 ? (
          <>
          <div className="flex items-center gap-3 mb-4 px-3 py-2 bg-white border border-gray-100 rounded-xl">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 text-vintage-primary hover:bg-vintage-primary/5 rounded-lg transition-colors"
              aria-label={selectedIds.size === products.length ? 'Deselect all' : 'Select all'}
            >
              {selectedIds.size === products.length ? (
                <CheckSquare className="w-6 h-6" />
              ) : (
                <Square className="w-6 h-6 text-gray-300" />
              )}
            </button>
            <span className="text-sm text-text-muted font-medium">
              {selectedIds.size === products.length ? 'Deselect all' : 'Select all on this page'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 py-6">
            {pagination.totalPages > 1 && (
              <button
                type="button"
                onClick={() => updateUrl({ limit: 'all', page: 1 })}
                className="min-h-[44px] px-4 py-2 rounded-lg border border-gray-200 bg-white text-text hover:bg-gray-50 hover:border-vintage-primary/30 transition-colors text-sm font-medium"
              >
                View All
              </button>
            )}
            <PaginationNav
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              basePath="/admin/inventory"
              searchParams={{
                ...(limitFromUrl !== '20' && { limit: limitFromUrl }),
                ...(statusFromUrl !== 'all' && { status: statusFromUrl }),
                ...(featuredFromUrl && { featured: featuredFromUrl }),
                ...(searchFromUrl && { search: searchFromUrl }),
              }}
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            {products.map((product) => (
              <div 
                key={product.id} 
                className={`flex items-center gap-3 p-3 rounded-xl transition-all group relative overflow-hidden ${
                  product.is_expired
                    ? 'bg-amber-50/50 border-l-4 border-l-amber-400 border border-amber-100 hover:border-amber-200'
                    : 'bg-white border border-gray-100 hover:border-vintage-primary/30 hover:shadow-md'
                }`}
              >
                {/* Checkbox - min 44px touch target */}
                <button
                  type="button"
                  onClick={() => toggleSelect(product.id)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 text-vintage-primary hover:bg-vintage-primary/5 rounded-lg transition-colors"
                  aria-label={selectedIds.has(product.id) ? 'Deselect' : 'Select'}
                >
                  {selectedIds.has(product.id) ? (
                    <CheckSquare className="w-6 h-6" />
                  ) : (
                    <Square className="w-6 h-6 text-gray-300" />
                  )}
                </button>
                {/* Status indicator line */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  product.status === 'active' ? 'bg-green-500' : 
                  product.status === 'draft' ? 'bg-yellow-500' : 'bg-gray-400'
                }`} />

                {/* Thumbnail - Compact on mobile */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 shadow-inner">
                  {product.image ? (
                    <img src={product.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                      <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                  )}
                </div>

                {/* Info - More compact layout */}
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex flex-col mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-lg text-text truncate group-hover:text-vintage-primary transition-colors">
                        {product.name}
                      </h3>
                      {getStatusBadge(product.status)}
                      {product.featured && (
                        <span className="px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-tighter">Featured</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 sm:gap-6 text-[10px] sm:text-xs">
                    <div className="flex flex-col">
                      <span className="text-text-muted font-bold text-[8px] uppercase tracking-wider">Price</span>
                      <span className="font-bold text-text">R{Number(product.price).toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-text-muted font-bold text-[8px] uppercase tracking-wider">Stock</span>
                      <span className={`font-bold ${(product.stock_quantity || 0) <= 5 ? 'text-vintage-accent' : 'text-text-light'}`}>
                        {product.stock_quantity ?? 0} <span className="hidden sm:inline">units</span>
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-text-muted font-bold text-[8px] uppercase tracking-wider">Condition</span>
                      <span className="font-medium text-text-light capitalize">
                        {Array.isArray(product.tags) && product.tags.some(t => (typeof t === 'string' ? t : t.name) === 'vintage') ? 'Vintage' : 'New'}
                      </span>
                    </div>
                    <div className="hidden md:flex flex-col">
                      <span className="text-text-muted font-bold text-[8px] uppercase tracking-wider">SKU</span>
                      <span className="font-mono text-text-light">{product.sku || '---'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions - Compact on mobile */}
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 sm:border-l sm:border-gray-100 sm:pl-3">
                  {product.source_url && (
                    <a
                      href={product.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-text-muted hover:text-vintage-primary hover:bg-vintage-primary/5 rounded-lg transition-all"
                      title={product.source_url.includes('temu.com') ? 'View on Temu' : product.source_url.includes('gumtree') ? 'View on Gumtree' : 'View source'}
                    >
                      <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                    </a>
                  )}
                  <ProductPrintLabelButton
                    product={product}
                    companyName={company.name}
                    currency={company.currency}
                    locale={locale}
                    ownerName={formatOwnerName(product.owner_first_name, product.owner_last_name)}
                    ownerPhone={company.contact.phone?.trim() || null}
                    logoUrl={company.logoUrl}
                    tagline={company.tagline}
                    brandColor={company.brandColor}
                    variant="icon"
                  />
                  <Link 
                    href={`/admin/inventory/edit/${product.id}`}
                    className="p-2 text-text-muted hover:text-vintage-primary hover:bg-vintage-primary/5 rounded-lg transition-all"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Link>
                  <button 
                    onClick={() => handleDelete(product)}
                    className="p-2 text-text-muted hover:text-vintage-accent hover:bg-vintage-accent/5 rounded-lg transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <a 
                    href={`/products/${product.slug}`} 
                    target="_blank"
                    className="hidden sm:flex p-2 text-text-muted hover:text-vintage-primary hover:bg-vintage-primary/5 rounded-lg transition-all"
                    title="View Public Page"
                  >
                    <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {selectedIds.size > 0 && (
            <div className="sticky bottom-4 left-0 right-0 z-20 mt-6 p-4 bg-white border border-vintage-primary/30 rounded-xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="font-bold text-text">
                {selectedIds.size} selected
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleBulkEdit}
                  className="min-h-[44px] flex-1 sm:flex-none px-4 py-2 btn btn-secondary flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="min-h-[44px] flex-1 sm:flex-none px-4 py-2 btn btn-accent flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 py-6">
            {pagination.totalPages > 1 && (
              <button
                type="button"
                onClick={() => updateUrl({ limit: 'all', page: 1 })}
                className="min-h-[44px] px-4 py-2 rounded-lg border border-gray-200 bg-white text-text hover:bg-gray-50 hover:border-vintage-primary/30 transition-colors text-sm font-medium"
              >
                View All
              </button>
            )}
            <PaginationNav
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              basePath="/admin/inventory"
              searchParams={{
                ...(limitFromUrl !== '20' && { limit: limitFromUrl }),
                ...(statusFromUrl !== 'all' && { status: statusFromUrl }),
                ...(featuredFromUrl && { featured: featuredFromUrl }),
                ...(searchFromUrl && { search: searchFromUrl }),
              }}
            />
          </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="p-6 bg-gray-50 rounded-full mb-6 text-gray-300 shadow-inner">
              <AlertCircle className="w-16 h-16" />
            </div>
            <h3 className="text-xl font-bold text-text">No products found</h3>
            <p className="text-text-muted max-w-xs mx-auto mt-2">
              {searchFromUrl || statusFromUrl !== 'all' || featuredFromUrl 
                ? "We couldn't find any products matching your current filters." 
                : "You haven't added any products to your inventory yet."}
            </p>
            {(searchFromUrl || statusFromUrl !== 'all' || featuredFromUrl) && (
              <button 
                onClick={() => updateUrl({ search: '', status: 'all', featured: '', page: 1 })}
                className="mt-6 text-vintage-primary font-bold hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {isProductModalOpen && (
        <ProductForm 
          onClose={() => setIsProductModalOpen(false)} 
          onSuccess={() => fetchProducts()}
        />
      )}
      {editingProduct && (
        <ProductForm 
          product={editingProduct} 
          onClose={() => setEditingProduct(null)} 
          onSuccess={() => fetchProducts()}
        />
      )}
      {isCategoryModalOpen && (
        <CategoryManager onClose={() => setIsCategoryModalOpen(false)} />
      )}
      {isBulkEditOpen && (
        <BulkEditModal
          count={selectedIds.size}
          onClose={() => setIsBulkEditOpen(false)}
          onSubmit={handleBulkEditSubmit}
        />
      )}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Confirm"
        danger
        onConfirm={() => confirmDialog.onConfirm()}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </div>
  )
}
