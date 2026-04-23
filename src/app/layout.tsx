import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Cormorant_Garamond, Inter, Nunito, Playfair_Display } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { CartProvider } from '@/contexts/CartContext'
import { CompanyProvider } from '@/contexts/CompanyContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import {
  DEFAULT_THEME,
  THEMES,
  THEME_BOOTSTRAP_SCRIPT,
  type Theme,
} from '@/contexts/theme-config'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getCompany } from '@/lib/company'

// Header/Footer/metadata all read cookies or live company data.
export const dynamic = 'force-dynamic'

function resolveMetadataBase(): URL | undefined {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
  if (site) {
    try {
      const normalized = site.endsWith('/') ? site.slice(0, -1) : site
      return new URL(normalized)
    } catch {
      /* ignore */
    }
  }
  if (process.env.VERCEL_URL) {
    try {
      const host = process.env.VERCEL_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')
      return new URL(`https://${host}`)
    } catch {
      return undefined
    }
  }
  return undefined
}

// All three theme font pairs load together so the toggle is instant. Each
// `next/font` instance exposes a CSS variable that the theme tokens refer to.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' })
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
})
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' })

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = resolveMetadataBase()
  try {
    const company = await getCompany()
    const title = company.tagline ? `${company.name} | ${company.tagline}` : company.name
    return {
      ...(metadataBase ? { metadataBase } : {}),
      title,
      description: company.description,
      icons: { icon: '/favicon.png' },
      openGraph: {
        title,
        description: company.description,
        type: 'website',
        images: company.ogImageUrl ? [{ url: company.ogImageUrl }] : ['/api/og-default'],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: company.description,
        images: [company.ogImageUrl ?? '/api/og-default'],
      },
    }
  } catch {
    return {
      ...(metadataBase ? { metadataBase } : {}),
      title: 'Your Store',
      description: 'Discover our collection.',
      icons: { icon: '/favicon.png' },
    }
  }
}

function readThemeCookie(value: string | undefined): Theme {
  if (value && (THEMES as readonly string[]).includes(value)) return value as Theme
  return DEFAULT_THEME
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [cookieStore, company] = await Promise.all([cookies(), getCompany()])
  const initialTheme = readThemeCookie(cookieStore.get('site_theme')?.value)
  const fontClassNames = `${inter.variable} ${playfair.variable} ${cormorant.variable} ${nunito.variable}`

  return (
    <html
      lang="en"
      data-theme={initialTheme}
      className={fontClassNames}
      data-scroll-behavior="smooth"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* No-flash theme bootstrap: runs synchronously before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className={`${inter.className} antialiased bg-bg`}>
        <ThemeProvider initialTheme={initialTheme}>
          <CompanyProvider company={company}>
            <ToastProvider>
              <AuthProvider>
                <CartProvider>
                  <div className="min-h-screen flex flex-col">
                    <Header />
                    <main className="flex-1">{children}</main>
                    <Footer />
                  </div>
                </CartProvider>
              </AuthProvider>
            </ToastProvider>
          </CompanyProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}
