/**
 * Cart utils unit tests — free-delivery threshold vs retail subtotal (matches cart totals / API).
 */
import { describe, it, expect } from 'vitest'
import { groupCartItems, getCartExtraDelivery, isCourierGuyCartItem } from './cart-utils'
import type { CartItem } from './types'

function makeItem(overrides: Partial<CartItem> & { price: number; quantity: number }): CartItem {
  return {
    id: 'item-1',
    product_id: 'prod-1',
    product_name: 'Product',
    quantity: 1,
    price: 100,
    subtotal: 100,
    supplier_slug: 'supplier-a',
    free_delivery_threshold: 500,
    supplier_delivery_cost: 50,
    created_at: new Date().toISOString(),
    ...overrides,
  } as CartItem
}

describe('groupCartItems', () => {
  it('uses retail subtotal for threshold eligibility', () => {
    const items: CartItem[] = [
      makeItem({
        id: 'a',
        product_id: 'pa',
        price: 200,
        quantity: 2,
        cost_price: 80,
        product: { cost_price: 80 } as any,
        supplier_slug: 'supplier-a',
        free_delivery_threshold: 500,
        supplier_delivery_cost: 50,
      }),
    ]
    const groups = groupCartItems(items)
    const g = groups.find((x) => x.slug === 'supplier-a')!
    expect(g.thresholdSubtotal).toBe(400)
    expect(g.displaySubtotal).toBe(400)
    expect(g.belowThreshold).toBe(true)
    expect(g.amountToFreeDelivery).toBe(100)
    expect(g.thresholdUnavailable).toBe(false)
  })

  it('threshold met when retail subtotal >= threshold', () => {
    const items: CartItem[] = [
      makeItem({
        id: 'a',
        product_id: 'pa',
        price: 200,
        quantity: 5,
        cost_price: 120,
        product: { cost_price: 120 } as any,
        supplier_slug: 'supplier-a',
        free_delivery_threshold: 500,
        supplier_delivery_cost: 50,
      }),
    ]
    const groups = groupCartItems(items)
    const g = groups.find((x) => x.slug === 'supplier-a')!
    expect(g.thresholdSubtotal).toBe(1000)
    expect(g.belowThreshold).toBe(false)
    expect(g.amountToFreeDelivery).toBe(0)
    expect(g.deliveryCharge).toBe(0)
  })

  it('missing cost_price does not affect retail-based threshold progress', () => {
    const items: CartItem[] = [
      makeItem({
        id: 'a',
        product_id: 'pa',
        price: 200,
        quantity: 3,
        cost_price: 100,
        product: { cost_price: 100 } as any,
        supplier_slug: 'supplier-a',
        free_delivery_threshold: 500,
        supplier_delivery_cost: 50,
      }),
      makeItem({
        id: 'b',
        product_id: 'pb',
        price: 150,
        quantity: 1,
        product: {},
        supplier_slug: 'supplier-a',
        free_delivery_threshold: 500,
        supplier_delivery_cost: 50,
      }),
    ]
    const groups = groupCartItems(items)
    const g = groups.find((x) => x.slug === 'supplier-a')!
    expect(g.thresholdSubtotal).toBe(750)
    expect(g.thresholdUnavailable).toBe(false)
    expect(g.belowThreshold).toBe(false)
    expect(g.amountToFreeDelivery).toBe(0)
    expect(g.deliveryCharge).toBe(0)
  })

  it('amount to free delivery ignores cost_price; only retail vs threshold matters', () => {
    const items: CartItem[] = [
      makeItem({
        id: 'a',
        product_id: 'pa',
        price: 200,
        quantity: 2,
        cost_price: 90,
        supplier_slug: 'supplier-a',
        free_delivery_threshold: 500,
        supplier_delivery_cost: 50,
      }),
    ]
    const groups = groupCartItems(items)
    const g = groups.find((x) => x.slug === 'supplier-a')!
    expect(g.thresholdSubtotal).toBe(400)
    expect(g.belowThreshold).toBe(true)
    expect(g.amountToFreeDelivery).toBe(100)
  })

  it('keeps display subtotal based on selling price', () => {
    const items: CartItem[] = [
      makeItem({
        id: 'a',
        product_id: 'pa',
        price: 200,
        quantity: 2,
        cost_price: 80,
        product: { cost_price: 80 } as any,
        supplier_slug: 'supplier-a',
        free_delivery_threshold: 500,
        supplier_delivery_cost: 50,
      }),
    ]
    const groups = groupCartItems(items)
    const g = groups.find((x) => x.slug === 'supplier-a')!
    expect(g.subtotal).toBe(400)
    expect(g.displaySubtotal).toBe(400)
    expect(g.thresholdSubtotal).toBe(400)
  })

  it('Courier Guy groups have no threshold logic', () => {
    const items: CartItem[] = [
      makeItem({
        id: 'a',
        product_id: 'pa',
        price: 100,
        quantity: 1,
        supplier_slug: 'temu',
        supplier_delivery_cost: 0,
      }),
    ]
    const groups = groupCartItems(items)
    const g = groups.find((x) => x.slug === 'temu')!
    expect(g.isCourierGuy).toBe(true)
    expect(g.amountToFreeDelivery).toBe(0)
    expect(g.deliveryCharge).toBe(0)
  })
})

describe('isCourierGuyCartItem', () => {
  it('returns true for first-party items (blank supplier_slug)', () => {
    const item = makeItem({ supplier_slug: '', price: 100, quantity: 1 })
    expect(isCourierGuyCartItem(item)).toBe(true)
  })

  it('returns true for import slugs', () => {
    expect(isCourierGuyCartItem(makeItem({ supplier_slug: 'temu', price: 100, quantity: 1 }))).toBe(true)
    expect(isCourierGuyCartItem(makeItem({ supplier_slug: 'gumtree', price: 100, quantity: 1 }))).toBe(true)
    expect(isCourierGuyCartItem(makeItem({ supplier_slug: ' AliExpress ', price: 100, quantity: 1 }))).toBe(true)
  })

  it('returns false for other SA suppliers that handle their own delivery', () => {
    expect(isCourierGuyCartItem(makeItem({ supplier_slug: 'supplier-a', price: 100, quantity: 1 }))).toBe(false)
    expect(isCourierGuyCartItem(makeItem({ supplier_slug: 'perfectdealz', price: 100, quantity: 1 }))).toBe(false)
  })

  it('treats null/undefined slug as first-party', () => {
    expect(isCourierGuyCartItem(makeItem({ supplier_slug: null as any, price: 100, quantity: 1 }))).toBe(true)
    expect(isCourierGuyCartItem({ ...makeItem({ price: 100, quantity: 1 }), supplier_slug: undefined } as any)).toBe(true)
  })
})

describe('getCartExtraDelivery', () => {
  it('sums delivery charges from retail threshold groups', () => {
    const items: CartItem[] = [
      makeItem({
        id: 'a',
        product_id: 'pa',
        price: 100,
        quantity: 1,
        cost_price: 50,
        product: { cost_price: 50 } as any,
        supplier_slug: 'supplier-a',
        free_delivery_threshold: 500,
        supplier_delivery_cost: 50,
      }),
      makeItem({
        id: 'b',
        product_id: 'pb',
        price: 80,
        quantity: 1,
        cost_price: 40,
        product: { cost_price: 40 } as any,
        supplier_slug: 'supplier-b',
        free_delivery_threshold: 300,
        supplier_delivery_cost: 30,
      }),
    ]
    const extra = getCartExtraDelivery(items)
    expect(extra).toBe(80)
  })
})
