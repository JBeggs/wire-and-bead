import 'server-only'
import { cache } from 'react'
import { serverNewsApi } from '@/lib/api-server'

export type SiteSettingRow = { key: string; value: string; type?: string }

function parseSetting(row: SiteSettingRow): unknown {
  if (!row) return null
  try {
    return row.type === 'json' ? JSON.parse(row.value) : row.value
  } catch {
    return row.value
  }
}

/**
 * Request-scoped cache: one `site-settings` fetch per RSC tree (shared with `getCompany`).
 */
export const getSiteSettingsRows = cache(async (): Promise<SiteSettingRow[]> => {
  try {
    const raw: unknown = await serverNewsApi.siteSettings.list()
    if (Array.isArray(raw)) return raw as SiteSettingRow[]
    if (raw && typeof raw === 'object' && 'results' in raw) {
      const r = (raw as { results?: SiteSettingRow[] }).results
      return Array.isArray(r) ? r : []
    }
    return []
  } catch {
    return []
  }
})

export const getSiteSettingsMap = cache(async (): Promise<Record<string, unknown>> => {
  const rows = await getSiteSettingsRows()
  const map: Record<string, unknown> = {}
  for (const row of rows) {
    map[row.key] = parseSetting(row)
  }
  return map
})

export async function getSiteSetting(key: string): Promise<unknown> {
  const map = await getSiteSettingsMap()
  return map[key]
}

export async function getSiteSettings(keys: string[]): Promise<Record<string, unknown>> {
  const map = await getSiteSettingsMap()
  const out: Record<string, unknown> = {}
  for (const k of keys) {
    out[k] = map[k]
  }
  return out
}

export function coerceSiteString(v: unknown): string {
  if (typeof v === 'string') return v
  if (v == null) return ''
  return String(v)
}

/** Parse numeric site settings (integers / decimals). */
export function coerceSiteNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = Number(String(v).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : null
}
