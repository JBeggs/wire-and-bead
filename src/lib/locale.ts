import type { Company } from '@/lib/company-shared'

/**
 * BCP 47 tag for `<html lang>` and `Intl` (from `SiteSetting.site_locale` merged into `Company.localeTag`).
 */
export function resolveLocale(company: Pick<Company, 'localeTag'>): string {
  const t = (company.localeTag || 'en-ZA').trim()
  return t || 'en-ZA'
}
