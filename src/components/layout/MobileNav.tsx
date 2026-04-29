'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, User, Truck, ShoppingCart } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useMounted } from '@/hooks/useMounted'
import { useCartSafe } from '@/contexts/CartContext'
import ThemeToggle from '@/components/theme/ThemeToggle'

interface MobileNavProps {
  menuItems: { title: string; href: string }[]
}

type TruckCoords = { startX: number; startY: number; endX: number; endY: number }

/** iOS/Android minimum tap target (~44×44pt) */
const ICON_TAP =
  'relative min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 text-text hover:text-primary transition-colors'

/** Inner: remounted when route changes (`key={pathname}` on parent) so menu closes without setState-in-effect. */
function MobileNavInner({ menuItems }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [countBump, setCountBump] = useState(false)
  const [showTruck, setShowTruck] = useState(false)
  const [truckCoords, setTruckCoords] = useState<TruckCoords | null>(null)
  const { user, profile } = useAuth()
  const isAdmin =
    profile?.role === 'admin' || profile?.role === 'business_owner'
  const { itemCount } = useCartSafe()
  const mounted = useMounted()

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ startX?: number; startY?: number }>)?.detail
      const startX = detail?.startX ?? window.innerWidth * 0.2
      const startY = detail?.startY ?? window.innerHeight * 0.5
      const cartEl = document.querySelector('[data-cart-icon]')
      const endRect = cartEl?.getBoundingClientRect()
      const endX = endRect ? endRect.left + endRect.width / 2 : window.innerWidth - 48
      const endY = endRect ? endRect.top + endRect.height / 2 : 48
      setTruckCoords({ startX, startY, endX, endY })
      setShowTruck(true)
      const t = setTimeout(() => {
        setShowTruck(false)
        setTruckCoords(null)
        setCountBump(true)
        const t2 = setTimeout(() => setCountBump(false), 600)
        return () => clearTimeout(t2)
      }, 1200)
      return () => clearTimeout(t)
    }
    window.addEventListener('cart-item-added', handler)
    return () => window.removeEventListener('cart-item-added', handler)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  return (
    <div className="md:hidden">
      {showTruck && truckCoords && (
        <div
          className="truck-fly-animation fixed pointer-events-none z-[9999]"
          style={
            {
              '--truck-start-x': `${truckCoords.startX}px`,
              '--truck-start-y': `${truckCoords.startY}px`,
              '--truck-end-x': `${truckCoords.endX}px`,
              '--truck-end-y': `${truckCoords.endY}px`,
            } as React.CSSProperties
          }
        >
          <Truck className="w-12 h-12 text-primary" strokeWidth={2} />
        </div>
      )}
      <div className="flex items-center gap-2">
        <Link
          href="/cart"
          data-cy="header-cart"
          data-cart-icon
          className={ICON_TAP}
          aria-label={`Cart, ${itemCount} items`}
        >
          <ShoppingCart className="w-8 h-8 shrink-0" aria-hidden />
          {itemCount > 0 && (
            <span
              className={`absolute -top-0.5 -right-0.5 bg-accent text-on-accent text-xs font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm transition-transform duration-300 ${
                countBump ? 'animate-cart-bump' : ''
              }`}
            >
              {itemCount}
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`${ICON_TAP} shrink-0`}
          aria-expanded={isOpen}
          aria-controls="mobile-nav-panel"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-6 h-6 shrink-0" /> : <Menu className="w-6 h-6 shrink-0" />}
        </button>
      </div>

      {isOpen && (
        <div
          id="mobile-nav-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Main menu"
          className="absolute top-full left-0 right-0 z-50 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain border-b border-border-default bg-surface shadow-lg"
        >
          <nav className="container-wide py-4">
            <div className="flex flex-col space-y-4">
              <Link href="/" className="nav-link py-2" onClick={() => setIsOpen(false)}>
                Home
              </Link>
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-link py-2"
                  onClick={() => setIsOpen(false)}
                >
                  {item.title}
                </Link>
              ))}

              {mounted && isAdmin && (
                <div className="border-t border-border-default pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                    Business
                  </p>
                  <Link
                    href="/admin/inventory"
                    className="nav-link block py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Inventory
                  </Link>
                  <Link href="/admin/orders" className="nav-link block py-2" onClick={() => setIsOpen(false)}>
                    Orders
                  </Link>
                  <Link href="/admin/branding" className="nav-link block py-2" onClick={() => setIsOpen(false)}>
                    Branding
                  </Link>
                  <Link href="/admin/setup" className="nav-link block py-2" onClick={() => setIsOpen(false)}>
                    Business details
                  </Link>
                </div>
              )}

              <div className="border-t border-border-default pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                  Theme
                </p>
                <ThemeToggle variant="full" />
              </div>

              <div className="border-t border-border-default pt-4 flex flex-wrap items-center gap-4">
                {mounted && (
                  <Link
                    href="/cart"
                    className="flex items-center space-x-2 nav-link"
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="font-semibold">
                      Cart{itemCount > 0 ? ` (${itemCount})` : ''}
                    </span>
                  </Link>
                )}
                {mounted && user ? (
                  <Link
                    href="/profile"
                    className="flex items-center space-x-2 nav-link"
                    onClick={() => setIsOpen(false)}
                  >
                    <User className="w-5 h-5" />
                    <span>Profile</span>
                  </Link>
                ) : mounted ? (
                  <Link href="/login" className="btn btn-primary" onClick={() => setIsOpen(false)}>
                    Sign In
                  </Link>
                ) : null}
              </div>
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}

export function MobileNav({ menuItems }: MobileNavProps) {
  const pathname = usePathname()
  return <MobileNavInner key={pathname} menuItems={menuItems} />
}
