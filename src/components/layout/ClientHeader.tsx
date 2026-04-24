'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, User, LogOut, Package, ImageIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCartSafe } from '@/contexts/CartContext'
import { useMounted } from '@/hooks/useMounted'

export default function ClientHeader() {
  const [countBump, setCountBump] = useState(false)
  let user: any = null
  let profile: any = null
  let signOut: (() => Promise<void>) | (() => void) = () => {}
  let authLoading = false
  try {
    const auth = useAuth()
    user = auth.user
    profile = auth.profile
    signOut = auth.signOut
    authLoading = auth.loading
  } catch {
    // Render safe fallback when header mounts outside providers.
  }
  const isAdmin = profile?.role === 'admin' || profile?.role === 'business_owner'
  const { itemCount } = useCartSafe()
  const mounted = useMounted()

  useEffect(() => {
    const handler = () => {
      setCountBump(true)
      const t = setTimeout(() => setCountBump(false), 600)
      return () => clearTimeout(t)
    }
    window.addEventListener('cart-item-added', handler)
    return () => window.removeEventListener('cart-item-added', handler)
  }, [])

  if (!mounted || authLoading) {
    return (
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      <Link
        href="/cart"
        data-cy="header-cart"
        className="p-2 text-text hover:text-vintage-primary transition-colors relative group"
        aria-label="Shopping cart"
      >
        <ShoppingCart className="w-5 h-5" />
        {itemCount > 0 && (
          <span className={`absolute -top-1 -right-1 bg-vintage-accent text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm group-hover:scale-110 transition-transform ${countBump ? 'animate-cart-bump' : ''}`}>
            {itemCount}
          </span>
        )}
      </Link>

      {user ? (
        <div className="flex items-center space-x-3" data-cy="header-user">
          {isAdmin && (
            <Link
              href="/admin/orders"
              className="p-2 text-text hover:text-vintage-primary transition-colors"
              aria-label="View orders"
              title="Orders"
            >
              <Package className="w-5 h-5" />
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin/branding"
              className="p-2 text-text hover:text-vintage-primary transition-colors"
              aria-label="Branding and page heroes"
              title="Branding & Heroes"
            >
              <ImageIcon className="w-5 h-5" />
            </Link>
          )}
          <Link
            href="/profile"
            className="p-2 text-text hover:text-vintage-primary transition-colors"
            aria-label="Profile"
          >
            <User className="w-5 h-5" />
          </Link>
          <button
            onClick={() => signOut()}
            className="p-2 text-text hover:text-red-600 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <Link href="/login" className="btn btn-primary">
          Sign In
        </Link>
      )}
    </div>
  )
}
