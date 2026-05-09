'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ecommerceApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import PaginationNav from '@/components/ui/PaginationNav'
import {
  ArrowLeft,
  Package,
  Truck,
  Loader2,
  Filter,
  Eye,
} from 'lucide-react'

interface OrderItem {
  id: string
  product_image?: string
  supplier_slug?: string
  cancelled?: boolean
}

interface Order {
  id: string
  order_number: string
  status: string
  payment_status: string
  total: number
  shipping: number
  delivery_method: string
  waybill_number?: string
  tracking_number?: string
  fulfillment_split?: { gumtree?: 'collect' | 'deliver'; other_courier?: string }
  created_at: string
  paid_at?: string
  customer_email?: string
  customer_first_name?: string
  customer_last_name?: string
  items?: OrderItem[]
  refund_needed?: boolean
  refund_due?: number
}

const PAGE_SIZE = 20

function normalizeSupplierSlug(raw: string | undefined): string {
  if (!raw) return ''
  return raw.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

function orderRequiresCourierGuyShipment(order: Order): boolean {
  if ((order.delivery_method || '').trim().toLowerCase() === 'collect') return false
  const split = order.fulfillment_split || {}
  const gumtreeCollect = (split.gumtree || '').trim().toLowerCase() === 'collect'
  const hasOtherCourierLeg = Boolean((split.other_courier || '').trim())

  const activeItems = (order.items || []).filter((item) => !item.cancelled)
  let hasNonGumtreeCourierItem = false
  let hasGumtreeCourierItem = false
  for (const item of activeItems) {
    const slug = normalizeSupplierSlug(item.supplier_slug)
    if (!slug || slug === 'temu' || slug === 'aliexpress' || slug === 'ubuy') {
      hasNonGumtreeCourierItem = true
      continue
    }
    if (slug === 'gumtree') hasGumtreeCourierItem = true
  }

  if (hasNonGumtreeCourierItem) return true
  if (hasOtherCourierLeg) return true
  if (hasGumtreeCourierItem && !gumtreeCollect) return true
  return false
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pageFromUrl = parseInt(searchParams.get('page') || '1', 10)
  const statusFromUrl = searchParams.get('status') || 'all'

  const { profile, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [counts, setCounts] = useState({ total: 0, pending: 0, paid: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 })
  const [loading, setLoading] = useState(true)
  const [creatingShipment, setCreatingShipment] = useState<string | null>(null)
  const { showSuccess, showError } = useToast()

  const isAuthorized = profile?.role === 'admin' || profile?.role === 'business_owner'

  const updateUrl = useCallback((updates: { page?: number; status?: string }) => {
    const params = new URLSearchParams(searchParams.toString())
    if (updates.page !== undefined) params.set('page', String(updates.page))
    if (updates.status !== undefined) params.set('status', updates.status)
    router.push(`/admin/orders?${params.toString()}`)
  }, [router, searchParams])

  useEffect(() => {
    if (!authLoading && !isAuthorized) {
      router.push('/login')
    }
  }, [isAuthorized, authLoading, router])

  const fetchOrders = useCallback(async () => {
    if (!isAuthorized) return
    try {
      setLoading(true)
      const params: Record<string, string | number> = {
        page: pageFromUrl,
        limit: PAGE_SIZE,
      }
      if (statusFromUrl !== 'all') params.status = statusFromUrl
      const response: any = await ecommerceApi.orders.list(params)
      const orderData = response?.data || (Array.isArray(response) ? response : response?.results || [])
      setOrders(Array.isArray(orderData) ? orderData : [])

      const pag = response?.pagination
      if (pag) {
        setPagination({
          page: pag.page ?? 1,
          totalPages: pag.totalPages ?? 1,
          total: pag.total ?? orderData.length,
        })
      } else {
        setPagination({ page: 1, totalPages: 1, total: orderData.length })
      }

      if (response?.counts) {
        setCounts({
          total: response.counts.total ?? 0,
          pending: response.counts.pending ?? 0,
          paid: response.counts.paid ?? 0,
          processing: response.counts.processing ?? 0,
          shipped: response.counts.shipped ?? 0,
          delivered: response.counts.delivered ?? 0,
          cancelled: response.counts.cancelled ?? 0,
        })
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      showError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [isAuthorized, pageFromUrl, statusFromUrl, showError])

  useEffect(() => {
    if (isAuthorized) {
      fetchOrders()
    }
  }, [isAuthorized, fetchOrders])

  const handleCreateShipment = async (orderId: string) => {
    setCreatingShipment(orderId)
    try {
      await ecommerceApi.orders.createShipment(orderId)
      showSuccess('Shipment created successfully')
      fetchOrders()
    } catch (error: any) {
      const msg = error?.details?.error?.message || error?.message || 'Failed to create shipment'
      showError(msg)
    } finally {
      setCreatingShipment(null)
    }
  }

  const canCreateShipment = (order: Order) =>
    orderRequiresCourierGuyShipment(order) &&
    (order.status === 'paid' || order.status === 'processing') &&
    !order.waybill_number &&
    !order.tracking_number

  const deliveryMethodLabel: Record<string, string> = {
    standard: 'Standard',
    express: 'Express',
    pudo: 'Pudo Pickup',
    collect: 'Collect In-Store',
    'same-day': 'Same Day',
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      shipped: 'bg-blue-100 text-blue-700',
      processing: 'bg-indigo-100 text-indigo-700',
      paid: 'bg-vintage-primary/10 text-vintage-primary',
      pending: 'bg-gray-100 text-gray-700',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    )
  }

  const getFirstItemImage = (order: Order) => {
    const items = order.items || []
    const first = items.find((i: OrderItem) => i.product_image)
    return first?.product_image
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="container-wide py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin/inventory" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-text-light" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold font-playfair text-text">Orders</h1>
                <p className="text-xs text-text-muted uppercase tracking-widest font-bold">Store Admin</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-50 border-t border-gray-100 mt-4 -mx-4 px-4 py-3">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                <Filter className="w-4 h-4 text-text-muted flex-shrink-0" />
                <div className="flex gap-1 flex-wrap">
                  {['all', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => updateUrl({ status, page: 1 })}
                      className={`min-h-[44px] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-shrink-0 ${
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
                  <span className="text-text text-sm">{counts.total}</span>
                  <span>Total</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-600 text-sm">{counts.pending}</span>
                  <span>Pending</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-green-600 text-sm">{counts.paid}</span>
                  <span>Paid</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-blue-600 text-sm">{counts.shipped}</span>
                  <span>Shipped</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-red-600 text-sm">{counts.cancelled}</span>
                  <span>Cancelled</span>
                </div>
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
            <p className="font-bold text-text uppercase tracking-widest text-xs">Loading orders...</p>
          </div>
        ) : orders.length > 0 ? (
          <>
          <div className="grid grid-cols-1 gap-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-vintage-primary/30 hover:shadow-md transition-all group relative overflow-hidden"
              >
                {/* Status indicator stripe */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    order.status === 'delivered' ? 'bg-green-500' :
                    order.status === 'cancelled' ? 'bg-red-500' :
                    order.status === 'shipped' ? 'bg-blue-500' :
                    order.status === 'paid' ? 'bg-vintage-primary' :
                    'bg-gray-400'
                  }`}
                />
                {/* Thumbnail */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 shadow-inner">
                  {getFirstItemImage(order) ? (
                    <img src={getFirstItemImage(order)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                      <Package className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex flex-col mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-bold text-sm sm:text-lg text-vintage-primary hover:underline truncate"
                      >
                        #{order.order_number}
                      </Link>
                      {getStatusBadge(order.status)}
                      {order.refund_needed && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                          Refund needed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-muted truncate">
                      {order.customer_first_name} {order.customer_last_name} • {order.customer_email}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] sm:text-xs text-text-muted mt-1">
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      <span>{deliveryMethodLabel[order.delivery_method] || order.delivery_method}</span>
                      {order.waybill_number && (
                        <span className="font-mono">Waybill: {order.waybill_number}</span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:border-l sm:border-gray-100 sm:pl-3">
                  <div className="text-right sm:mr-2">
                    <p className="text-[10px] font-bold uppercase text-text-muted">Total</p>
                    <p className="font-bold text-text">R{Number(order.total).toFixed(2)}</p>
                  </div>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="min-h-[44px] px-4 py-2 btn btn-secondary flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Link>
                  {canCreateShipment(order) && (
                    <button
                      onClick={() => handleCreateShipment(order.id)}
                      disabled={!!creatingShipment}
                      className="min-h-[44px] px-4 py-2 btn btn-primary flex items-center justify-center gap-2"
                    >
                      {creatingShipment === order.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Truck className="w-4 h-4" />
                      )}
                      Ship
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <PaginationNav
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            basePath="/admin/orders"
            searchParams={{
              ...(statusFromUrl !== 'all' && { status: statusFromUrl }),
            }}
          />
          </>
        ) : (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-text mb-2">No orders found</h3>
            <p className="text-text-muted mb-6">
              {statusFromUrl === 'all' ? 'No orders yet.' : `No orders with status "${statusFromUrl}".`}
            </p>
            <Link href="/admin/inventory" className="btn btn-primary">
              Back to Inventory
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
