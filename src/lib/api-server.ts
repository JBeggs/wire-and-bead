/**
 * Server-side API client for Next.js Server Components
 * Uses cookies for authentication instead of localStorage
 */

import { cookies } from 'next/headers'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://3pillars.pythonanywhere.com/api'
const DEFAULT_COMPANY_SLUG = process.env.NEXT_PUBLIC_COMPANY_SLUG || 'wire-and-bead'

class ServerApiClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async getHeaders(overrides?: Record<string, string>, skipAuth?: boolean): Promise<HeadersInit> {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    const companyId = cookieStore.get('company_id')?.value

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (DEFAULT_COMPANY_SLUG) {
      headers['X-Company-Slug'] = DEFAULT_COMPANY_SLUG
    }

    if (token && !skipAuth) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (companyId) {
      headers['X-Company-Id'] = companyId
    }

    if (overrides) {
      Object.assign(headers, overrides)
    }

    return headers
  }

  private isPublicEndpoint(endpoint: string): boolean {
    return (
      endpoint.includes('/v1/public/') ||
      endpoint.includes('/v1/categories/') ||
      endpoint.includes('/news/') ||
      endpoint.includes('/v1/products/')
    )
  }

  async get<T>(endpoint: string, params?: Record<string, any>, headerOverrides?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const skipAuth = this.isPublicEndpoint(endpoint)
    const headers = await this.getHeaders(headerOverrides, skipAuth)

    let response: Response
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        cache: 'no-store', // Disable caching for authenticated requests
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const cause = err instanceof Error ? err.cause : undefined
      console.error(`[api-server] fetch failed: ${url.toString()}`, { message: msg, cause })
      // Public endpoints: return empty so pages render; others re-throw
      const isPublicEndpoint =
        endpoint.includes('/v1/public/') ||
        endpoint.includes('/v1/categories/') ||
        endpoint.includes('/news/')
      if (isPublicEndpoint) {
        return (endpoint.endsWith('/') || endpoint.includes('?')) ? ([] as unknown as T) : (null as unknown as T)
      }
      throw err
    }

    if (!response.ok) {
      if (response.status === 401) {
        // Only return empty/null if it's not a public-friendly endpoint
        // For now, let's log it but allow the error to propagate if it's not a 401 we want to swallow
        console.warn(`API 401 at ${url.toString()}`)
        
        // If it's a GET request to a potentially public endpoint, we might want to throw 
        // instead of returning empty, so the UI can handle it or we can see the real error.
        // However, the current behavior is to return empty. Let's make it more selective.
        
        const isPublicEndpoint = endpoint.includes('/v1/products/') || 
                                endpoint.includes('/v1/categories/') ||
                                endpoint.includes('/news/')

        if (isPublicEndpoint) {
          // If a public endpoint returns 401, it's likely a backend configuration issue 
          // or it actually requires a token when it shouldn't.
          console.error(`Public endpoint ${endpoint} returned 401 Unauthorized. Please check backend permissions.`);
          if (endpoint.endsWith('/') || endpoint.includes('?')) {
            return [] as unknown as T
          }
          return null as unknown as T
        }

        if (endpoint.endsWith('/') || endpoint.includes('?')) {
          return [] as unknown as T
        }
        return null as unknown as T
      }
      if (response.status === 404) {
        console.warn(`API 404 at ${url.toString()}`)
        /**
         * DRF pagination returns 404 for out-of-range `page` with a JSON body like
         * `{ success: true, data: [...], pagination }` on some deployments, or `{ detail: "..." }`.
         * If the body still includes a `data` array, use it so storefront grids do not go blank.
         */
        const isPublicProductList =
          endpoint.includes('/v1/public/') &&
          endpoint.includes('/products') &&
          !endpoint.includes('/products/slug/')
        if (isPublicProductList) {
          try {
            const body = (await response.clone().json()) as Record<string, unknown>
            if (body && body.success !== false && Array.isArray(body.data)) {
              return body as unknown as T
            }
          } catch {
            /* fall through */
          }
        }
        if (endpoint.endsWith('/') || endpoint.includes('?')) {
          return [] as unknown as T
        }
        return null as unknown as T
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }
}

const serverApiClient = new ServerApiClient()

// Server-side News API
export const serverNewsApi = {
  articles: {
    list: (params?: { status?: string; category?: string; search?: string; page?: number } & Record<string, string | number | undefined>) =>
      serverApiClient.get('/news/articles/', params),
    get: (id: string) => serverApiClient.get(`/news/articles/${id}/`),
    getBySlug: (slug: string) => serverApiClient.get(`/news/articles/?slug=${slug}`),
  },

  categories: {
    list: (params?: { for_articles?: boolean }) =>
      serverApiClient.get(
        '/news/categories/',
        undefined,
        params?.for_articles ? { 'X-Company-Slug': 'riverside-herald' } : undefined
      ),
    get: (id: string) => serverApiClient.get(`/news/categories/${id}/`),
  },

  siteSettings: {
    list: () => serverApiClient.get('/news/site-settings/'),
  },

  pageHeroes: {
    list: () => serverApiClient.get('/news/page-heroes/'),
    listForPage: (pageSlug: string) =>
      serverApiClient.get(`/news/page-heroes/?page_slug=${encodeURIComponent(pageSlug)}`),
  },
}

// Server-side Ecommerce API
export const serverEcommerceApi = {
  products: {
    list: (params?: {
      category?: string
      exclude_category?: string
      search?: string
      page?: number
      page_size?: number
      is_active?: boolean
      featured?: boolean
      exclude_featured?: boolean
      tags?: string
      ordering?: string
      condition?: string
      bundle_only?: boolean | string
      timed_only?: boolean | string
      exclude_bundles?: boolean | string
      exclude_timed?: boolean | string
      exclude_tags?: string
      supplier_slug?: string
      delivery_group?: string
    }) =>
      serverApiClient.get(`/v1/public/${DEFAULT_COMPANY_SLUG}/products/`, params),
    get: (id: string) => serverApiClient.get(`/v1/products/${id}/`),
    getBySlug: (slug: string) => serverApiClient.get(`/v1/public/${DEFAULT_COMPANY_SLUG}/products/slug/${slug}/`),
  },

  categories: {
    list: () => serverApiClient.get(`/v1/public/${DEFAULT_COMPANY_SLUG}/categories/`),
    get: (id: string) => serverApiClient.get(`/v1/categories/${id}/`),
  },
}

export default serverApiClient
