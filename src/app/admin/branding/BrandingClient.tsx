'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { newsApi } from '@/lib/api'
import { HEROABLE_PAGES } from '@/lib/hero-pages'
import PageHeroEditor from '@/components/hero/PageHeroEditor'
import type { PageHero } from '@/lib/page-hero'

type ApiImage = { file_url?: string | null; url?: string | null } | null | undefined

type ApiHero = {
  id?: string
  page_slug?: string
  enabled?: boolean
  image?: ApiImage
  title?: string | null
  subtitle?: string | null
  cta_label?: string | null
  cta_href?: string | null
}

function coerceString(v: unknown): string {
  if (typeof v === 'string') return v
  if (v == null) return ''
  return String(v)
}

function normaliseHero(row: ApiHero): PageHero | null {
  if (!row || typeof row !== 'object') return null
  const pageSlug = coerceString(row.page_slug).trim()
  if (!pageSlug) return null
  const image = row.image
  const imageUrl =
    image && typeof image === 'object' ? coerceString(image.file_url ?? image.url) || null : null
  return {
    id: coerceString(row.id),
    pageSlug,
    enabled: Boolean(row.enabled),
    imageUrl,
    title: coerceString(row.title),
    subtitle: coerceString(row.subtitle),
    ctaLabel: coerceString(row.cta_label),
    ctaHref: coerceString(row.cta_href),
  }
}

function unwrapRows(raw: unknown): ApiHero[] {
  if (Array.isArray(raw)) return raw as ApiHero[]
  if (raw && typeof raw === 'object' && 'results' in raw) {
    const r = (raw as { results?: unknown }).results
    return Array.isArray(r) ? (r as ApiHero[]) : []
  }
  return []
}

export default function BrandingClient() {
  const { profile, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()
  const router = useRouter()
  const [heroes, setHeroes] = useState<PageHero[]>([])
  const [loading, setLoading] = useState(true)

  const isAuthorized = profile?.role === 'admin' || profile?.role === 'business_owner'

  const fetchHeroes = useCallback(async () => {
    if (!isAuthorized) return
    setLoading(true)
    try {
      const raw = await newsApi.pageHeroes.list()
      const rows = unwrapRows(raw)
      const normalised = rows
        .map(normaliseHero)
        .filter((row): row is PageHero => row !== null)
      setHeroes(normalised)
    } catch (err) {
      console.error('[BrandingClient] fetch failed:', err)
      showError('Failed to load page heroes.')
      setHeroes([])
    } finally {
      setLoading(false)
    }
  }, [isAuthorized, showError])

  useEffect(() => {
    if (!authLoading && !isAuthorized) {
      router.push('/login')
    }
  }, [authLoading, isAuthorized, router])

  useEffect(() => {
    if (isAuthorized) fetchHeroes()
  }, [isAuthorized, fetchHeroes])

  if (authLoading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-vintage-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-vintage-primary opacity-50" />
      </div>
    )
  }

  const heroBySlug = new Map(heroes.map((h) => [h.pageSlug, h]))

  return (
    <div className="min-h-screen bg-vintage-background pb-20">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="container-wide py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/inventory"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-text-light" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold font-playfair text-text">Branding &amp; Heroes</h1>
              <p className="text-xs text-text-muted uppercase tracking-widest font-bold">
                Upload per-page hero images
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-wide py-8 space-y-6">
        <p className="text-text-muted text-sm max-w-2xl">
          Upload a banner image for any of the pages below. Toggle the hero on to replace that
          page&rsquo;s default header with your uploaded image; toggle it off to fall back to the
          standard layout. Changes go live after saving and refreshing the live page.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16 opacity-50">
            <Loader2 className="w-10 h-10 animate-spin text-vintage-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {HEROABLE_PAGES.map((page) => (
              <PageHeroEditor
                key={page.slug}
                page={page}
                hero={heroBySlug.get(page.slug) ?? null}
                onSaved={async () => {
                  await fetchHeroes()
                  router.refresh()
                }}
                onError={showError}
                onSuccess={showSuccess}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
