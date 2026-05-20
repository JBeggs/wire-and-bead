'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/contexts/ToastContext'
import { authApi } from '@/lib/api'
import { useRegistrationEmailCheck } from '@/hooks/useRegistrationEmailCheck'
import { Mail, Lock, User, ArrowRight, Phone, Link2 } from 'lucide-react'

function countDigits(value: string) {
  return value.replace(/\D/g, '').length
}

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const { signUp } = useAuth()
  const { syncCartAfterLogin } = useCart()
  const { showError, showSuccess } = useToast()
  const router = useRouter()
  const { emailCheckStatus, checkEmail, resetEmailCheck, linkMode, alreadyLinked } =
    useRegistrationEmailCheck(authApi.checkRegistrationEmail)

  const handleEmailBlur = () => {
    void checkEmail(email)
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    resetEmailCheck()
    setSubmitError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    if (password !== confirmPassword) {
      showError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      showError('Password must be at least 8 characters')
      return
    }

    const fn = firstName.trim()
    const ln = lastName.trim()
    const phoneTrim = phone.trim()

    if (!linkMode) {
      if (!fn) {
        showError('Please enter your first name')
        return
      }
      if (!ln) {
        showError('Please enter your last name')
        return
      }
      if (!phoneTrim) {
        showError('Please enter your cellphone number')
        return
      }
      if (countDigits(phoneTrim) < 8) {
        showError('Cellphone must include at least 8 digits')
        return
      }
    }

    setIsLoading(true)

    try {
      const checkStatus = await checkEmail(email)
      if (checkStatus === 'already_linked') {
        const msg = 'This email is already linked to this store. Please sign in instead.'
        setSubmitError(msg)
        showError(msg)
        return
      }

      const isLink = linkMode || checkStatus === 'existing_can_link'

      const result = await signUp(
        email,
        password,
        isLink ? '' : fn,
        isLink ? '' : ln,
        isLink ? '' : phoneTrim,
        isLink ? { linkOnly: true } : undefined,
      )

      if (result.error) {
        const msg =
          typeof result.error === 'string' && result.error.trim() !== ''
            ? result.error
            : 'Registration failed. Please try again.'
        setSubmitError(msg)
        showError(msg)
      } else if (result.verificationRequired) {
        showSuccess(
          result.accountLinked
            ? 'Account linked to this store. Check your email to verify before signing in.'
            : 'Check your email to verify your account, then sign in.',
        )
        router.push(`/auth/verify-email?email=${encodeURIComponent(email.trim())}`)
      } else {
        showSuccess(
          result.accountLinked ? 'Account linked to this store! Syncing your cart...' : 'Account created! Syncing your cart...',
        )
        try {
          await syncCartAfterLogin(true)
        } catch (cartErr: any) {
          console.error('Cart sync after register:', cartErr?.message ?? cartErr)
        }
        router.push('/')
      }
    } catch {
      setSubmitError('An unexpected error occurred')
      showError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-vintage-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-in fade-in duration-500">
        <div className="bg-white p-8 rounded-xl shadow-xl border border-vintage-primary/10">
          <div className="text-center mb-10">
            <Link href="/" className="inline-block group transition-transform hover:scale-105 duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-vintage-primary to-modern-accent rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-vintage-primary/20 group-hover:shadow-vintage-primary/30 transition-shadow">
                <User className="w-10 h-10 text-white" />
              </div>
            </Link>
            <h1 className="text-3xl font-bold font-playfair text-text tracking-tight">
              {linkMode ? 'Link Your Account' : 'Create Account'}
            </h1>
            <p className="text-text-muted mt-3 text-lg">
              {linkMode
                ? 'Connect this store to your existing account'
                : 'Join our community of treasure hunters'}
            </p>
          </div>

          {linkMode ? (
            <div
              role="status"
              className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
            >
              <div className="flex items-start gap-2">
                <Link2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>
                  An account with this email already exists. Enter your password to link this store
                  to your existing account — we won&apos;t create a duplicate. Your profile details
                  are already on file.
                </p>
              </div>
            </div>
          ) : null}

          {alreadyLinked ? (
            <div
              role="status"
              className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              This email is already linked to this store.{' '}
              <Link href="/login" className="font-semibold underline underline-offset-2">
                Sign in instead
              </Link>
              .
            </div>
          ) : null}

          {submitError ? (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {submitError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!linkMode ? (
            <>
            <div className="space-y-2">
              <label htmlFor="register-first-name" className="form-label text-sm font-semibold uppercase tracking-wider text-text-light">
                First name *
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-colors group-focus-within:text-vintage-primary z-20">
                  <User className="w-5 h-5 text-text-muted" />
                </div>
                <input
                  id="register-first-name"
                  data-cy="register-first-name"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md hover:border-vintage-primary/50 transition-all focus:bg-white focus:ring-4 focus:ring-vintage-primary/10 focus:outline-none focus:border-transparent relative z-10"
                  placeholder="John"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="register-last-name" className="form-label text-sm font-semibold uppercase tracking-wider text-text-light">
                Last name *
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-colors group-focus-within:text-vintage-primary z-20">
                  <User className="w-5 h-5 text-text-muted" />
                </div>
                <input
                  id="register-last-name"
                  data-cy="register-last-name"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md hover:border-vintage-primary/50 transition-all focus:bg-white focus:ring-4 focus:ring-vintage-primary/10 focus:outline-none focus:border-transparent relative z-10"
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="form-label text-sm font-semibold uppercase tracking-wider text-text-light">
                Cellphone *
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-colors group-focus-within:text-vintage-primary z-20">
                  <Phone className="w-5 h-5 text-text-muted" />
                </div>
                <input
                  id="phone"
                  data-cy="register-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md hover:border-vintage-primary/50 transition-all focus:bg-white focus:ring-4 focus:ring-vintage-primary/10 focus:outline-none focus:border-transparent relative z-10"
                  placeholder="+27 82 123 4567"
                  required
                />
              </div>
              <p className="text-xs text-text-muted flex items-center gap-1 ml-1">
                <span className="w-1 h-1 bg-text-muted rounded-full"></span>
                Required for delivery (at least 8 digits)
              </p>
            </div>
            </>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="email" className="form-label text-sm font-semibold uppercase tracking-wider text-text-light">
                Email
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-colors group-focus-within:text-vintage-primary z-20">
                  <Mail className="w-5 h-5 text-text-muted" />
                </div>
                <input
                  id="email"
                  data-cy="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={handleEmailBlur}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md hover:border-vintage-primary/50 transition-all focus:bg-white focus:ring-4 focus:ring-vintage-primary/10 focus:outline-none focus:border-transparent relative z-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
              {emailCheckStatus === 'checking' ? (
                <p className="text-xs text-text-muted ml-1">Checking email…</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="form-label text-sm font-semibold uppercase tracking-wider text-text-light">
                Password
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-colors group-focus-within:text-vintage-primary z-20">
                  <Lock className="w-5 h-5 text-text-muted" />
                </div>
                <input
                  id="password"
                  data-cy="register-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md hover:border-vintage-primary/50 transition-all focus:bg-white focus:ring-4 focus:ring-vintage-primary/10 focus:outline-none focus:border-transparent relative z-10"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>
              <p className="text-xs text-text-muted flex items-center gap-1 ml-1">
                <span className="w-1 h-1 bg-text-muted rounded-full"></span>
                At least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="form-label text-sm font-semibold uppercase tracking-wider text-text-light">
                Confirm Password
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-colors group-focus-within:text-vintage-primary z-20">
                  <Lock className="w-5 h-5 text-text-muted" />
                </div>
                <input
                  id="confirmPassword"
                  data-cy="register-password-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md hover:border-vintage-primary/50 transition-all focus:bg-white focus:ring-4 focus:ring-vintage-primary/10 focus:outline-none focus:border-transparent relative z-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                data-cy="register-submit"
                disabled={isLoading || alreadyLinked}
                className="btn btn-primary w-full py-4 text-base font-bold shadow-lg shadow-vintage-primary/20 hover:shadow-vintage-primary/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {linkMode ? 'Linking account...' : 'Creating account...'}
                  </span>
                ) : (
                  <>
                    {linkMode ? 'Link Account' : 'Create Account'}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-10 pt-8 border-t border-gray-100 text-center">
            <p className="text-text-muted">
              Already have an account?{' '}
              <Link href="/login" className="text-vintage-primary hover:text-vintage-primary-dark font-bold transition-colors underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
