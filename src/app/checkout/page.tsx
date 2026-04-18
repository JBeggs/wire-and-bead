'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ecommerceApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Cart, CartItem, SupplierDeliveryBreakdownItem, type GumtreeFulfillmentMethod } from '@/lib/types'
import { ArrowLeft, CreditCard, Truck, Shield, Lock, MapPin, Package } from 'lucide-react'
import { getCartItemImages, normalizeCartResponse } from '@/lib/cart-utils'
import { getProductBundleImages } from '@/lib/image-utils'
import { PudoLocationSelector, type PudoLocation } from '@/components/checkout/PudoLocationSelector'

type DeliveryMethod = 'standard' | 'express' | 'pudo'

const COURIER_GUY_SLUGS = new Set(['temu', 'aliexpress', 'ubuy', 'gumtree'])
const OTHER_COURIER_SLUGS = new Set(['temu', 'aliexpress', 'ubuy']) // Courier Guy but not Gumtree
const GUMTREE_DELIVERY_BLOCK_MESSAGE = 'Item cannot be delivered. Please contact support.'
const PROVINCES = [
  { value: 'EC', label: 'Eastern Cape' },
  { value: 'FS', label: 'Free State' },
  { value: 'GP', label: 'Gauteng' },
  { value: 'KZN', label: 'KwaZulu-Natal' },
  { value: 'LP', label: 'Limpopo' },
  { value: 'MP', label: 'Mpumalanga' },
  { value: 'NC', label: 'Northern Cape' },
  { value: 'NW', label: 'North West' },
  { value: 'WC', label: 'Western Cape' },
]

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('standard')
  const [selectedPudoLocation, setSelectedPudoLocation] = useState<PudoLocation | null>(null)
  const [hasCourierGuyItems, setHasCourierGuyItems] = useState(false)
  const [hasGumtreeItems, setHasGumtreeItems] = useState(false)
  const [hasOtherCourierItems, setHasOtherCourierItems] = useState(false)
  const [gumtreeFulfillmentMethod, setGumtreeFulfillmentMethod] = useState<GumtreeFulfillmentMethod>('deliver')
  const [gumtreeDeliveryBlocked, setGumtreeDeliveryBlocked] = useState(false)
  const [pudoAvailable, setPudoAvailable] = useState(true)
  const [collectionAddressDisplay, setCollectionAddressDisplay] = useState<string | null>(null)
  const [addressChecked, setAddressChecked] = useState(false)
  const [addressQuoteMessage, setAddressQuoteMessage] = useState('')
  const [dynamicRates, setDynamicRates] = useState<Record<DeliveryMethod, number>>({
    standard: 90,
    express: 130,
    pudo: 40,
  })
  const { user, profile, loading: authLoading } = useAuth()
  const { showError } = useToast()
  const router = useRouter()

  const [formData, setFormData] = useState({
    business_name: '',
    customer_first_name: '',
    customer_last_name: '',
    customer_email: '',
    customer_phone: '',
    shipping_address: '',
    shipping_suburb: '',
    shipping_city: '',
    shipping_province: '',
    shipping_postal_code: '',
    shipping_country: 'ZA',
    customer_notes: '',
  })

  const showDeliveryMethods = addressChecked
  const breakdown: SupplierDeliveryBreakdownItem[] = cart?.supplier_delivery_breakdown || []
  const belowThresholdGroups = breakdown.filter((b) => (b.amount_to_free_delivery || 0) > 0)
  const supplierDelivery = Number(cart?.supplier_delivery || 0)
  const courierShipping =
    !hasCourierGuyItems
      ? 0
      : hasGumtreeItems && !hasOtherCourierItems && gumtreeFulfillmentMethod === 'collect'
        ? 0
        : Number(dynamicRates[deliveryMethod] || 0)
  const courierShippingForDisplay = hasCourierGuyItems && addressChecked ? courierShipping : 0
  const displayTotal = Number(cart?.subtotal || 0) + supplierDelivery + courierShippingForDisplay

  const setDeliveryAndEnsureAllowed = (method: DeliveryMethod) => {
    if ((method === 'standard' || method === 'express' || method === 'pudo') && !hasCourierGuyItems) return
    if (method === 'pudo' && !pudoAvailable) return
    setDeliveryMethod(method)
    if (method !== 'pudo') setSelectedPudoLocation(null)
  }

  useEffect(() => {
    if (!user) return
    fetchCart()
    const firstName = user?.first_name || ''
    const lastName = user?.last_name || ''
    const email = profile?.email || user?.email || ''
    const phone = (profile as any)?.phone || ''
    if (firstName || lastName || email || phone) {
      setFormData(prev => ({
        ...prev,
        customer_first_name: firstName,
        customer_last_name: lastName,
        customer_email: email,
        customer_phone: phone,
      }))
    }
  }, [profile, user])

  // Guests must log in before checkout (match JavaMellow)
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?return=/checkout')
      return
    }
  }, [authLoading, user, router])


  useEffect(() => {
    if (!user) return // Guests use local cart; no backend shipping update
    if (!cart || loading || processing) return
    if (hasCourierGuyItems && !addressChecked) return
    const payload: { delivery_method: string; pudo_pickup_point?: PudoLocation } = { delivery_method: deliveryMethod }
    if (deliveryMethod === 'pudo' && selectedPudoLocation) {
      payload.pudo_pickup_point = selectedPudoLocation
    }
    if (hasCourierGuyItems) {
      ;(payload as any).shipping_override = courierShipping
    } else {
      ;(payload as any).shipping_override = 0
    }
    ecommerceApi.cart.updateShipping(payload)
      .then(() => fetchCart())
      .catch(() => {})
  }, [user, deliveryMethod, selectedPudoLocation, addressChecked, hasCourierGuyItems, courierShipping, cart, loading, processing])

  // Refetch shipping quote when gumtree fulfillment changes (affects rate when mixed cart)
  useEffect(() => {
    if (!addressChecked || !hasGumtreeItems || !hasOtherCourierItems || quoteLoading || !cart?.items?.length) return
    const payload: {
      shipping_address: Record<string, unknown>
      items: Array<{ product_id: string; quantity: number }>
      gumtree_fulfillment_method: GumtreeFulfillmentMethod
    } = {
      shipping_address: normalizeShippingAddressForQuote(),
      items: cart.items.map((i: any) => ({
        product_id: String(i.productId || i.product_id || i.id),
        quantity: i.quantity || 1,
      })),
      gumtree_fulfillment_method: gumtreeFulfillmentMethod,
    }
    setQuoteLoading(true)
    ecommerceApi.cart.shippingQuote(payload)
      .then((res: any) => {
        const data = res?.data ?? res
        const quotePayload = data?.data ?? data ?? {}
        let standardRate: number | null = null
        let expressRate: number | null = null
        if (Array.isArray(quotePayload?.rates)) {
          quotePayload.rates.forEach((rate: any) => {
            const code = (rate?.service_code || '').toUpperCase()
            const service = String(rate?.service || rate?.service_type || '').toLowerCase()
            const val = [rate?.total, rate?.amount, rate?.price, rate?.rate].find((v) => Number.isFinite(Number(v)))
              ? parseFloat(String(rate?.total ?? rate?.amount ?? rate?.price ?? rate?.rate ?? 0))
              : null
            if (val == null) return
            if (code === 'OVN' || code === 'ONX' || service.includes('express') || service.includes('overnight')) {
              expressRate = val
            } else if (code === 'ECO' || code === 'STD' || service.includes('standard') || service.includes('economy') || standardRate == null) {
              standardRate = val
            }
          })
        }
        const fallbackStandard = parseFloat(String(quotePayload?.standard_rate ?? 90))
        const fallbackExpress = parseFloat(String(quotePayload?.express_rate ?? 130))
        setDynamicRates((prev) => ({
          ...prev,
          standard: Number.isFinite(standardRate as number) ? (standardRate as number) : (Number.isFinite(fallbackStandard) ? fallbackStandard : prev.standard),
          express: Number.isFinite(expressRate as number) ? (expressRate as number) : (Number.isFinite(fallbackExpress) ? fallbackExpress : prev.express),
        }))
      })
      .catch(() => {})
      .finally(() => setQuoteLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when gumtree method changes
  }, [gumtreeFulfillmentMethod])

  const fetchCart = async () => {
    if (!user) return
    try {
      const response = await ecommerceApi.cart.get()
      let cartData = normalizeCartResponse(response)

      if (cartData?.items?.length) {
        const enrichedItems = await Promise.all(
          cartData.items.map(async (item: CartItem) => {
            if (item.is_bundle !== true) return item
            if (Array.isArray(item.bundle_images) && item.bundle_images.length > 0) return item
            try {
              const productId = item.product_id || item.product?.id
              if (!productId) return item
              const productResponse = await ecommerceApi.products.get(String(productId)) as { data?: unknown }
              const product = productResponse?.data ?? productResponse
              const images = getProductBundleImages(product as Parameters<typeof getProductBundleImages>[0])
              if (images.length > 0) {
                return { ...item, bundle_images: images }
              }
            } catch {
              // Ignore
            }
            return item
          })
        )
        cartData = { ...cartData, items: enrichedItems }
      }

      setCart(cartData)
      const items = Array.isArray(cartData?.items) ? cartData.items : []
      const getSupplierSlug = (item: any) =>
        String(item?.supplier_slug ?? item?.supplierSlug ?? '').trim().toLowerCase()
      const hasCg = items.some((item: any) => COURIER_GUY_SLUGS.has(getSupplierSlug(item)))
      const hasGumtree = items.some((item: any) => getSupplierSlug(item) === 'gumtree')
      const hasOther = items.some((item: any) => OTHER_COURIER_SLUGS.has(getSupplierSlug(item)))
      const gumtreeBlocked = items.some((item: any) =>
        getSupplierSlug(item) === 'gumtree' && item?.gumtree_origin_complete === false
      )
      setHasCourierGuyItems(hasCg)
      setHasGumtreeItems(hasGumtree)
      setHasOtherCourierItems(hasOther)
      setGumtreeDeliveryBlocked(gumtreeBlocked)
      if (!hasGumtree) setGumtreeFulfillmentMethod('deliver')
      if (gumtreeBlocked) {
        setAddressChecked(false)
        setAddressQuoteMessage(GUMTREE_DELIVERY_BLOCK_MESSAGE)
      }

      if (!hasCg) {
        setDeliveryMethod('standard')
      } else if (!['standard', 'express', 'pudo'].includes(deliveryMethod)) {
        setDeliveryMethod('standard')
      }

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

  const normalizeShippingAddressForQuote = () => ({
    address: formData.shipping_address,
    street_address: formData.shipping_address,
    suburb: formData.shipping_suburb,
    city: formData.shipping_city,
    province: formData.shipping_province,
    postalCode: formData.shipping_postal_code,
    postal_code: formData.shipping_postal_code,
    country: formData.shipping_country,
  })

  const parseRateValue = (rate: any): number | null => {
    const candidates = [rate?.total, rate?.amount, rate?.price, rate?.rate, rate?.inclusive_total, rate?.inc_vat_total]
    for (const value of candidates) {
      const parsed = typeof value === 'number' ? value : parseFloat(String(value))
      if (Number.isFinite(parsed) && parsed >= 0) return parsed
    }
    return null
  }

  const checkAddressAndQuote = async () => {
    if (gumtreeDeliveryBlocked) {
      showError(GUMTREE_DELIVERY_BLOCK_MESSAGE)
      setAddressChecked(false)
      setAddressQuoteMessage(GUMTREE_DELIVERY_BLOCK_MESSAGE)
      return
    }
    if (!hasCourierGuyItems) {
      setAddressChecked(true)
      setAddressQuoteMessage(supplierDelivery > 0 ? 'Address verified. Flat delivery rate applies.' : 'Address verified. Congrats, delivery is free.')
      return
    }
    if (hasGumtreeItems && !hasOtherCourierItems && gumtreeFulfillmentMethod === 'collect') {
      setAddressChecked(true)
      setAddressQuoteMessage('Gumtree items: collect in-store. No courier needed.')
      return
    }
    const required = [
      formData.shipping_address,
      formData.shipping_suburb,
      formData.shipping_city,
      formData.shipping_province,
      formData.shipping_postal_code,
    ]
    if (required.some((v) => !String(v || '').trim())) {
      showError('Please complete address, suburb, city, province and postal code first.')
      return
    }

    setQuoteLoading(true)
    setAddressQuoteMessage('Checking address and fetching Courier Guy rates...')
    try {
      const payload: {
        shipping_address: Record<string, unknown>
        items?: Array<{ product_id: string; quantity: number }>
        gumtree_fulfillment_method?: GumtreeFulfillmentMethod
      } = {
        shipping_address: normalizeShippingAddressForQuote(),
        gumtree_fulfillment_method: gumtreeFulfillmentMethod,
      }
      if (cart?.items?.length) {
        payload.items = cart.items.map((i: any) => ({
          product_id: i.productId || i.product_id || i.id,
          quantity: i.quantity || 1,
        }))
      }
      const response = await ecommerceApi.cart.shippingQuote(payload) as any
      const data = response?.data ?? response
      const quotePayload = data?.data ?? data
      const collectionDisplay = quotePayload?.collection_address?.display || null
      setCollectionAddressDisplay(collectionDisplay)
      const nextPudoAvailable = quotePayload?.pudo_available !== false
      setPudoAvailable(nextPudoAvailable)
      if (!nextPudoAvailable && deliveryMethod === 'pudo') {
        setDeliveryMethod('standard')
        setSelectedPudoLocation(null)
      }

      let standardRate: number | null = null
      let expressRate: number | null = null
      if (Array.isArray(quotePayload?.rates)) {
        quotePayload.rates.forEach((rate: any) => {
          const code = (rate?.service_code || '').toUpperCase()
          const service = String(rate?.service || rate?.service_type || rate?.name || rate?.service_name || '').toLowerCase()
          const val = parseRateValue(rate)
          if (val == null) return
          if (code === 'OVN' || code === 'ONX' || service.includes('express') || service.includes('overnight') || service.includes('ovn')) {
            expressRate = val
          } else if (code === 'ECO' || code === 'STD' || service.includes('standard') || service.includes('economy') || service.includes('eco') || standardRate == null) {
            standardRate = val
          }
        })
      }
      const fallbackStandard = parseFloat(String(quotePayload?.standard_rate ?? 90))
      const fallbackExpress = parseFloat(String(quotePayload?.express_rate ?? 130))
      setDynamicRates((prev) => ({
        ...prev,
        standard: Number.isFinite(standardRate as number) ? (standardRate as number) : (Number.isFinite(fallbackStandard) ? fallbackStandard : prev.standard),
        express: Number.isFinite(expressRate as number) ? (expressRate as number) : (Number.isFinite(fallbackExpress) ? fallbackExpress : prev.express),
      }))
      const addressVerified = quotePayload?.address_verified !== false
      setAddressChecked(addressVerified)
      const pudoMsg = nextPudoAvailable ? '' : ' Pudo disabled: parcel exceeds locker limits (20kg, 37x69x55cm).'
      const collectionMsg = collectionDisplay ? ` Collection point: ${collectionDisplay}.` : ''
      setAddressQuoteMessage((quotePayload?.message || 'Address verified. Courier Guy rates updated.') + pudoMsg + collectionMsg)
    } catch (error: any) {
      showError(error?.message || 'Failed to fetch Courier Guy rates')
      setAddressChecked(false)
      setAddressQuoteMessage('')
    } finally {
      setQuoteLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (hasCourierGuyItems && !addressChecked) {
      showError('Please check your address and fetch shipping rates before proceeding.')
      return
    }
    if (gumtreeDeliveryBlocked) {
      showError(GUMTREE_DELIVERY_BLOCK_MESSAGE)
      return
    }
    if (deliveryMethod === 'pudo' && !selectedPudoLocation) {
      showError('Please select a Pudo pickup point')
      return
    }

    setProcessing(true)

    try {
      const cartUpdatePayload: { delivery_method: string; pudo_pickup_point?: PudoLocation } = {
        delivery_method: deliveryMethod,
      }
      if (deliveryMethod === 'pudo' && selectedPudoLocation) {
        cartUpdatePayload.pudo_pickup_point = selectedPudoLocation
      }
      ;(cartUpdatePayload as any).shipping_override = hasCourierGuyItems ? (dynamicRates[deliveryMethod] || 0) : 0
      await ecommerceApi.cart.updateShipping(cartUpdatePayload)

      let shippingAddress: Record<string, string>
      if (deliveryMethod === 'pudo' && selectedPudoLocation) {
        shippingAddress = {
          address: selectedPudoLocation.address,
          street_address: selectedPudoLocation.address,
          suburb: selectedPudoLocation.city,
          city: selectedPudoLocation.city,
          province: selectedPudoLocation.province || '',
          postal_code: selectedPudoLocation.postal_code || selectedPudoLocation.postalCode || '',
          country: 'ZA',
        }
      } else {
        shippingAddress = {
          businessName: formData.business_name,
          address: formData.shipping_address,
          street_address: formData.shipping_address,
          suburb: formData.shipping_suburb,
          city: formData.shipping_city,
          province: formData.shipping_province,
          postal_code: formData.shipping_postal_code,
          country: formData.shipping_country,
        }
      }

      const primaryDeliveryMethod =
        hasOtherCourierItems || (hasGumtreeItems && gumtreeFulfillmentMethod === 'deliver')
          ? deliveryMethod
          : hasGumtreeItems && gumtreeFulfillmentMethod === 'collect'
            ? 'collect'
            : deliveryMethod

      const orderPayload: Record<string, unknown> = {
        customer: {
          firstName: formData.customer_first_name,
          lastName: formData.customer_last_name,
          email: formData.customer_email,
          phone: formData.customer_phone,
        },
        shipping_address: shippingAddress,
        delivery_method: primaryDeliveryMethod,
        payment_method: 'yoco',
        notes: formData.customer_notes,
        supplier_delivery: supplierDelivery,
        courier_guy_shipping: courierShipping,
        gumtree_fulfillment_method: hasGumtreeItems ? gumtreeFulfillmentMethod : undefined,
        courier_fulfillment_method:
          hasOtherCourierItems || (hasGumtreeItems && gumtreeFulfillmentMethod === 'deliver')
            ? deliveryMethod
            : undefined,
      }

      if (deliveryMethod === 'pudo' && selectedPudoLocation) {
        orderPayload.pudo_pickup_point = selectedPudoLocation
      }

      const orderResponse = await ecommerceApi.checkout.initiate(orderPayload) as any
      const order = orderResponse?.data ?? orderResponse

      const orderId = order?.id
      if (!orderId) {
        showError('Invalid order response')
        return
      }

      const checkoutResponse = await ecommerceApi.payments.createCheckout(orderId) as any
      const res = checkoutResponse?.data ?? checkoutResponse
      const redirectUrl = res?.data?.redirectUrl ?? res?.redirectUrl

      if (redirectUrl) {
        window.location.href = redirectUrl
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
    <div className="min-h-screen bg-vintage-background py-12 overflow-x-hidden" data-cy="checkout-content">
      <div className="container-wide min-w-0">
        {/* Back Link */}
        <Link href="/cart" className="flex items-center text-text-muted hover:text-vintage-primary transition-colors mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Link>

        <h1 className="text-3xl font-bold font-playfair text-text mb-8">Checkout</h1>

        <form onSubmit={handleSubmit} data-cy="checkout-form" className="min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Information */}
              <div className="card p-4 md:p-6 min-w-0 overflow-hidden">
                <h2 className="text-lg font-semibold text-text mb-4">Contact Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="customer_first_name" className="form-label">First Name *</label>
                    <input
                      id="customer_first_name"
                      type="text"
                      value={formData.customer_first_name}
                      onChange={(e) => setFormData({ ...formData, customer_first_name: e.target.value })}
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="customer_last_name" className="form-label">Last Name *</label>
                    <input
                      id="customer_last_name"
                      type="text"
                      value={formData.customer_last_name}
                      onChange={(e) => setFormData({ ...formData, customer_last_name: e.target.value })}
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
                    <label htmlFor="customer_phone" className="form-label">Cellphone *</label>
                    <input
                      id="customer_phone"
                      type="tel"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      className="form-input"
                      required
                      placeholder="+27 82 123 4567"
                    />
                  </div>
                  <div>
                    <label htmlFor="business_name" className="form-label">Business Name (Optional)</label>
                    <input
                      id="business_name"
                      type="text"
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address + verification */}
              <div className="card p-4 md:p-6 min-w-0 overflow-hidden">
                  <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Shipping Address
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="shipping_address" className="form-label">Street Address *</label>
                      <input
                        id="shipping_address"
                        type="text"
                        value={formData.shipping_address}
                        onChange={(e) => { setFormData({ ...formData, shipping_address: e.target.value }); setAddressChecked(false) }}
                        className="form-input"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="shipping_suburb" className="form-label">Suburb *</label>
                      <input
                        id="shipping_suburb"
                        type="text"
                        value={formData.shipping_suburb}
                        onChange={(e) => { setFormData({ ...formData, shipping_suburb: e.target.value }); setAddressChecked(false) }}
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="shipping_city" className="form-label">City *</label>
                        <input
                          id="shipping_city"
                          type="text"
                          value={formData.shipping_city}
                          onChange={(e) => { setFormData({ ...formData, shipping_city: e.target.value }); setAddressChecked(false) }}
                          className="form-input"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="shipping_province" className="form-label">Province *</label>
                        <select
                          id="shipping_province"
                          value={formData.shipping_province}
                          onChange={(e) => { setFormData({ ...formData, shipping_province: e.target.value }); setAddressChecked(false) }}
                          className="form-input"
                          required
                        >
                          <option value="">Select province...</option>
                          {PROVINCES.map((province) => (
                            <option key={province.value} value={province.value}>{province.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="shipping_postal_code" className="form-label">Postal Code *</label>
                        <input
                          id="shipping_postal_code"
                          type="text"
                          value={formData.shipping_postal_code}
                          onChange={(e) => { setFormData({ ...formData, shipping_postal_code: e.target.value }); setAddressChecked(false) }}
                          className="form-input"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="shipping_country" className="form-label">Country</label>
                        <input
                          id="shipping_country"
                          type="text"
                          value="South Africa"
                          className="form-input bg-gray-50"
                          disabled
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={checkAddressAndQuote}
                      disabled={quoteLoading || processing}
                      className="btn btn-secondary"
                      data-cy="checkout-check-address"
                    >
                      {quoteLoading ? 'Checking address...' : 'Check address'}
                    </button>
                    {addressQuoteMessage && (
                      <p className={`text-sm ${addressChecked ? 'text-green-700' : 'text-amber-700'}`}>
                        {addressQuoteMessage}
                      </p>
                    )}
                  </div>
              </div>

              {/* Delivery Method */}
              {showDeliveryMethods && (
                <div className="card p-4 md:p-6 min-w-0 overflow-hidden">
                  <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Delivery Method
                  </h2>
                  <div className="space-y-3">
                    {hasGumtreeItems && (
                      <div className="mb-4 pb-4 border-b border-gray-200">
                        <p className="text-sm font-medium text-text mb-2">Gumtree items</p>
                        <div className="flex gap-4">
                          <label className={`flex items-center gap-2 cursor-pointer ${gumtreeFulfillmentMethod === 'collect' ? 'text-vintage-primary font-medium' : 'text-text-muted'}`}>
                            <input
                              type="radio"
                              name="gumtreeFulfillment"
                              checked={gumtreeFulfillmentMethod === 'collect'}
                              onChange={() => setGumtreeFulfillmentMethod('collect')}
                            />
                            Collect in-store (free)
                          </label>
                          <label className={`flex items-center gap-2 cursor-pointer ${gumtreeFulfillmentMethod === 'deliver' ? 'text-vintage-primary font-medium' : 'text-text-muted'}`}>
                            <input
                              type="radio"
                              name="gumtreeFulfillment"
                              checked={gumtreeFulfillmentMethod === 'deliver'}
                              onChange={() => setGumtreeFulfillmentMethod('deliver')}
                            />
                            Deliver via Courier Guy
                          </label>
                        </div>
                        <p className="text-xs text-text-muted mt-1">
                          {gumtreeFulfillmentMethod === 'collect'
                            ? 'You will collect Gumtree items from our store. Other items will be delivered separately.'
                            : 'Gumtree items will be shipped with your other Courier Guy deliveries.'}
                        </p>
                      </div>
                    )}
                    {hasCourierGuyItems && (hasOtherCourierItems || gumtreeFulfillmentMethod === 'deliver') && (
                      <>
                  <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    deliveryMethod === 'standard' ? 'border-vintage-primary bg-vintage-primary/5' : 'border-gray-200 hover:border-vintage-primary/50'
                  }`}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="standard"
                      checked={deliveryMethod === 'standard'}
                      onChange={() => setDeliveryAndEnsureAllowed('standard')}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium">Courier Guy - Standard</span>
                      <span className="ml-2 text-text-muted">R{dynamicRates.standard.toFixed(2)}</span>
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
                      onChange={() => setDeliveryAndEnsureAllowed('express')}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium">Courier Guy - Express</span>
                      <span className="ml-2 text-text-muted">R{dynamicRates.express.toFixed(2)}</span>
                      <p className="text-sm text-text-muted mt-0.5">1-2 business days</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    deliveryMethod === 'pudo' ? 'border-vintage-primary bg-vintage-primary/5' : 'border-gray-200 hover:border-vintage-primary/50'
                  } ${pudoAvailable ? '' : 'opacity-50 pointer-events-none'}`}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="pudo"
                      checked={deliveryMethod === 'pudo'}
                      onChange={() => { setDeliveryAndEnsureAllowed('pudo'); setSelectedPudoLocation(null) }}
                      className="mt-1"
                      disabled={!pudoAvailable}
                    />
                    <div>
                      <span className="font-medium">Pudo Pickup Point</span>
                      <span className="ml-2 text-text-muted">R{dynamicRates.pudo.toFixed(2)}</span>
                      <p className="text-sm text-text-muted mt-0.5">
                        {pudoAvailable ? 'Collect from nearest Pudo location' : 'Unavailable for this parcel size'}
                      </p>
                    </div>
                  </label>
                      </>
                    )}
                </div>
                {collectionAddressDisplay && (
                  <p className="mt-4 text-sm text-text-muted">
                    <span className="font-medium text-text">Collection Point:</span> {collectionAddressDisplay}
                  </p>
                )}
                {gumtreeDeliveryBlocked && (
                  <p className="mt-4 text-sm text-red-700">
                    {GUMTREE_DELIVERY_BLOCK_MESSAGE}
                  </p>
                )}
                {!hasCourierGuyItems && (
                  <p className={`mt-4 text-sm ${supplierDelivery > 0 ? 'text-text-muted' : 'text-green-700'}`}>
                    {supplierDelivery > 0 ? 'Flat delivery rate applies.' : 'Congrats, delivery is free.'}
                  </p>
                )}

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
              )}

              {/* Order Notes */}
              <div className="card p-4 md:p-6 min-w-0 overflow-hidden">
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
            <div className="lg:col-span-1 min-w-0">
              <div className="card p-4 md:p-6 sticky top-24 overflow-hidden">
                <h2 className="text-lg font-semibold text-text mb-4">Order Summary</h2>
                
                {/* Items */}
                <div className="space-y-3 mb-4">
                  {cart?.items?.map((item) => {
                    const images = getCartItemImages(item)
                    const isBundle = item.is_bundle === true
                    const mainImage = images[0]
                    return (
                      <div key={item.id} className="flex gap-3 text-sm">
                        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {isBundle && images.length > 1 ? (
                            <div className="grid grid-cols-2 gap-0.5 h-full w-full p-0.5">
                              {images.slice(0, 4).map((url, i) => (
                                <div key={`${url}-${i}`} className="aspect-square overflow-hidden rounded bg-white border border-gray-200">
                                  <img
                                    src={url}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).src = '/images/products/default.svg' }}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : mainImage ? (
                            <img
                              src={mainImage}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/images/products/default.svg' }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-text-muted block truncate">
                            {item.product_name || item.product?.name || 'Product'} x {item.quantity}
                          </span>
                          <span className="font-medium">R{Number(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="divider my-4" />

                {/* Totals */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Subtotal</span>
                    <span className="font-medium">R{Number(cart?.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {(() => {
                    const entries = (cart?.supplier_delivery_breakdown ?? []).filter(
                      (e: SupplierDeliveryBreakdownItem) => Number(e.delivery_cost ?? 0) > 0
                    )
                    return entries.length > 0 ? (
                      <div className="supplier-breakdown">
                        {entries.map((entry: SupplierDeliveryBreakdownItem) => (
                          <div key={`${entry.supplier_slug}-checkout-summary`} className="supplier-breakdown-item">
                            <span>
                              {entry.weight_based
                                ? `Weight-based (${Number(entry.total_weight_kg ?? 0).toFixed(1)} kg)`
                                : 'Flat delivery rate'}
                            </span>
                            <span>R{Number(entry.delivery_cost ?? 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ) : null
                  })()}
                  {hasGumtreeItems && gumtreeFulfillmentMethod === 'collect' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Gumtree: Collect in-store</span>
                      <span className="font-medium text-green-700">Free</span>
                    </div>
                  )}
                  {hasCourierGuyItems && addressChecked && courierShipping > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">
                        {hasGumtreeItems && hasOtherCourierItems && gumtreeFulfillmentMethod === 'collect'
                          ? 'Courier Guy (imports only)'
                          : 'Courier Guy shipping'}
                      </span>
                      <span className="font-medium">R{courierShipping.toFixed(2)}</span>
                    </div>
                  )}
                  {belowThresholdGroups.length > 0 && (
                    <div className="rounded-lg bg-vintage-background/40 p-3 text-xs text-text-muted">
                      {belowThresholdGroups.map((group) => (
                        <div key={`${group.supplier_slug}-threshold`} className="py-1">
                          <p>
                            Add <strong>R{Number(group.amount_to_free_delivery || 0).toFixed(2)}</strong> more from this supplier to unlock free delivery.
                          </p>
                          <Link href={`/products?supplier_slug=${encodeURIComponent(group.supplier_slug)}`} className="text-vintage-primary hover:underline">
                            Browse this supplier&apos;s products
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="divider my-4" />
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-vintage-primary">
                      R{displayTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment Button - hidden until address check completed */}
                {addressChecked ? (
                  <button
                    type="submit"
                    data-cy="checkout-submit"
                    disabled={processing || gumtreeDeliveryBlocked}
                    className="btn btn-primary w-full mt-6 py-3"
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    {processing ? 'Processing...' : 'Pay with Yoco'}
                  </button>
                ) : (
                  <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-center">
                    <p className="text-sm text-amber-800 font-medium mb-2">Check address to continue</p>
                    <p className="text-xs text-amber-700">Complete your shipping address and click &quot;Check address&quot; above to unlock payment.</p>
                  </div>
                )}

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
                    <Package className="w-5 h-5 mx-auto mb-1" />
                    <span>Free Returns</span>
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
