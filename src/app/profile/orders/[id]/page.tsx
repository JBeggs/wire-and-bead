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
  ExternalLink,
} from 'lucide-react'
import { ensureAbsoluteImageUrl } from '@/lib/image-utils'

interface OrderItem {
  id: string
  product_id?: string
  product_name: string
  product?: { supplier_slug?: string }
  product_image: string
  product_sku?: string
  price: number
  quantity: number
  subtotal: number
  cancelled?: boolean
  cancelled_at?: string
  is_bundle?: boolean
  bundle_images?: string[]
}

interface Order {
  id: string
  order_number: string
  status: string
  payment_status: string
  subtotal: number
  shipping: number
  tax: number
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
  refund_due?: number
  refund_needed?: boolean
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

export default function CustomerOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { user, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [trackingInfo, setTrackingInfo] = useState<Record<string, unknown> | null>(null)
  const [loadingTracking, setLoadingTracking] = useState(false)
  const [cancellingItem, setCancellingItem] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true)
      const response: any = await ecommerceApi.orders.get(id)
      const data = response?.data || response
      setOrder(data)
    } catch (error) {
      console.error('Error fetching order:', error)
      showError('Failed to load order')
      router.push('/profile')
    } finally {
      setLoading(false)
    }
  }, [id, router, showError])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user && id) {
      fetchOrder()
    }
  }, [user, authLoading, id, fetchOrder, router])

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

  const handleCancelItem = async (itemId: string) => {
    setCancellingItem(itemId)
    try {
      await ecommerceApi.orders.cancelItem(id, itemId)
      showSuccess('Item cancelled. Order totals and refund have been updated.')
      await fetchOrder()
    } catch (error: any) {
      const msg = error?.details?.error?.message || error?.message || 'Failed to cancel item'
      showError(msg)
    } finally {
      setCancellingItem(null)
    }
  }

  const canCancelItem = order &&
    !['shipped', 'delivered', 'cancelled'].includes(order.status)

  const hasShipment = order && (order.waybill_number || order.tracking_number)
  const addr = order?.shipping_address || {}

  if (authLoading || !user) {
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
              <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-text-light" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold font-playfair text-text">
                  Order #{order.order_number}
                </h1>
                <p className="text-xs text-text-muted uppercase tracking-widest font-bold">My Order</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(order.status)}
              {getStatusBadge(order.payment_status)}
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
            <p className="text-sm text-text">
              {deliveryMethodLabel[order.delivery_method] || order.delivery_method}
            </p>
            {addr.address && (
              <p className="text-sm text-text-muted mt-1">
                {[addr.address, addr.city, addr.province, addr.postalCode].filter(Boolean).join(', ')}
              </p>
            )}
            {order.pudo_pickup_point && typeof order.pudo_pickup_point === 'object' && (order.pudo_pickup_point as Record<string, unknown>).address ? (
              <p className="text-sm text-text-muted mt-2">
                <span className="font-medium text-text">Pudo:</span>{' '}
                {String((order.pudo_pickup_point as Record<string, unknown>).address)}
              </p>
            ) : null}
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
              Your Gumtree items will be available for collection at our store. We will contact you when they are ready.
            </p>
          </div>
        )}

        {/* Courier Guy / Tracking */}
        {(hasShipment || ['standard', 'express', 'pudo'].includes(order.delivery_method) || order.fulfillment_split?.other_courier) && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-text mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              {order.fulfillment_split?.gumtree === 'collect' && order.fulfillment_split?.other_courier
                ? 'Courier Guy (Imports)'
                : 'Courier Guy'}
            </h2>
            {!hasShipment && (['standard', 'express', 'pudo'].includes(order.delivery_method) || order.fulfillment_split?.other_courier) && (
              <p className="text-sm text-text-muted mb-4">
                {order.fulfillment_split?.gumtree === 'collect'
                  ? 'Your import items will be delivered via The Courier Guy. Tracking details will appear here once shipped.'
                  : 'Your order will be delivered via The Courier Guy. Tracking details will appear here once your order has been shipped.'}
              </p>
            )}
            {hasShipment && (
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
            )}
            {hasShipment && (
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
            )}
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
                  {item.is_bundle && Array.isArray(item.bundle_images) && item.bundle_images.length > 1 ? (
                    <div className="grid grid-cols-2 gap-0.5 h-full w-full p-0.5">
                      {item.bundle_images.slice(0, 4).map((url, i) => (
                        <div key={`${url}-${i}`} className="aspect-square overflow-hidden rounded bg-white border border-gray-200">
                          <img
                            src={ensureAbsoluteImageUrl(url)}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/images/products/default.svg' }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : item.product_image ? (
                    <img src={ensureAbsoluteImageUrl(item.product_image)} alt="" className="w-full h-full object-cover" />
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
              <span className="text-text-muted">
                {['standard', 'express', 'pudo'].includes(order.delivery_method) ? 'Shipping (incl. Courier Guy)' : 'Shipping'}
              </span>
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
    </div>
  )
}
