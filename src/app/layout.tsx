import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { serverNewsApi } from '@/lib/api-server'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { CartProvider } from '@/contexts/CartContext'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

// Force dynamic rendering since we use cookies in Header/Footer
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

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
})

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap'
})

// Get dynamic metadata from database - exported so Next.js calls it (avoids blocking layout)
export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await serverNewsApi.siteSettings.list() as any
    const settingsArray = Array.isArray(settings) ? settings : (settings?.results || [])
    
    function tryParseJSON(value: string) {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }

    const settingsMap = settingsArray.reduce((acc: Record<string, any>, setting: any) => ({
      ...acc,
      [setting.key]: tryParseJSON(setting.value)
    }), {})
    
    const siteName = settingsMap.site_name || 'Past and Present'
    const tagline = settingsMap.site_tagline || 'Vintage & Modern Treasures'
    const description = settingsMap.site_description || 'Discover unique vintage treasures and modern finds. Quality second-hand items and new products, all in one place.'
    const metadataBase = resolveMetadataBase()

    return {
      ...(metadataBase ? { metadataBase } : {}),
      title: `${siteName} | ${tagline}`,
      description,
      icons: {
        icon: '/favicon.png',
      },
      openGraph: {
        title: `${siteName} | ${tagline}`,
        description,
        type: 'website',
      },
    }
  } catch {
    const metadataBase = resolveMetadataBase()
    return {
      ...(metadataBase ? { metadataBase } : {}),
      title: 'Past and Present | Vintage & Modern Treasures',
      description: 'Discover unique vintage treasures and modern finds. Quality second-hand items and new products, all in one place.',
      icons: {
        icon: '/favicon.png',
      },
    }
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} antialiased bg-vintage-background`}>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">
                  {children}
                </main>
                <Footer />
              </div>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}
