import { afterEach, describe, expect, it, vi } from 'vitest'

describe('proxyMediaUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('returns relative /api/media for backend media URLs', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://3pillars.pythonanywhere.com/api')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://distillery-8eiym2yp3-jbeggs-projects.vercel.app')
    const { proxyMediaUrl } = await import('./media-proxy')

    const src =
      'https://3pillars.pythonanywhere.com/media/media/companies/x/articles/hero-thumb.png'
    const out = proxyMediaUrl(src)

    expect(out.startsWith('/api/media?src=')).toBe(true)
    expect(out).not.toContain('distillery-8eiym2yp3')
    expect(decodeURIComponent(out.split('src=')[1] || '')).toBe(src)
  })

  it('absoluteProxyMediaUrl uses canonical site for OG', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://3pillars.pythonanywhere.com/api')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://distillery-phi.vercel.app')
    const { absoluteProxyMediaUrl } = await import('./media-proxy')

    const src = 'https://3pillars.pythonanywhere.com/media/companies/x/hero.png'
    const out = absoluteProxyMediaUrl(src)

    expect(out).toBe(
      `https://distillery-phi.vercel.app/api/media?src=${encodeURIComponent(src)}`,
    )
  })
})
