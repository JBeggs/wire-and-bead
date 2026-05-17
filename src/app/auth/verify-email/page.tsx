'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'

function VerifyEmailInner() {
  const sp = useSearchParams()
  const router = useRouter()
  const { showSuccess, showError } = useToast()
  const token = sp.get('token')
  const emailHint = sp.get('email')
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>(
    token ? 'working' : 'idle',
  )
  const [resendBusy, setResendBusy] = useState(false)

  useEffect(() => {
    if (!token) return undefined
    let cancelled = false
    ;(async () => {
      try {
        await authApi.verifyEmail(token)
        if (!cancelled) {
          setStatus('done')
          showSuccess('Email verified!')
          router.push('/')
          router.refresh()
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setStatus('error')
          showError(err instanceof Error ? err.message : 'Invalid or expired link.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, router, showError, showSuccess])

  const resend = async () => {
    if (!emailHint) {
      showError('Enter your email on the login page and use Resend verification.')
      return
    }
    setResendBusy(true)
    try {
      await authApi.resendVerificationEmail(emailHint)
      showSuccess('If the account exists and needs verification, a new email was sent.')
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Could not send email.')
    } finally {
      setResendBusy(false)
    }
  }

  return (
    <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-xl border border-vintage-primary/10 text-center space-y-4">
      {!token ? (
        <>
          <h1 className="text-xl font-bold font-playfair">Check your email</h1>
          <p className="text-text-muted text-sm">
            We sent you a verification link. Open it to activate your account, then sign in here.
          </p>
          {emailHint ? (
            <button
              type="button"
              onClick={() => void resend()}
              disabled={resendBusy}
              className="btn btn-secondary w-full"
            >
              {resendBusy ? 'Sending…' : 'Resend verification email'}
            </button>
          ) : null}
          <Link href="/login" className="btn btn-primary block w-full py-3">
            Back to sign in
          </Link>
        </>
      ) : (
        <>
          {status === 'working' ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-10 h-10 animate-spin text-vintage-primary" />
              <p className="text-text-muted text-sm">Verifying…</p>
            </div>
          ) : null}
          {status === 'done' ? <p className="text-text-muted text-sm">Redirecting…</p> : null}
          {status === 'error' ? (
            <>
              <p className="text-text-muted text-sm">
                Request a fresh link below or contact support if this keeps failing.
              </p>
              {emailHint ? (
                <button
                  type="button"
                  disabled={resendBusy}
                  onClick={() => void resend()}
                  className="btn btn-secondary w-full"
                >
                  {resendBusy ? 'Sending…' : 'Resend verification'}
                </button>
              ) : null}
              <Link href="/login" className="btn btn-secondary block w-full py-3">
                Sign in
              </Link>
            </>
          ) : null}
        </>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-vintage-background flex items-center justify-center py-12 px-4">
      <Suspense
        fallback={<div className="bg-white p-8 rounded-xl text-text-muted shadow-xl border border-vintage-primary/10">Loading…</div>}
      >
        <VerifyEmailInner />
      </Suspense>
    </div>
  )
}
