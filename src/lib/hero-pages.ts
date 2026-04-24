/**
 * Registry of storefront pages that may render an uploaded hero.
 *
 * The admin Branding & Heroes UI iterates over this list and lets an admin
 * upload/enable a hero per entry. Each page's server component must embed
 * `<PageHero pageSlug="…" />` with a matching `slug` for the upload to actually
 * render on the live site.
 */
export type HeroablePage = {
  /** Must match the `pageSlug` passed to `<PageHero/>` on that route. */
  slug: string
  /** Admin-UI label for this entry. */
  label: string
  /** Public URL path — used by the admin UI to link through to the live page. */
  path: string
  /** Short description shown in the admin UI. */
  description?: string
}

export const HEROABLE_PAGES: readonly HeroablePage[] = [
  {
    slug: 'home',
    label: 'Home',
    path: '/',
    description: 'Top hero on the landing page; falls back to the company name + tagline layout when disabled.',
  },
  {
    slug: 'about',
    label: 'About',
    path: '/about',
    description: 'Optional banner at the top of the About page.',
  },
  {
    slug: 'products',
    label: 'Products',
    path: '/products',
    description: 'Optional banner above the product listing grid.',
  },
  {
    slug: 'contact',
    label: 'Contact',
    path: '/contact',
    description: 'Optional banner above the contact form.',
  },
  {
    slug: 'articles',
    label: 'Articles',
    path: '/articles',
    description: 'Optional banner above the articles listing.',
  },
] as const

export function getHeroablePage(slug: string): HeroablePage | undefined {
  return HEROABLE_PAGES.find((p) => p.slug === slug)
}
