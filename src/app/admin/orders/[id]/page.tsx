'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ecommerceApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import {
  ArrowLeft,
  Package,
  Truck,
  Loader2,
  MapPin,
  Mail,
  Phone,
  X,
  ExternalLink,
} from 'lucide-react'

interface OrderItem {
  id: string
  product_id?: string
  product_name: string
  product_image: string
  product_sku?: string
  price: number
  quantity: number
  subtotal: number
  cancelled?: boolean
  cancelled_at?: string
}

interface Order {
  id: string
  order_number: string
  status: string
  payment_status: string
  subtotal: number
  shipping: number
  tax: number
  refund_due?: number
  refund_needed?: boolean
  discount: number
  total: number
  delivery_method: string
  waybill_number?: string
  tracking_number?: string
  collection_code?: string
  courier?: Record<string, unknown>
  created_at: string
  paid_at?: string
  shipped_at?: string
  delivered_at?: string
  cancelled_at?: string
  customer_email?: string
  customer_first_name?: string
  customer_last_name?: string
  customer_phone?: string
  shipping_address?: Record<string, string>
  pudo_pickup_point?: Record<string, unknown>
  fulfillment_split?: { gumtree?: 'collect' | 'deliver'; other_courier?: string }
  items: OrderItem[]
}

const deliveryMethodLabel: Record<string, string> = {
  standard: 'Courier Guy - Standard',
  express: 'Courier Guy - Express',
  pudo: 'Courier Guy - Pudo Pickup',
  collect: 'Collect In-Store',
  'same-day': 'Same Day',
}

