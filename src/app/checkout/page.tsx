'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ecommerceApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Cart } from '@/lib/types'
import { ArrowLeft, CreditCard, Truck, Shield, Lock, Phone, MapPin } from 'lucide-react'
import { PudoLocationSelector, type PudoLocation } from '@/components/checkout/PudoLocationSelector'

type DeliveryMethod = 'standard' | 'express' | 'pudo' | 'collect'

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('standard')
  const [selectedPudoLocation, setSelectedPudoLocation] = useState<PudoLocation | null>(null)
  const { user, profile } = useAuth()
  const { showError, showSuccess } = useToast()
  const router = useRouter()

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    shipping_address_line1: '',
    shipping_address_line2: '',
    shipping_city: '',
    shipping_state: '',
    shipping_postal_code: '',
    shipping_country: 'South Africa',
    customer_notes: '',
  })

  useEffect(() => {
    fetchCart()
    // Pre-fill form with user or profile data (customers have no profile, use user)
    const name = profile?.full_name || (user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`.trim()
      : user?.first_name || user?.last_name || user?.email?.split('@')[0] || '')
    const email = profile?.email || user?.email || ''
    if (name || email) {
      setFormData(prev => ({
        ...prev,
        customer_name: name,
        customer_email: email,
      }))
    }
  }, [profile, user])

  // Update cart shipping when delivery method or pudo selection changes (so order summary reflects correct total)
  useEffect(() => {
    if (!cart || loading || processing) return
    const payload: { delivery_method: string; pudo_pickup_point?: PudoLocation } = { delivery_method: deliveryMethod }
    if (deliveryMethod === 'pudo' && selectedPudoLocation) {
      payload.pudo_pickup_point = selectedPudoLocation
    }
    ecommerceApi.cart.updateShipping(payload)
      .then(() => fetchCart())
      .catch(() => {})
  }, [deliveryMethod, selectedPudoLocation])

  const fetchCart = async () => {
    try {
      const response = await ecommerceApi.cart.get() as any
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
      if (!cartData || !cartData.items || cartData.items.length === 0) {
        router.push('/cart')
      }
    } catch (error) {
      console.error('Error fetching cart:', error)
      router.push('/cart')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (deliveryMethod === 'pudo' && !selectedPudoLocation) {
      showError('Please select a Pudo pickup point')
      return
    }

    setProcessing(true)

    try {
      // Update cart with delivery method so shipping is calculated correctly
      const cartUpdatePayload: { delivery_method: string; pudo_pickup_point?: PudoLocation } = {
        delivery_method: deliveryMethod,
      }
      if (deliveryMethod === 'pudo' && selectedPudoLocation) {
        cartUpdatePayload.pudo_pickup_point = selectedPudoLocation
      }
      await ecommerceApi.cart.updateShipping(cartUpdatePayload)

      // Build shipping address - use pudo address for pudo, placeholder for collect, form for standard/express
      let shippingAddress: Record<string, string>
      if (deliveryMethod === 'pudo' && selectedPudoLocation) {
        shippingAddress = {
          line1: selectedPudoLocation.address,
          line2: '',
          city: selectedPudoLocation.city,
          state: selectedPudoLocation.province || '',
          postal_code: selectedPudoLocation.postal_code || selectedPudoLocation.postalCode || '',
          country: 'South Africa',
        }
      } else if (deliveryMethod === 'collect') {
        shippingAddress = {
          line1: 'In-store collection',
          line2: '',
          city: 'N/A',
          state: '',
          postal_code: '0000',
          country: 'South Africa',
        }
      } else {
        shippingAddress = {
          line1: formData.shipping_address_line1,
          line2: formData.shipping_address_line2,
          city: formData.shipping_city,
          state: formData.shipping_state,
          postal_code: formData.shipping_postal_code,
          country: formData.shipping_country,
        }
      }

      const orderPayload: Record<string, unknown> = {
        customer: {
          name: formData.customer_name,
          email: formData.customer_email,
          phone: formData.customer_phone,
        },
        shipping_address: shippingAddress,
        delivery_method: deliveryMethod,
        payment_method: 'yoco',
        notes: formData.customer_notes,
      }

      if (deliveryMethod === 'pudo' && selectedPudoLocation) {
        orderPayload.pudo_pickup_point = selectedPudoLocation
      }

      const orderResponse = await ecommerceApi.checkout.initiate(orderPayload) as any
      const order = orderResponse?.data ?? orderResponse

      // R2000 Rule: If order is over 2000, don't go to payment
      const total = order?.total ?? cart?.total ?? cart?.subtotal ?? 0
      if (total > 2000) {
        showSuccess('Order Placed! A representative will contact you shortly.')
        const orderNumber = order?.order_number ?? order?.id
        router.push(`/checkout/success?orderId=${orderNumber}&highValue=true`)
        return
      }

      // Create Yoco checkout for orders <= 2000
      const orderId = order?.id
      if (!orderId) {
        showError('Invalid order response')
        return
      }
      const checkout = await ecommerceApi.payments.createCheckout(orderId) as any

      if (checkout.redirectUrl) {
        // Redirect to Yoco payment page
        window.location.href = checkout.redirectUrl
      } else {
        showError('Failed to create payment session')
      }
    } catch (error: any) {
      showError(error.message || 'Failed to process checkout')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-vintage-background py-12">
        <div className="container-wide">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8" />
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded" />
              <div className="h-64 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-vintage-background py-12" data-cy="checkout-content">
      <div className="container-wide">
        {/* Back Link */}
        <Link href="/cart" className="flex items-center text-text-muted hover:text-vintage-primary transition-colors mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Link>

        <h1 className="text-3xl font-bold font-playfair text-text mb-8">Checkout</h1>

        <form onSubmit={handleSubmit} data-cy="checkout-form">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Information */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-text mb-4">Contact Information</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="customer_name" className="form-label">Full Name *</label>
                    <input
                      id="customer_name"
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="customer_email" className="form-label">Email *</label>
                    <input
                      id="customer_email"
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="customer_phone" className="form-label">Phone</label>
                    <input
                      id="customer_phone"
                      type="tel"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Method */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Delivery Method
                </h2>
                <div className="space-y-3">
                  <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    deliveryMethod === 'standard' ? 'border-vintage-primary bg-vintage-primary/5' : 'border-gray-200 hover:border-vintage-primary/50'
                  }`}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="standard"
                      checked={deliveryMethod === 'standard'}
                      onChange={() => setDeliveryMethod('standard')}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium">Standard Shipping</span>
                      <span className="ml-2 text-text-muted">R65 (free over R500)</span>
                      <p className="text-sm text-text-muted mt-0.5">3-5 business days</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    deliveryMethod === 'express' ? 'border-vintage-primary bg-vintage-primary/5' : 'border-gray-200 hover:border-vintage-primary/50'
                  }`}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="express"
                      checked={deliveryMethod === 'express'}
                      onChange={() => setDeliveryMethod('express')}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium">Express Shipping</span>
                      <span className="ml-2 text-text-muted">R120</span>
                      <p className="text-sm text-text-muted mt-0.5">1-2 business days</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    deliveryMethod === 'pudo' ? 'border-vintage-primary bg-vintage-primary/5' : 'border-gray-200 hover:border-vintage-primary/50'
                  }`}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="pudo"
                      checked={deliveryMethod === 'pudo'}
                      onChange={() => { setDeliveryMethod('pudo'); setSelectedPudoLocation(null) }}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium">Pudo Pickup Point</span>
                      <span className="ml-2 text-text-muted">R30</span>
                      <p className="text-sm text-text-muted mt-0.5">Collect from nearest Pudo location</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    deliveryMethod === 'collect' ? 'border-vintage-primary bg-vintage-primary/5' : 'border-gray-200 hover:border-vintage-primary/50'
                  }`}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="collect"
                      checked={deliveryMethod === 'collect'}
                      onChange={() => setDeliveryMethod('collect')}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium">Collect In-Store</span>
                      <span className="ml-2 text-text-muted">Free</span>
                      <p className="text-sm text-text-muted mt-0.5">Pick up from our store</p>
                    </div>
                  </label>
                </div>

                {deliveryMethod === 'pudo' && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <PudoLocationSelector
                      selectedLocation={selectedPudoLocation}
                      onSelect={setSelectedPudoLocation}
                      disabled={processing}
                    />
                  </div>
                )}
              </div>

              {/* Shipping Address - only for standard/express */}
              {(deliveryMethod === 'standard' || deliveryMethod === 'express') && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Shipping Address
                </h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="shipping_address_line1" className="form-label">Address Line 1 *</label>
                    <input
                      id="shipping_address_line1"
                      type="text"
                      value={formData.shipping_address_line1}
                      onChange={(e) => setFormData({ ...formData, shipping_address_line1: e.target.value })}
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="shipping_address_line2" className="form-label">Address Line 2</label>
                    <input
                      id="shipping_address_line2"
                      type="text"
                      value={formData.shipping_address_line2}
                      onChange={(e) => setFormData({ ...formData, shipping_address_line2: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="shipping_city" className="form-label">City *</label>
                      <input
                        id="shipping_city"
                        type="text"
                        value={formData.shipping_city}
                        onChange={(e) => setFormData({ ...formData, shipping_city: e.target.value })}
                        className="form-input"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="shipping_state" className="form-label">Province</label>
                      <input
                        id="shipping_state"
                        type="text"
                        value={formData.shipping_state}
                        onChange={(e) => setFormData({ ...formData, shipping_state: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="shipping_postal_code" className="form-label">Postal Code *</label>
                      <input
                        id="shipping_postal_code"
                        type="text"
                        value={formData.shipping_postal_code}
                        onChange={(e) => setFormData({ ...formData, shipping_postal_code: e.target.value })}
                        className="form-input"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="shipping_country" className="form-label">Country</label>
                      <input
                        id="shipping_country"
                        type="text"
                        value={formData.shipping_country}
                        className="form-input bg-gray-50"
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Order Notes */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-text mb-4">Order Notes (Optional)</h2>
                <textarea
                  value={formData.customer_notes}
                  onChange={(e) => setFormData({ ...formData, customer_notes: e.target.value })}
                  className="form-input resize-none"
                  rows={3}
                  placeholder="Any special instructions for your order..."
                />
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-24">
                <h2 className="text-lg font-semibold text-text mb-4">Order Summary</h2>
                
                {/* Items */}
                <div className="space-y-3 mb-4">
                  {cart?.items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-text-muted">
                        {item.product_name || item.product?.name || 'Product'} x {item.quantity}
                      </span>
                      <span className="font-medium">R{Number(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="divider my-4" />

                {/* Totals */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Subtotal</span>
                    <span className="font-medium">R{Number(cart?.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Shipping</span>
                    <span className="font-medium">
                      {cart?.shipping ? `R${Number(cart.shipping).toFixed(2)}` : 'Calculated'}
                    </span>
                  </div>
                  <div className="divider my-4" />
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-vintage-primary">
                      R{Number(cart?.total || cart?.subtotal || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment Button */}
                <button
                  type="submit"
                  data-cy="checkout-submit"
                  disabled={processing}
                  className="btn btn-primary w-full mt-6 py-3"
                >
                  {Number(cart?.total || cart?.subtotal || 0) > 2000 ? (
                    <>
                      <Phone className="w-5 h-5 mr-2" />
                      {processing ? 'Processing...' : 'Place Order'}
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      {processing ? 'Processing...' : 'Pay with Yoco'}
                    </>
                  )}
                </button>

                {/* Security Note */}
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-text-muted">
                  <Lock className="w-4 h-4" />
                  <span>Secure payment powered by Yoco</span>
                </div>

                {/* Trust Badges */}
                <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 gap-4 text-center text-xs text-text-muted">
                  <div>
                    <Shield className="w-5 h-5 mx-auto mb-1" />
                    <span>Secure Checkout</span>
                  </div>
                  <div>
                    <Truck className="w-5 h-5 mx-auto mb-1" />
                    <span>Fast Delivery</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
