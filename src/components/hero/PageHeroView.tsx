import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import SafeImage from '@/components/media/SafeImage'
import type { PageHero } from '@/lib/page-hero'
import type { Company } from '@/lib/company-shared'

/** Matches `DefaultHomeHero` / CMS hero so layout does not jump when an image is uploaded. */
const HERO_SECTION_LAYOUT =
  'relative overflow-hidden flex flex-col justify-center min-h-[24rem] sm:min-h-[28rem] md:min-h-[32rem]'

/**
 * Renders the uploaded hero markup for a page. Mirrors the home-page hero
 * styling (full-bleed image + gradient overlay + left-aligned text block) so
 * the admin-uploaded hero drops in seamlessly wherever <PageHero/> is used.
 *
 * **Home (`pageSlug === 'home'`):** Always shows the same primary + secondary
 * CTAs as `DefaultHomeHero` (Shop + Our Story). Optional CMS `cta_label` /
 * `cta_href` renders as an extra control when both are set.
 */
export default function PageHeroView({
  hero,
  pageSlug,
  company,
}: {
  hero: PageHero
  pageSlug: string
  company?: Company
}) {
  const isHome = pageSlug === 'home'
  const hasCta = Boolean(hero.ctaLabel && hero.ctaHref)

  const heading =
    (isHome && (hero.title?.trim() || company?.name)) ||
    (!isHome && hero.title?.trim()) ||
    null

  return (
    <section className={HERO_SECTION_LAYOUT}>
      <div className="absolute inset-0">
        <SafeImage
          src={hero.imageUrl}
          alt=""
          kind="hero"
          fill
          priority
          sizes="100vw"
          className="absolute inset-0"
          imgClassName="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgb(var(--color-primary) / 0.85) 0%, rgb(var(--color-primary) / 0.55) 45%, rgb(var(--color-accent) / 0.55) 100%)',
          }}
          aria-hidden
        />
      </div>

      <div className="relative container-wide py-24 md:py-32 text-[rgb(var(--color-text-inverse))] w-full">
        <div className="max-w-2xl">
          {heading && (
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-heading mb-4">{heading}</h1>
          )}

          {isHome && company ? (
            hero.subtitle?.trim() ? (
              <p className="text-lg md:text-xl opacity-95 mb-8 max-w-xl">{hero.subtitle}</p>
            ) : (
              <>
                {company.tagline && (
                  <p className="text-base md:text-lg uppercase tracking-[0.25em] opacity-90 mb-6">
                    {company.tagline}
                  </p>
                )}
                {company.description && (
                  <p className="text-lg md:text-xl opacity-95 mb-8 max-w-xl">{company.description}</p>
                )}
              </>
            )
          ) : (
            hero.subtitle?.trim() && (
              <p className="text-lg md:text-xl opacity-95 mb-8 max-w-xl">{hero.subtitle}</p>
            )
          )}

          {isHome && (
            <div className="flex flex-wrap gap-4">
              {hasCta && (
                <Link href={hero.ctaHref!} className="btn btn-secondary text-base px-6 py-3">
                  {hero.ctaLabel}
                </Link>
              )}
              <Link href="/products" className="btn btn-accent text-base px-6 py-3">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Shop the Collection
              </Link>
              <Link href="/about" className="btn btn-secondary text-base px-6 py-3">
                Our Story
              </Link>
            </div>
          )}

          {!isHome && hasCta && (
            <div className="flex flex-wrap gap-4">
              <Link href={hero.ctaHref!} className="btn btn-accent text-base px-6 py-3">
                {hero.ctaLabel}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