function getStatusBadge(status: string) {
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

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { profile, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [trackingInfo, setTrackingInfo] = useState<Record<string, unknown> | null>(null)
  const [loadingTracking, setLoadingTracking] = useState(false)
  const [creatingShipment, setCreatingShipment] = useState(false)
  const [cancellingItem, setCancellingItem] = useState<string | null>(null)
  const [showCancelOrderModal, setShowCancelOrderModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancellingOrder, setCancellingOrder] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  const isAuthorized = profile?.role === 'admin' || profile?.role === 'business_owner'

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true)
      const response: any = await ecommerceApi.orders.get(id)
      const data = response?.data || response
      setOrder(data)
    } catch (error) {
      console.error('Error fetching order:', error)
      showError('Failed to load order')
      router.push('/admin/orders')
    } finally {
      setLoading(false)
    }
  }, [id, router, showError])

  useEffect(() => {
    if (!authLoading && !isAuthorized) {
      router.push('/login')
      return
    }
    if (isAuthorized && id) {
      fetchOrder()
    }
  }, [isAuthorized, authLoading, id, fetchOrder, router])

  const handleTrackShipment = async () => {
    setLoadingTracking(true)
    setTrackingInfo(null)
    try {
      const response: any = await ecommerceApi.orders.trackShipment(id)
      setTrackingInfo(response?.data || response)
    } catch (error: any) {
      const msg = error?.details?.error?.message || error?.message || 'Failed to get tracking'
      showError(msg)
    } finally {
      setLoadingTracking(false)
    }
  }

  const handleCreateShipment = async () => {
    setCreatingShipment(true)
    try {
      await ecommerceApi.orders.createShipment(id)
      showSuccess('Shipment created successfully')
      fetchOrder()
    } catch (error: any) {
      const msg = error?.details?.error?.message || error?.message || 'Failed to create shipment'
      showError(msg)
    } finally {
      setCreatingShipment(false)
    }
  }

  const handleCancelItem = async (itemId: string) => {
    setCancellingItem(itemId)
    try {
      await ecommerceApi.orders.cancelItem(id, itemId)
      showSuccess('Item cancelled')
      fetchOrder()
    } catch (error: any) {
      const msg = error?.details?.error?.message || error?.message || 'Failed to cancel item'
      showError(msg)
    } finally {
      setCancellingItem(null)
    }
  }

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      showError('Please provide a reason for cancellation')
      return
    }
    setCancellingOrder(true)
    try {
      await ecommerceApi.orders.cancel(id, { reason: cancelReason.trim(), refund: false })
      showSuccess('Order cancelled')
      setShowCancelOrderModal(false)
      setCancelReason('')
      fetchOrder()
    } catch (error: any) {
      const msg = error?.details?.error?.message || error?.message || 'Failed to cancel order'
      showError(msg)
    } finally {
      setCancellingOrder(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!newStatus) return
    setUpdatingStatus(true)
    try {
      await ecommerceApi.orders.updateStatus(id, { status: newStatus })
      showSuccess('Status updated')
      setNewStatus('')
      fetchOrder()
    } catch (error: any) {
      const msg = error?.details?.error?.message || error?.message || 'Failed to update status'
      showError(msg)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const canCreateShipment = order &&
    (order.status === 'paid' || order.status === 'processing') &&
    !order.waybill_number &&
    !order.tracking_number

  const canCancelOrder = order && ['pending', 'paid'].includes(order.status)
  const canCancelItem = order && !['shipped', 'delivered', 'cancelled'].includes(order.status)
  const hasShipment = order && (order.waybill_number || order.tracking_number)

  const addr = order?.shipping_address || {}

  if (authLoading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-vintage-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-vintage-primary opacity-50" />
      </div>
    )
  }

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-vintage-background flex flex-col items-center justify-center py-32">
        <Loader2 className="w-12 h-12 animate-spin text-vintage-primary mb-4" />
        <p className="font-bold text-text uppercase tracking-widest text-xs">Loading order...</p>
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
              <Link href="/admin/orders" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-text-light" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold font-playfair text-text">
                  Order #{order.order_number}
                </h1>
                <p className="text-xs text-text-muted uppercase tracking-widest font-bold">Store Admin</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(order.status)}
              {getStatusBadge(order.payment_status)}
              {canCreateShipment && (
                <button
                  onClick={handleCreateShipment}
                  disabled={creatingShipment}
                  className="min-h-[44px] px-4 py-2 btn btn-primary flex items-center gap-2"
                >
                  {creatingShipment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Truck className="w-4 h-4" />
                  )}
                  Create Shipment
                </button>
              )}
              {canCancelOrder && (
                <button
                  onClick={() => setShowCancelOrderModal(true)}
                  className="min-h-[44px] px-4 py-2 btn btn-accent flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container-wide py-8 space-y-6">
        {/* Customer & Shipping */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-text mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Customer
            </h2>
            <p className="font-medium text-text">
              {order.customer_first_name} {order.customer_last_name}
            </p>
            <p className="text-sm text-text-muted">{order.customer_email}</p>
            {order.customer_phone && (
              <p className="text-sm text-text-muted flex items-center gap-1 mt-1">
                <Phone className="w-3 h-3" />
                {order.customer_phone}
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-text mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Shipping
            </h2>
            {order.fulfillment_split?.gumtree === 'collect' && order.fulfillment_split?.other_courier ? (
              <div className="text-sm space-y-1">
                <p className="text-text">
                  <span className="font-medium">Gumtree:</span> Collect In-Store
                </p>
                <p className="text-text">
                  <span className="font-medium">Imports:</span>{' '}
                  {deliveryMethodLabel[order.fulfillment_split.other_courier] || order.fulfillment_split.other_courier}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text">
                {deliveryMethodLabel[order.delivery_method] || order.delivery_method}
              </p>
            )}
            {addr.address && (
              <p className="text-sm text-text-muted mt-1">
                {[addr.address, addr.city, addr.province, addr.postalCode].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Gumtree Collect (when split fulfillment) */}
        {order.fulfillment_split?.gumtree === 'collect' && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-text mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Gumtree Items – Collect In-Store
            </h2>
            <p className="text-sm text-text-muted">
              Gumtree items will be collected by the customer. No Courier Guy shipment for these items.
            </p>
          </div>
        )}

        {/* Courier / Tracking */}
        {hasShipment && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-text mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Courier & Tracking
            </h2>
            <div className="flex flex-wrap gap-4 mb-4">
              {order.waybill_number && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-text-muted">Waybill</span>
                  <p className="font-mono font-bold text-text">{order.waybill_number}</p>
                </div>
              )}
              {order.tracking_number && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-text-muted">Tracking</span>
                  <p className="font-mono font-bold text-text">{order.tracking_number}</p>
                </div>
              )}
              {order.collection_code && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-text-muted">Collection</span>
                  <p className="font-mono font-bold text-text">{order.collection_code}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleTrackShipment}
              disabled={loadingTracking}
              className="min-h-[44px] px-4 py-2 btn btn-secondary flex items-center gap-2"
            >
              {loadingTracking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              {loadingTracking ? 'Loading...' : 'Track Shipment'}
            </button>
            {trackingInfo && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-sm font-medium text-text mb-2">
                  Status: {String((trackingInfo as any).status || (trackingInfo as any).statusDescription || '—')}
                </p>
                {(trackingInfo as any).events && Array.isArray((trackingInfo as any).events) && (
                  <ul className="text-xs text-text-muted space-y-1">
                    {(trackingInfo as any).events.slice(0, 5).map((e: any, i: number) => (
                      <li key={i}>• {e.description || e.status || JSON.stringify(e)}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Update Status */}
        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-text mb-4">Update Status</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-vintage-primary"
              >
                <option value="">Select status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
              </select>
              <button
                onClick={handleUpdateStatus}
                disabled={!newStatus || updatingStatus}
                className="min-h-[44px] px-4 py-2 btn btn-primary disabled:opacity-50"
              >
                {updatingStatus ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        )}

        {/* Line Items */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <h2 className="font-bold text-text p-6 pb-0">Order Items</h2>
          <div className="p-6 space-y-4">
            {order.items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-4 rounded-xl border ${
                  item.cancelled ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100'
                }`}
              >
                <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                  {item.product_image ? (
                    <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Package className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-text">{item.product_name}</p>
                  {item.product_sku && (
                    <p className="text-xs text-text-muted font-mono">{item.product_sku}</p>
                  )}
                  <p className="text-sm text-text-muted">
                    R{Number(item.price).toFixed(2)} × {item.quantity} = R{Number(item.subtotal).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {item.cancelled ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase">
                      Cancelled
                    </span>
                  ) : canCancelItem ? (
                    <button
                      onClick={() => handleCancelItem(item.id)}
                      disabled={!!cancellingItem}
                      className="min-h-[44px] px-3 py-1 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                    >
                      {cancellingItem === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Cancel Item'
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm max-w-md ml-auto">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Subtotal</span>
              <span className="font-medium text-text">R{Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Shipping</span>
              <span className="font-medium text-text">R{Number(order.shipping).toFixed(2)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between">
                <span className="text-text-muted">Discount</span>
                <span className="font-medium text-vintage-accent">-R{Number(order.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="font-bold text-text">Total</span>
              <span className="font-bold text-text text-lg">R{Number(order.total).toFixed(2)}</span>
            </div>
            {order.refund_needed && Number(order.refund_due ?? 0) > 0 && (
              <div className="flex justify-between pt-2 border-t border-amber-200 bg-amber-50 -mx-4 px-4 py-2 rounded-lg mt-2">
                <span className="font-bold text-amber-800">Refund due</span>
                <span className="font-bold text-amber-800">R{Number(order.refund_due).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {showCancelOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text">Cancel Order</h2>
              <button
                type="button"
                onClick={() => { setShowCancelOrderModal(false); setCancelReason('') }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-text-muted mb-4">
              This will cancel the entire order. Stock will be restored. Please provide a reason.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-vintage-primary mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowCancelOrderModal(false); setCancelReason('') }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-text hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={!cancelReason.trim() || cancellingOrder}
                className="px-4 py-2 btn btn-accent disabled:opacity-50"
              >
                {cancellingOrder ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
