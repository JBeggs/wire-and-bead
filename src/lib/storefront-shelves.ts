import 'server-only'
import { getSiteSetting } from '@/lib/site-settings'

/** Values map to public product list query params (see `serverEcommerceApi.products.list`). */
export type StorefrontShelfFilter = Record<string, string | boolean | number | undefined | null>

export type StorefrontShelf = {
  id: string
  label: string
  /** Optional lucide icon key, e.g. `star`, `clock`, `package` */
  icon?: string
  filter: StorefrontShelfFilter
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Reads `SiteSetting.storefront_shelves` (JSON array). Invalid / missing → `[]`
 * (plan: hide shelf row and list all active products).
 */
export async function getStorefrontShelves(): Promise<StorefrontShelf[]> {
  const raw = await getSiteSetting('storefront_shelves')
  if (!raw) return []
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []
  const out: StorefrontShelf[] = []
  for (const row of parsed) {
    if (!isPlainObject(row)) continue
    const id = String(row.id ?? '').trim()
    const label = String(row.label ?? '').trim()
    const filterRaw = row.filter
    if (!id || !label || !isPlainObject(filterRaw)) continue
    const filter: StorefrontShelfFilter = {}
    for (const [k, v] of Object.entries(filterRaw)) {
      if (v === undefined || v === null) continue
      filter[k] = v as string | boolean | number
    }
    out.push({
      id,
      label,
      icon: typeof row.icon === 'string' ? row.icon : undefined,
      filter,
    })
  }
  return out
}

const FILTER_KEYS = new Set([
  'condition',
  'category',
  'featured',
  'bundle_only',
  'timed_only',
  'exclude_tags',
  'exclude_bundles',
  'exclude_category',
  'exclude_featured',
  'supplier_slug',
  'delivery_group',
])

export type ProductListParams = Record<string, string | string[] | undefined>

function norm(v: string | string[] | undefined): string {
  if (v === undefined) return ''
  if (Array.isArray(v)) return String(v[0] ?? '')
  return String(v)
}

function filterValueString(v: string | boolean | number | null | undefined): string {
  if (v === true) return 'true'
  if (v === false) return 'false'
  if (v === null || v === undefined) return ''
  return String(v)
}

/** Whether current URL params match this shelf's filter (for active chip styling). */
export function paramsMatchShelf(params: ProductListParams, shelf: StorefrontShelf): boolean {
  for (const [key, want] of Object.entries(shelf.filter)) {
    if (!FILTER_KEYS.has(key)) continue
    const got = norm(params[key])
    const w = filterValueString(want)
    if (got !== w) return false
  }
  return true
}

/** True when no product-list filter keys are set (except optional sort/search handled elsewhere). */
export function isAllProductFilters(params: ProductListParams): boolean {
  for (const key of FILTER_KEYS) {
    if (norm(params[key])) return false
  }
  return true
}

/** Build `/products?...` href from cleared filters + shelf filter + preserved sort. */
export function hrefForShelf(
  shelf: StorefrontShelf | null,
  sort: string | undefined
): string {
  const q = new URLSearchParams()
  if (sort) q.set('sort', sort)
  if (shelf) {
    for (const [k, v] of Object.entries(shelf.filter)) {
      if (!FILTER_KEYS.has(k)) continue
      const s = filterValueString(v)
      if (s) q.set(k, s)
    }
  }
  const qs = q.toString()
  return qs ? `/products?${qs}` : '/products'
}
