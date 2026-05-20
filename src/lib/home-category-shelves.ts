/**
 * Helpers for home-page category rails (CRM-driven).
 */

export function homeCategoryProductListParams(categorySlug: string): {
  is_active: true
  category: string
  page_size: number
  ordering: 'name'
} {
  return {
    is_active: true,
    category: String(categorySlug || '').trim(),
    page_size: 20,
    ordering: 'name',
  }
}

export function categoryViewAllHref(categorySlug: string): string {
  return `/products?category=${encodeURIComponent(String(categorySlug || '').trim())}`
}
