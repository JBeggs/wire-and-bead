import 'server-only'
import type { ReactNode } from 'react'
import { getPageHero } from '@/lib/page-hero'
import PageHeroView from './PageHeroView'
import { getCompany } from '@/lib/company'

/**
 * Server component that renders an uploaded hero for `pageSlug` when the admin
 * has enabled it and attached an image. Otherwise renders `fallback` so each
 * page can decide what to show by default (e.g. home keeps its company-name
 * layout; inner pages render nothing).
 */
export default async function PageHero({
  pageSlug,
  fallback = null,
}: {
  pageSlug: string
  fallback?: ReactNode
}) {
  const hero = await getPageHero(pageSlug)
  if (!hero?.enabled || !hero.imageUrl) return <>{fallback}</>
  const company = pageSlug === 'home' ? await getCompany() : undefined
  return <PageHeroView hero={hero} pageSlug={pageSlug} company={company} />
}
