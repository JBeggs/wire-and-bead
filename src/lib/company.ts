/**
 * Server-side Company helpers.
 *
 * `getCompany()` is the single source of truth on the server. It reads the
 * live site-settings/company record and normalises it into a `Company` shape.
 * Client code should import the `Company` type and shared helpers from
 * `@/lib/company-shared` — that module never touches `next/headers`.
 *
 * Until a dedicated `/v1/companies/<id>/` endpoint is wired up, we derive the
 * company shape from the existing `site-settings` key/value store so the
 * template stays functional against the current API.
 */

import 'server-only'
import { unstable_cache } from 'next/cache'
import { ensureAbsoluteImageUrl } from './image-utils'
import { FALLBACK_COMPANY, companyMonogram, type Company } from './company-shared'
import { getSiteSettingsMap } from './site-settings'
import { resolvePublicContactEmail } from './platform-contact-email'

export { FALLBACK_COMPANY, companyMonogram }
export type { Company }

function coerceString(v: unknown): string {
  if (typeof v === 'string') return v
  if (v == null) return ''
  return String(v)
}

function normaliseImageUrl(v: unknown): string | null {
  if (!v) return null
  if (typeof v === 'string' && v) return ensureAbsoluteImageUrl(v)
  if (typeof v === 'object' && v !== null) {
    const obj = v as Record<string, unknown>
    const url = obj.url ?? obj.file_url
    if (typeof url === 'string' && url) return ensureAbsoluteImageUrl(url)
  }
  return null
}

async function fetchCompanyUncached(): Promise<Company> {
  try {
    const map = await getSiteSettingsMap()

    const company: Company = {
      name: coerceString(map.site_name) || FALLBACK_COMPANY.name,
      tagline: coerceString(map.site_tagline),
      description: coerceString(map.site_description) || FALLBACK_COMPANY.description,
      logoUrl: normaliseImageUrl(map.site_logo),
      heroImageUrl: normaliseImageUrl(map.hero_image ?? map.site_hero),
      ogImageUrl: normaliseImageUrl(map.og_image ?? map.site_og_image),
      brandColor: coerceString(map.brand_color) || null,
      contact: {
        email: resolvePublicContactEmail(coerceString(map.contact_email), map),
        phone: coerceString(map.contact_phone),
        address: coerceString(map.contact_address),
      },
      social: {
        facebook: coerceString(map.social_facebook),
        twitter: coerceString(map.social_twitter),
        instagram: coerceString(map.social_instagram),
        whatsapp: coerceString(map.social_whatsapp ?? map.contact_whatsapp),
      },
      currency: coerceString(map.currency) || FALLBACK_COMPANY.currency,
      localeTag: coerceString(map.site_locale) || FALLBACK_COMPANY.localeTag,
      paymentProviderDisplayName: coerceString(map.payment_provider_display_name) || undefined,
    }
    return company
  } catch (err) {
    console.error('[getCompany] failed:', err)
    return FALLBACK_COMPANY
  }
}

const companySlug = process.env.NEXT_PUBLIC_COMPANY_SLUG || 'default'

const getCompanyCached = unstable_cache(fetchCompanyUncached, ['company', companySlug], {
  revalidate: 300,
})

/**
 * Fetch the active company record. Server-only.
 * Always returns a valid `Company`; degrades to `FALLBACK_COMPANY` on error.
 */
export async function getCompany(): Promise<Company> {
  return getCompanyCached()
}
