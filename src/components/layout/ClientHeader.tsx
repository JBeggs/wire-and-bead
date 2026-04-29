'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ShoppingCart,
  User,
  LogOut,
  Package,
  Image as ImageIcon,
  Boxes,
  Settings,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCartSafe } from '@/contexts/CartContext'
import { useMounted } from '@/hooks/useMounted'

const ICON_HIT =
  'relative min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 text-text hover:text-vintage-primary transition-colors'

const SIGN_OUT_HIT =
  'relative min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 text-text hover:text-red-600 transition-colors'

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
        className={`${ICON_HIT} group`}
        aria-label="Shopping cart"
      >
        <ShoppingCart className="w-5 h-5 shrink-0" />
        {itemCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 bg-vintage-accent text-on-accent text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm group-hover:scale-110 transition-transform ${countBump ? 'animate-cart-bump' : ''}`}
          >
            {itemCount}
          </span>
        )}
      </Link>

      {user ? (
        <div className="flex items-center space-x-3" data-cy="header-user">
          {isAdmin && (
            <>
              <Link
                href="/admin/inventory"
                className={ICON_HIT}
                aria-label="Inventory"
                title="Inventory"
              >
                <Boxes className="w-5 h-5 shrink-0" />
              </Link>
              <Link href="/admin/orders" className={ICON_HIT} aria-label="View orders" title="Orders">
                <Package className="w-5 h-5 shrink-0" />
              </Link>
              <Link
                href="/admin/branding"
                className={ICON_HIT}
                aria-label="Branding and heroes"
                title="Branding & Heroes"
              >
                <ImageIcon className="w-5 h-5 shrink-0" />
              </Link>
              <Link
                href="/admin/setup"
                className={ICON_HIT}
                aria-label="Business setup and details"
                title="Business details"
              >
                <Settings className="w-5 h-5 shrink-0" />
              </Link>
            </>
          )}
          <Link href="/profile" className={ICON_HIT} aria-label="Profile">
            <User className="w-5 h-5 shrink-0" />
          </Link>
          <button
            type="button"
            onClick={() => signOut()}
            className={SIGN_OUT_HIT}
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5 shrink-0" />
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
