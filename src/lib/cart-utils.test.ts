/**
 * Cart utils unit tests - cost-based delivery threshold
 */
import { describe, it, expect } from 'vitest'
import { groupCartItems, getCartExtraDelivery } from './cart-utils'
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
  it('uses cost_price for threshold eligibility when available', () => {
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
    expect(g.thresholdSubtotal).toBe(160)
    expect(g.displaySubtotal).toBe(400)
    expect(g.belowThreshold).toBe(true)
    expect(g.amountToFreeDelivery).toBe(340)
    expect(g.thresholdUnavailable).toBe(false)
  })

  it('threshold met when cost-based subtotal >= threshold', () => {
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
    expect(g.thresholdSubtotal).toBe(600)
    expect(g.belowThreshold).toBe(false)
    expect(g.amountToFreeDelivery).toBe(0)
    expect(g.deliveryCharge).toBe(0)
  })

  it('sets thresholdUnavailable when cost_price missing for any item', () => {
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
    expect(g.thresholdSubtotal).toBe(null)
    expect(g.thresholdUnavailable).toBe(true)
    expect(g.belowThreshold).toBe(true)
    expect(g.amountToFreeDelivery).toBe(0)
    expect(g.deliveryCharge).toBe(50)
  })

  it('uses top-level cost_price when product.cost_price missing', () => {
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
    expect(g.thresholdSubtotal).toBe(180)
    expect(g.belowThreshold).toBe(true)
    expect(g.amountToFreeDelivery).toBe(320)
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
    expect(g.thresholdSubtotal).toBe(160)
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

describe('getCartExtraDelivery', () => {
  it('sums delivery charges from cost-based threshold groups', () => {
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
