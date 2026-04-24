import type { Cart, CartItem } from './types'
import { formatCountdown, getMinQuantity, getStockQuantity, isBundleProduct } from './product-utils'
import { ensureAbsoluteImageUrl, MAX_BUNDLE_PRODUCT_IMAGES } from './image-utils'

export const COURIER_GUY_SLUGS = new Set(['temu', 'aliexpress', 'ubuy', 'gumtree'])
export const OTHER_GROUP = '__other__'

function normalizeSupplierSlug(item: CartItem): string {
  return String(item.supplier_slug ?? item.supplierSlug ?? '').trim().toLowerCase()
}

/**
 * Return true if the cart item ships via Courier Guy. Imports (temu/aliexpress/ubuy)
 * and gumtree always qualify; first-party storefront items (blank supplier_slug)
 * also qualify — priced from the company address using product weight/dimensions.
 * Mirrors `uses_courier_guy_or_first_party` in django-crm/ecommerce/constants.py.
 */
export function isCourierGuyCartItem(item: CartItem): boolean {
  const slug = normalizeSupplierSlug(item)
  return slug === '' || COURIER_GUY_SLUGS.has(slug)
}

export function normalizeCartResponse(response: any): Cart | null {
  if (!response) return null
  if (response?.results && Array.isArray(response.results)) return response.results[0] ?? null
  if (response?.data) return response.data ?? null
  return response
}

export function getCartItemKey(item: CartItem): string {
  return item.product_id || item.id
}

export function getCartItemImages(item: CartItem): string[] {
  const bundleImages = Array.isArray(item.bundle_images) ? item.bundle_images : []
  const parsedBundleImages = bundleImages
    .map((img: unknown) => (typeof img === 'string' ? img : (img as { url?: string })?.url || ''))
    .filter(Boolean) as string[]
  const main = item.product_image || item.product?.image || ''
  const raw = (item.is_bundle && parsedBundleImages.length > 0)
    ? parsedBundleImages
    : [main, ...parsedBundleImages].filter(Boolean)
  return raw.map(ensureAbsoluteImageUrl).slice(0, MAX_BUNDLE_PRODUCT_IMAGES)
}

export function isTimedCartItem(item: CartItem): boolean {
  return Boolean(item.timed_expires_at)
}

export function getSupplierGroupSlug(item: CartItem): string {
  const slug = String(item.supplier_slug ?? item.supplierSlug ?? '').trim().toLowerCase()
  return slug || OTHER_GROUP
}

export function getGroupThreshold(items: CartItem[]): number | null {
  const raw = items.find((item) => item.free_delivery_threshold != null)?.free_delivery_threshold
  if (raw == null) return null
  const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw))
  return Number.isFinite(parsed) ? parsed : null
}

export function getSupplierDeliveryCost(items: CartItem[]): number {
  const raw = items.find((item) => item.supplier_delivery_cost != null)?.supplier_delivery_cost
  if (raw == null) return 0
  const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

/** Get cost price for threshold calculation. Prefers item.product?.cost_price; supports top-level cost_price. */
function getItemCostPrice(item: CartItem): number | null {
  const raw = (item as { cost_price?: number }).cost_price ?? item.product?.cost_price ?? (item.product as { cost_price?: number })?.cost_price
  if (raw == null) return null
  const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function groupCartItems(items: CartItem[]) {
  const groups = new Map<string, CartItem[]>()
  items.forEach((item) => {
    const slug = getSupplierGroupSlug(item)
    const existing = groups.get(slug) ?? []
    existing.push(item)
    groups.set(slug, existing)
  })
  return Array.from(groups.entries()).map(([slug, groupItems]) => {
    const displaySubtotal = groupItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
    const costPrices = groupItems.map((item) => getItemCostPrice(item))
    const allCostsAvailable = costPrices.every((c) => c != null)
    const thresholdSubtotal = allCostsAvailable
      ? (costPrices as number[]).reduce((sum, cost, i) => sum + cost * groupItems[i].quantity, 0)
      : null
    const threshold = slug === OTHER_GROUP ? null : getGroupThreshold(groupItems)
    const isCourierGuy = COURIER_GUY_SLUGS.has(slug)
    const thresholdUnavailable = !allCostsAvailable && threshold != null && !isCourierGuy
    const belowThreshold = !isCourierGuy && threshold != null && (
      thresholdUnavailable ? true : (thresholdSubtotal != null && thresholdSubtotal < threshold)
    )
    const supplierDeliveryCost = getSupplierDeliveryCost(groupItems)
    const deliveryCharge = slug === OTHER_GROUP
      ? 0
      : isCourierGuy
        ? 0
        : belowThreshold || threshold == null
          ? supplierDeliveryCost
          : 0
    const amountToFreeDelivery = belowThreshold && threshold != null && thresholdSubtotal != null && !thresholdUnavailable
      ? Math.max(0, threshold - thresholdSubtotal)
      : 0
    return {
      slug,
      items: groupItems,
      subtotal: displaySubtotal,
      displaySubtotal,
      thresholdSubtotal,
      thresholdUnavailable,
      threshold,
      belowThreshold,
      isImport: isCourierGuy,
      isCourierGuy,
      amountToFreeDelivery,
      deliveryCharge,
    }
  })
}

export function getCartExtraDelivery(items: CartItem[]): number {
  return groupCartItems(items).reduce((sum, group) => sum + group.deliveryCharge, 0)
}

export function formatCartCountdown(item: CartItem): string {
  return formatCountdown(item.timed_expires_at)
}

export function getItemMinQuantity(item: CartItem): number {
  return isBundleProduct(item) ? 1 : getMinQuantity(item)
}

/** Returns stock quantity for cart limits. Returns null when supplier-controlled (stock 0 or untracked = endless). */
export function getItemStockQuantity(item: CartItem): number | null {
  const product = item.product ?? item
  if ((product as any)?.track_inventory === false) return null
  const raw = item.stock_quantity ?? getStockQuantity(product)
  if (raw == null || raw <= 0) return null
  return raw
}
