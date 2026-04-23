import Link from 'next/link'
import { getCompany } from '@/lib/company'
import SafeImage from '@/components/media/SafeImage'
import ThemeToggle from '@/components/theme/ThemeToggle'
import { MobileNav } from './MobileNav'
import ClientHeader from './ClientHeader'
import { companyMonogram } from '@/lib/company'

const MENU_ITEMS = [
  { title: 'Products', href: '/products' },
  { title: 'Articles', href: '/articles' },
  { title: 'About', href: '/about' },
]

export async function Header() {
  const company = await getCompany()
  const monogram = companyMonogram(company.name)

  return (
    <header className="bg-surface border-b border-border-default sticky top-0 z-50 shadow-sm">
      {/* Utility top bar */}
      <div className="bg-primary text-[rgb(var(--color-text-inverse))]">
        <div className="container-wide">
          <div className="flex items-center justify-between py-1 sm:py-1.5 text-[10px] sm:text-xs md:text-sm">
            <span className="font-heading italic tracking-wide truncate max-w-[60%] sm:max-w-none">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <div className="flex items-center gap-6">
              <Link href="/contact" className="hover:opacity-90 transition-opacity">
                Contact
              </Link>
              <Link href="/faq" className="hover:opacity-90 transition-opacity">
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container-wide">
        <div className="flex items-center justify-between py-4 md:py-5 gap-4">
          <Link href="/" className="flex items-center gap-3 md:gap-4 group min-w-0">
            <SafeImage
              src={company.logoUrl}
              alt=""
              kind="logo"
              monogram={monogram}
              enforceAspect
              className="h-10 w-10 md:h-12 md:w-12 rounded-md overflow-hidden flex-shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-base sm:text-lg md:text-2xl font-heading font-semibold text-text tracking-tight truncate">
                {company.name}
              </span>
              {company.tagline && (
                <span className="text-[10px] sm:text-[11px] md:text-xs text-text-muted tracking-[0.2em] uppercase font-medium truncate">
                  {company.tagline}
                </span>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-6 md:gap-8">
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-sm font-medium text-text hover:text-primary transition-colors">
                Home
              </Link>
              {MENU_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-text hover:text-primary transition-colors"
                >
                  {item.title}
                </Link>
              ))}
            </nav>

            <div className="hidden md:block">
              <ThemeToggle variant="icon" />
            </div>

            <div className="hidden md:block">
              <ClientHeader />
            </div>
          </div>

          <MobileNav menuItems={MENU_ITEMS} />
        </div>
      </div>
    </header>
  )
}
