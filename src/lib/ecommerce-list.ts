/**
 * Normalize Django ecommerce list payloads: bare array, `{ data }`, `{ results }`, or `{ success, data }`.
 */
export function unwrapEcommerceList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res
  if (!res || typeof res !== 'object') return []
  const o = res as Record<string, unknown>
  if (o.success === false) return []
  if (Array.isArray(o.data)) return o.data as T[]
  if (Array.isArray(o.results)) return o.results as T[]
  return []
}

/**
 * Product list responses: same as {@link unwrapEcommerceList}, plus nested `{ data: { results } }`
 * (some DRF / gateway shapes).
 */
export function unwrapEcommerceProductList(res: unknown): unknown[] {
  const direct = unwrapEcommerceList(res)
  if (direct.length > 0) return direct
  if (!res || typeof res !== 'object') return []
  const o = res as Record<string, unknown>
  const d = o.data
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    const inner = d as Record<string, unknown>
    if (Array.isArray(inner.results)) return inner.results
    if (Array.isArray(inner.products)) return inner.products
  }
  return []
}

/** Next.js `searchParams` values may be `string | string[] | undefined`. */
export function firstQueryValue(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined
  const s = Array.isArray(v) ? v[0] : v
  const t = (s ?? '').trim()
  return t || undefined
}

export function sanitizeListPage(v: string | string[] | undefined): number {
  const raw = firstQueryValue(v)
  const n = parseInt(raw ?? '1', 10)
  return Number.isFinite(n) && n >= 1 ? n : 1
}
