import 'server-only'
import { getPageHero } from '@/lib/page-hero'

export const SHARE_IMAGE_FALLBACK = '/favicon.png'

/** Hero image for `slug` if uploaded + enabled, else /favicon.png. */
export async function getShareImage(slug: string): Promise<string> {
  const hero = await getPageHero(slug)
  return hero?.imageUrl ?? SHARE_IMAGE_FALLBACK
}
