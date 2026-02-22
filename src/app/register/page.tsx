'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Mail, Lock, User, ArrowRight } from 'lucide-react'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signUp } = useAuth()
  const { showError, showSuccess } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      showError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      showError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await signUp(email, password, fullName)
      
      if (error) {
        showError(error)
      } else {
        showSuccess('Account created successfully!')
        router.push('/')
      }
    } catch {
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
            <h1 className="text-3xl font-bold font-playfair text-text tracking-tight">Create Account</h1>
            <p className="text-text-muted mt-3 text-lg">Join our community of treasure hunters</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="fullName" className="form-label text-sm font-semibold uppercase tracking-wider text-text-light">
                Full Name
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-colors group-focus-within:text-vintage-primary z-20">
                  <User className="w-5 h-5 text-text-muted" />
                </div>
                <input
                  id="fullName"
                  data-cy="register-full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md hover:border-vintage-primary/50 transition-all focus:bg-white focus:ring-4 focus:ring-vintage-primary/10 focus:outline-none focus:border-transparent relative z-10"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

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
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md hover:border-vintage-primary/50 transition-all focus:bg-white focus:ring-4 focus:ring-vintage-primary/10 focus:outline-none focus:border-transparent relative z-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
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
                disabled={isLoading}
                className="btn btn-primary w-full py-4 text-base font-bold shadow-lg shadow-vintage-primary/20 hover:shadow-vintage-primary/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  <>
                    Create Account
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
