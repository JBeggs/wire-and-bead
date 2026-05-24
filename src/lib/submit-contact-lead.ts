/**
 * Submit a contact page lead to the tenant's company (NEXT_PUBLIC_COMPANY_SLUG).
 * Stored as FormSubmission in Django, scoped to that tenant only.
 */
export type ContactLeadPayload = {
  name: string
  email: string
  subject: string
  message: string
}

function getTenantCompanySlug(): string {
  const slug = process.env.NEXT_PUBLIC_COMPANY_SLUG?.trim()
  if (!slug) {
    throw new Error('This storefront is not linked to a company (NEXT_PUBLIC_COMPANY_SLUG).')
  }
  return slug
}

function getApiBaseUrl(): string {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'https://3pillars.pythonanywhere.com/api').replace(/\/$/, '')
  return base
}

export async function submitContactLead(payload: ContactLeadPayload): Promise<{ id: string; status: string }> {
  const companySlug = getTenantCompanySlug()
  const url = `${getApiBaseUrl()}/v1/forms/public/${companySlug}/contact/submit/`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, source: 'web' }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const message =
      typeof err.error === 'string'
        ? err.error
        : typeof err.detail === 'string'
          ? err.detail
          : `Request failed (${response.status})`
    throw new Error(message)
  }

  return response.json()
}
