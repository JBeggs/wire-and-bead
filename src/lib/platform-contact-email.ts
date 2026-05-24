export const PLATFORM_CONTACT_EMAIL = 'admin@3pillars.co.za'
export const CUSTOM_CONTACT_EMAIL_SETTING = 'custom_contact_email_enabled'

export function isCustomContactEmailEnabled(map: Record<string, unknown>): boolean {
  return String(map[CUSTOM_CONTACT_EMAIL_SETTING] ?? '').toLowerCase() === 'true'
}

export function resolvePublicContactEmail(dbEmail: string, map: Record<string, unknown>): string {
  return isCustomContactEmailEnabled(map)
    ? (dbEmail.trim() || PLATFORM_CONTACT_EMAIL)
    : PLATFORM_CONTACT_EMAIL
}
