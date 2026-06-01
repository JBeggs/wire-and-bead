import type { Metadata, Viewport } from 'next'
import { cookies, headers } from 'next/headers'
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
import { CookieConsentBanner } from '@/components/layout/CookieConsentBanner'
import { getCompany } from '@/lib/company'
import { iconUrl } from '@/lib/icon-cache-version'
import { resolveLocale } from '@/lib/locale'
import { themeFontClasses } from '@/lib/theme-fonts'

/** Default Artisan theme surfaces — address bar tint on iOS / Android Chrome */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF6F0' },
    { media: '(prefers-color-scheme: dark)', color: '#2C1810' },
  ],
}

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

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = resolveMetadataBase()
  try {
    const company = await getCompany()
    const title = company.tagline ? `${company.name} | ${company.tagline}` : company.name
    return {
      ...(metadataBase ? { metadataBase } : {}),
      title,
      description: company.description,
      icons: {
        icon: [
          { url: iconUrl('/icon.png'), sizes: '512x512', type: 'image/png' },
          { url: iconUrl('/favicon.png'), sizes: '32x32', type: 'image/png' },
        ],
        apple: iconUrl('/apple-touch-icon.png'),
      },
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
      icons: {
        icon: [
          { url: iconUrl('/icon.png'), sizes: '512x512', type: 'image/png' },
          { url: iconUrl('/favicon.png'), sizes: '32x32', type: 'image/png' },
        ],
        apple: iconUrl('/apple-touch-icon.png'),
      },
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
  const [cookieStore, company, headersList] = await Promise.all([cookies(), getCompany(), headers()])
  const initialTheme = readThemeCookie(cookieStore.get('site_theme')?.value)
  const { htmlVariables, bodyClassName } = themeFontClasses(initialTheme)
  const pathname = headersList.get('x-pathname') || ''
  const isPrintLabelPage = pathname.includes('/print-label')

  return (
    <html
      lang={resolveLocale(company)}
      data-theme={initialTheme}
      className={htmlVariables}
      data-scroll-behavior="smooth"
    >
      <head>
        <meta name="format-detection" content="telephone=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* No-flash theme bootstrap: runs synchronously before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className={`${bodyClassName} antialiased bg-bg`}>
        <ThemeProvider initialTheme={initialTheme}>
          <CompanyProvider company={company}>
            <ToastProvider>
              <AuthProvider>
                <CartProvider>
                  {isPrintLabelPage ? (
                    children
                  ) : (
                    <div className="min-h-screen flex flex-col">
                      <Header />
                      <main className="flex-1">{children}</main>
                      <Footer />
                    </div>
                  )}
                  {!isPrintLabelPage ? <CookieConsentBanner /> : null}
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
