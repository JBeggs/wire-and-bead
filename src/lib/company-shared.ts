/**
 * Client-safe Company types and helpers.
 *
 * Kept separate from `company.ts` so client components can import the type
 * and fallback without transitively pulling in `next/headers` (which is
 * server-only).
 */

export interface Company {
  name: string
  tagline: string
  description: string
  logoUrl: string | null
  heroImageUrl: string | null
  ogImageUrl: string | null
  brandColor: string | null
  contact: {
    email: string
    phone: string
    address: string
  }
  social: {
    facebook: string
    twitter: string
    instagram: string
    whatsapp: string
  }
  currency: string
  /** BCP 47 language tag from `SiteSetting.site_locale` (for `<html lang>` + `Intl`). */
  localeTag: string
  /** Optional label for payment footer copy (`SiteSetting.payment_provider_display_name`). */
  paymentProviderDisplayName?: string
}

/**
 * Fallback brand shown when the backend Company record hasn't been provisioned
 * yet (e.g. before the first-login /admin/setup wizard has run). Each fork
 * should set these values to match the storefront's own identity so the fork
 * never shows a generic "Your Store" placeholder.
 */
export const FALLBACK_COMPANY: Company = {
  name: 'Wire and Bead',
  tagline: 'Handmade jewellery and beaded craft',
  description: 'Discover our collection of handcrafted wirework and bead jewellery.',
  logoUrl: null,
  heroImageUrl: null,
  ogImageUrl: null,
  brandColor: null,
  contact: { email: '', phone: '', address: '' },
  social: { facebook: '', twitter: '', instagram: '', whatsapp: '' },
  currency: 'ZAR',
  localeTag: 'en-ZA',
}

/** Two-letter monogram derived from a company name (for favicons, placeholders). */
export function companyMonogram(name: string): string {
  const trimmed = (name || '').trim()
  if (!trimmed) return 'S'
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
}
