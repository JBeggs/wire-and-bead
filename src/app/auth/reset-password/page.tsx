'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, ArrowLeft } from 'lucide-react'
import { authApi, getApiErrorMessage } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'

function ResetPasswordForm() {
  const sp = useSearchParams()
  const router = useRouter()
  const { showSuccess, showError } = useToast()
  const uid = sp.get('uid') || ''
  const token = sp.get('token') || ''
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (p1.length < 8) {
      showError('Password must be at least 8 characters')
      return
    }
    if (p1 !== p2) {
      showError('Passwords do not match')
      return
    }
    setBusy(true)
    try {
      const res = await authApi.confirmPasswordReset({
        uid,
        token,
        new_password: p1,
        new_password_confirm: p2,
      })
      showSuccess(res.detail || 'Password updated.')
      router.push('/login')
    } catch (err: any) {
      showError(getApiErrorMessage(err, 'Invalid or expired link.'))
    } finally {
      setBusy(false)
    }
  }

  if (!uid || !token) {
    return (
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-xl border border-vintage-primary/10">
        <p className="text-text-muted">This page needs a reset link from your email.</p>
        <Link href="/forgot-password" className="btn btn-secondary mt-4 inline-flex">
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-xl border border-vintage-primary/10">
      <Link href="/login" className="inline-flex items-center gap-2 text-sm text-vintage-primary mb-6">
        <ArrowLeft className="w-4 h-4" />
        Sign in
      </Link>
      <h1 className="text-2xl font-bold font-playfair mb-6">Choose a new password</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label text-sm font-semibold">New password</label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              className="w-full pl-11 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-md"
            />
          </div>
        </div>
        <div>
          <label className="form-label text-sm font-semibold">Confirm password</label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              className="w-full pl-11 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-md"
            />
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn btn-primary w-full py-3">
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-vintage-background flex items-center justify-center py-12 px-4">
      <Suspense
        fallback={
          <div className="bg-white p-8 rounded-xl border border-gray-100 text-text-muted">Loading…</div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
