/**
 * Server-only helper for fetching uploaded page heroes.
 *
 * `getPageHero(pageSlug)` returns a normalised `PageHero` for the current
 * tenant, wrapped in React `cache` so multiple RSC components on the same page
 * share a single request. It never throws; on any failure (network, 5xx, schema
 * drift) it returns `null` so the caller can fall back to the template default.
 */
import 'server-only'
import { cache } from 'react'
import { serverNewsApi } from '@/lib/api-server'
import { ensureAbsoluteImageUrl } from '@/lib/image-utils'

export type PageHero = {
  id: string
  pageSlug: string
  enabled: boolean
  imageUrl: string | null
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
}

type ApiImage = {
  file_url?: string | null
  url?: string | null
} | null | undefined

type ApiHero = {
  id?: string
  page_slug?: string
  enabled?: boolean
  image?: ApiImage
  title?: string | null
  subtitle?: string | null
  cta_label?: string | null
  cta_href?: string | null
}

function coerceString(v: unknown): string {
  if (typeof v === 'string') return v
  if (v == null) return ''
  return String(v)
}

function normaliseImageUrl(image: ApiImage): string | null {
  if (!image || typeof image !== 'object') return null
  const raw = image.file_url ?? image.url
  if (!raw || typeof raw !== 'string') return null
  return ensureAbsoluteImageUrl(raw)
}

function normaliseHero(row: ApiHero): PageHero | null {
  if (!row || typeof row !== 'object') return null
  const pageSlug = coerceString(row.page_slug).trim()
  if (!pageSlug) return null
  return {
    id: coerceString(row.id),
    pageSlug,
    enabled: Boolean(row.enabled),
    imageUrl: normaliseImageUrl(row.image),
    title: coerceString(row.title),
    subtitle: coerceString(row.subtitle),
    ctaLabel: coerceString(row.cta_label),
    ctaHref: coerceString(row.cta_href),
  }
}

function unwrapRows(raw: unknown): ApiHero[] {
  if (Array.isArray(raw)) return raw as ApiHero[]
  if (raw && typeof raw === 'object' && 'results' in raw) {
    const r = (raw as { results?: unknown }).results
    return Array.isArray(r) ? (r as ApiHero[]) : []
  }
  return []
}

/**
 * Request-scoped fetch of a single page's hero. Returns `null` if:
 * - the API request fails
 * - no row exists for this slug
 * - the row exists but is disabled
 * - the row is enabled but has no image (caller should fall back)
 *
 * Callers should treat a non-null return as "render the uploaded hero".
 */
export const getPageHero = cache(
  async (pageSlug: string): Promise<PageHero | null> => {
    if (!pageSlug || typeof pageSlug !== 'string') return null
    try {
      const raw: unknown = await serverNewsApi.pageHeroes.listForPage(pageSlug)
      const rows = unwrapRows(raw)
      for (const row of rows) {
        const hero = normaliseHero(row)
        if (!hero || hero.pageSlug !== pageSlug) continue
        if (!hero.enabled || !hero.imageUrl) return null
        return hero
      }
      return null
    } catch (err) {
      console.error('[getPageHero] failed:', err)
      return null
    }
  },
)

/**
 * Fetch every hero row the current tenant has (enabled or not).
 * Used by the admin Branding UI. Returns `[]` on any failure.
 */
export async function listAllPageHeroes(): Promise<PageHero[]> {
  try {
    const raw: unknown = await serverNewsApi.pageHeroes.list()
    const rows = unwrapRows(raw)
    return rows
      .map(normaliseHero)
      .filter((row): row is PageHero => row !== null)
  } catch (err) {
    console.error('[listAllPageHeroes] failed:', err)
    return []
  }
}
