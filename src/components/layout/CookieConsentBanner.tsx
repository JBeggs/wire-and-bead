'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'

const CONSENT_COOKIE_NAME = 'cookie_consent'
const CONSENT_COOKIE_VALUE = 'essential_accepted'
const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
const CONSENT_STORAGE_KEY = 'cookie_consent'

let sessionConsentAccepted = false

function hasCookieConsent(): boolean {
  return document.cookie
    .split(';')
    .some((cookie) => cookie.trim().startsWith(`${CONSENT_COOKIE_NAME}=`))
}

function getSecureAttribute(): string {
  return window.location.protocol === 'https:' ? '; Secure' : ''
}

function hasStoredConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY) === CONSENT_COOKIE_VALUE
  } catch {
    return false
  }
}

function storeCookieConsent(): void {
  sessionConsentAccepted = true

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_COOKIE_VALUE)
  } catch {
    // Some mobile/private browsers block storage; keep the session acknowledgement.
  }

  document.cookie = `${CONSENT_COOKIE_NAME}=${CONSENT_COOKIE_VALUE}; Max-Age=${CONSENT_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${getSecureAttribute()}`
}

function subscribeToCookieConsent(callback: () => void): () => void {
  window.addEventListener('cookie-consent-change', callback)
  return () => window.removeEventListener('cookie-consent-change', callback)
}

function getCookieConsentSnapshot(): boolean {
  return sessionConsentAccepted || hasStoredConsent() || hasCookieConsent()
}

function getServerCookieConsentSnapshot(): boolean {
  return true
}

export function CookieConsentBanner() {
  const hasConsent = useSyncExternalStore(
    subscribeToCookieConsent,
    getCookieConsentSnapshot,
    getServerCookieConsentSnapshot
  )

  const acceptCookies = () => {
    storeCookieConsent()
    window.dispatchEvent(new Event('cookie-consent-change'))
  }

  if (hasConsent) return null

  return (
    <section
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:px-6"
    >
      <div className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white/95 p-4 text-gray-900 shadow-2xl backdrop-blur sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div className="space-y-2">
          <h2 className="text-base font-semibold">Cookies on this site</h2>
          <p className="text-sm leading-6 text-gray-700">
            We use essential cookies to keep this site secure, remember this choice, and make
            shopping features work. We do not use analytics or marketing cookies without consent.
          </p>
          <p className="text-xs text-gray-600">
            Read our{' '}
            <Link href="/privacy" className="font-medium underline underline-offset-2">
              privacy policy
            </Link>{' '}
            and{' '}
            <Link href="/terms" className="font-medium underline underline-offset-2">
              terms
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={acceptCookies}
          className="mt-4 w-full rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:shrink-0"
        >
          Accept cookies
        </button>
      </div>
    </section>
  )
}
