/**
 * API Client for Django REST API
 * Adapted from Riverside Herald for the Wire and Bead storefront
 */
import type { ShippingQuoteData } from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://3pillars.pythonanywhere.com/api'
const DEFAULT_COMPANY_SLUG = process.env.NEXT_PUBLIC_COMPANY_SLUG || 'wire-and-bead'

export interface ApiError {
  message: string
  code?: string
  details?: any
  url?: string
  status?: number
}

export class ApiClient {
  private baseURL: string
  private token: string | null = null
  private companyId: string | null = null
  private refreshToken: string | null = null
  private isRefreshing: boolean = false
  private refreshPromise: Promise<string | null> | null = null

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
    if (typeof window !== 'undefined') {
      try {
        this.refreshToken = localStorage.getItem('refresh_token')
      } catch (e) {
        console.warn('localStorage is not accessible:', e)
        this.refreshToken = null
      }
    }
  }

  setToken(token: string | null) {
    this.token = token
    if (typeof window !== 'undefined') {
      try {
        const isSecure = window.location.protocol === 'https:'
        // Use a longer max-age for the access token to avoid frequent refreshes
        // and ensure it's not session-only. Also add explicit expires for Safari.
        const maxAge = 31536000
        const expiryDate = new Date(Date.now() + maxAge * 1000).toUTCString()
        const cookieBase = `; path=/; max-age=${maxAge}; expires=${expiryDate}; SameSite=Lax${isSecure ? '; Secure' : ''}`
        
        if (token) {
          if (token.length > 3800) {
            console.warn('Auth token is large and may exceed Safari cookie limits:', token.length)
          }
          localStorage.setItem('auth_token', token)
          document.cookie = `auth_token=${token}${cookieBase}`
        } else {
          localStorage.removeItem('auth_token')
          document.cookie = `auth_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT${isSecure ? '; Secure' : ''}`
        }
      } catch (e) {
        console.warn('Storage is not accessible for setting token:', e)
      }
    }
  }

  setRefreshToken(refreshToken: string | null) {
    this.refreshToken = refreshToken
    if (typeof window !== 'undefined') {
      try {
        const isSecure = window.location.protocol === 'https:'
        // Refresh tokens should last a long time (1 year)
        const maxAge = 31536000
        const expiryDate = new Date(Date.now() + maxAge * 1000).toUTCString()
        const cookieBase = `; path=/; max-age=${maxAge}; expires=${expiryDate}; SameSite=Lax${isSecure ? '; Secure' : ''}`
        
        if (refreshToken) {
          if (refreshToken.length > 3800) {
            console.warn('Refresh token is large and may exceed Safari cookie limits:', refreshToken.length)
          }
          localStorage.setItem('refresh_token', refreshToken)
          document.cookie = `refresh_token=${refreshToken}${cookieBase}`
        } else {
          localStorage.removeItem('refresh_token')
          document.cookie = `refresh_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT${isSecure ? '; Secure' : ''}`
        }
      } catch (e) {
        console.warn('Storage is not accessible for setting refresh token:', e)
      }
    }
  }

  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null
    return null
  }

  getRefreshToken(): string | null {
    if (this.refreshToken) return this.refreshToken
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('refresh_token') || this.getCookie('refresh_token')
      } catch {
        return this.getCookie('refresh_token')
      }
    }
    return null
  }

  private async attemptTokenRefresh(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      return null
    }

    this.isRefreshing = true
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseURL}/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.access) {
            this.setToken(data.access)
            // Backend rotates refresh tokens; store new one if returned
            if (data.refresh) {
              this.setRefreshToken(data.refresh)
            }
            return data.access
          }
        } else {
          this.setToken(null)
          this.setRefreshToken(null)
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
          return null
        }
      } catch (error) {
        console.error('Token refresh failed:', error)
        this.setToken(null)
        this.setRefreshToken(null)
        return null
      } finally {
        this.isRefreshing = false
        this.refreshPromise = null
      }
      return null
    })()

    return this.refreshPromise
  }

  getToken(): string | null {
    if (this.token) return this.token
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('auth_token') || this.getCookie('auth_token')
      } catch {
        return this.getCookie('auth_token')
      }
    }
    return null
  }

  setCompanyId(companyId: string | null) {
    this.companyId = companyId
    if (typeof window !== 'undefined') {
      try {
        const isSecure = window.location.protocol === 'https:'
        const maxAge = 31536000
        const expiryDate = new Date(Date.now() + maxAge * 1000).toUTCString()
        const cookieBase = `; path=/; max-age=${maxAge}; expires=${expiryDate}; SameSite=Lax${isSecure ? '; Secure' : ''}`
        
        if (companyId) {
          localStorage.setItem('company_id', companyId)
          document.cookie = `company_id=${companyId}${cookieBase}`
        } else {
          localStorage.removeItem('company_id')
          document.cookie = `company_id=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT${isSecure ? '; Secure' : ''}`
        }
      } catch (e) {
        console.warn('Storage is not accessible for setting company id:', e)
      }
    }
  }

  getCompanyId(): string | null {
    if (this.companyId) return this.companyId
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('company_id') || this.getCookie('company_id')
      } catch {
        return this.getCookie('company_id')
      }
    }
    return null
  }

  private getHeaders(includeAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (includeAuth) {
      const token = this.getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    const companyId = this.getCompanyId()
    if (companyId) {
      headers['X-Company-Id'] = companyId
    }
    
    headers['X-Company-Slug'] = DEFAULT_COMPANY_SLUG

    return headers
  }

  private async handleResponse<T>(response: Response, retryRequest?: () => Promise<Response>): Promise<T> {
    if (!response.ok) {
      if (response.status === 401 && this.getRefreshToken() && retryRequest) {
        const newToken = await this.attemptTokenRefresh()
        if (newToken) {
          const retryResponse = await retryRequest()
          return this.handleResponse<T>(retryResponse)
        }
      }

      let error: ApiError
      const contentType = response.headers.get('content-type') || ''
      const hasJsonContent = contentType.includes('application/json')
      const text = await response.text()
      
      try {
        let data: any = {}
        
        if (hasJsonContent && text.trim()) {
          try {
            data = JSON.parse(text)
          } catch {
            data = { message: text || `HTTP ${response.status}: ${response.statusText}` }
          }
        } else if (text.trim()) {
          data = { message: text }
        } else {
          data = { message: `HTTP ${response.status}: ${response.statusText}` }
        }
        
        let message = 'An error occurred'
        
        const hasFieldErrors = Object.keys(data).some(key => 
          key !== 'error' && key !== 'detail' && key !== 'message' && 
          (Array.isArray(data[key]) || typeof data[key] === 'string')
        )
        
        if (hasFieldErrors) {
          const errorFields = Object.entries(data)
            .filter(([key]) => key !== 'error' && key !== 'detail' && key !== 'message')
            .map(([field, messages]: [string, any]) => {
              const messageArray = Array.isArray(messages) ? messages : [messages]
              const formattedField = field.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')
              return `${formattedField}: ${messageArray.join(', ')}`
            })
          message = errorFields.join('; ')
        } else if (data.error) {
          if (typeof data.error === 'object' && data.error !== null) {
            const errorFields = Object.entries(data.error).map(([field, messages]: [string, any]) => {
              const messageArray = Array.isArray(messages) ? messages : [messages]
              return `${field}: ${messageArray.join(', ')}`
            })
            message = errorFields.join('; ')
          } else if (typeof data.error === 'string') {
            message = data.error
          }
        } else {
          message = data.message || data.detail || `HTTP ${response.status}: ${response.statusText}`
        }
        
        error = {
          message,
          code: data.code || `HTTP_${response.status}`,
          details: Object.keys(data).length > 0 ? data : undefined,
          url: response.url,
          status: response.status,
        }
      } catch {
        error = {
          message: `HTTP ${response.status}: ${response.statusText}`,
          code: `HTTP_${response.status}`,
          url: response.url,
          status: response.status,
        }
      }
      throw error
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    }
    return await response.text() as unknown as T
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const makeRequest = () => fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    })

    const response = await makeRequest()
    return this.handleResponse<T>(response, makeRequest)
  }

  async post<T>(endpoint: string, data?: any, includeAuth: boolean = true): Promise<T> {
    const makeRequest = () => fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(includeAuth),
      body: data ? JSON.stringify(data) : undefined,
    })

    const response = await makeRequest()
    return this.handleResponse<T>(response, makeRequest)
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const makeRequest = () => fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })

    const response = await makeRequest()
    return this.handleResponse<T>(response, makeRequest)
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const makeRequest = () => fetch(`${this.baseURL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })

    const response = await makeRequest()
    return this.handleResponse<T>(response, makeRequest)
  }

  async delete<T>(endpoint: string, data?: Record<string, any>): Promise<T> {
    const makeRequest = () => {
      const options: RequestInit = {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
      
      if (data) {
        options.headers = {
          ...options.headers,
          'Content-Type': 'application/json',
        }
        options.body = JSON.stringify(data)
      }

      return fetch(`${this.baseURL}${endpoint}`, options)
    }

    const response = await makeRequest()
    return this.handleResponse<T>(response, makeRequest)
  }

  async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    const makeRequest = () => {
      const formData = new FormData()
      formData.append('file', file)
      
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, String(value))
        })
      }

      const headers: HeadersInit = {}
      const token = this.getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const companyId = this.getCompanyId()
      if (companyId) {
        headers['X-Company-Id'] = companyId
      }
      headers['X-Company-Slug'] = DEFAULT_COMPANY_SLUG

      return fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      })
    }

    const response = await makeRequest()
    return this.handleResponse<T>(response, makeRequest)
  }

  /** Upload multiple files (e.g. for ecommerce product images). Uses files[] key. */
  async uploadMultipleFiles<T>(endpoint: string, files: File[]): Promise<T> {
    const makeRequest = () => {
      const formData = new FormData()
      files.forEach((file) => formData.append('files[]', file))

      const headers: HeadersInit = {}
      const token = this.getToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
      const companyId = this.getCompanyId()
      if (companyId) headers['X-Company-Id'] = companyId
      headers['X-Company-Slug'] = DEFAULT_COMPANY_SLUG

      return fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      })
    }
    const response = await makeRequest()
    return this.handleResponse<T>(response, makeRequest)
  }
}

// Create singleton instance
export const apiClient = new ApiClient()

// Auth API methods
export const authApi = {
  async login(username: string, password: string) {
    const response = await apiClient.post<{
      access: string
      refresh: string
      user: any
      company?: { id: string; name: string }
    }>('/auth/login/', { username, password, company_slug: DEFAULT_COMPANY_SLUG }, false)

    if (response.access) {
      apiClient.setToken(response.access)
      if (response.refresh) {
        apiClient.setRefreshToken(response.refresh)
      }
      if (response.company?.id) {
        apiClient.setCompanyId(response.company.id)
      }
    }

    return response
  },

  async register(data: {
    email: string
    password: string
    company_name?: string
    company_email?: string
    full_name?: string
    phone?: string
    password_confirm?: string
    role?: string
  }) {
    // Customer registration only - do NOT pass company_name. That would trigger
    // BusinessRegistration and create News Profile + new company.
    const requestData: any = {
      email: data.email,
      password: data.password,
      password_confirm: data.password_confirm || data.password,
      company_slug: DEFAULT_COMPANY_SLUG,
      phone: data.phone || '',
    }
    
    if (data.company_name) {
      const emailPrefix = data.email.split('@')[0]
      const timestamp = Date.now().toString().slice(-6)
      requestData.username = `${emailPrefix}${timestamp}`
      requestData.company_name = data.company_name
      requestData.company_email = data.company_email || data.email
      
      if (data.full_name) {
        const nameParts = data.full_name.trim().split(/\s+/)
        requestData.first_name = nameParts[0] || ''
        requestData.last_name = nameParts.slice(1).join(' ') || ''
      }
    } else {
      if (data.full_name) {
        const nameParts = data.full_name.trim().split(/\s+/)
        requestData.first_name = nameParts[0] || ''
        requestData.last_name = nameParts.slice(1).join(' ') || ''
      }
      if (data.role) {
        requestData.role = data.role
      }
    }
    
    const response = await apiClient.post<{
      user: any
      company: { id: string; name: string }
      tokens?: { access: string; refresh: string }
      profile?: { role: string; is_verified: boolean }
    }>('/auth/register/', requestData, false)

    if (response.tokens?.access) {
      apiClient.setToken(response.tokens.access)
      if (response.company?.id) {
        apiClient.setCompanyId(response.company.id)
      }
    }

    return response
  },

  async refreshToken(refreshToken: string) {
    const response = await apiClient.post<{ access: string; refresh?: string }>(
      '/auth/refresh/',
      { refresh: refreshToken },
      false
    )
    
    if (response.access) {
      apiClient.setToken(response.access)
      // Backend rotates refresh tokens; store new one if returned
      if (response.refresh) {
        apiClient.setRefreshToken(response.refresh)
      }
    }

    return response
  },

  logout() {
    apiClient.setToken(null)
    apiClient.setRefreshToken(null)
    apiClient.setCompanyId(null)
  },
}

// News/Articles API methods
export const newsApi = {
  articles: {
    list: (params?: { status?: string; category?: string; search?: string; page?: number }) =>
      apiClient.get('/news/articles/', params),
    get: (id: string) => apiClient.get(`/news/articles/${id}/`),
    getBySlug: (slug: string) => apiClient.get(`/news/articles/?slug=${slug}`),
    create: (data: any) => apiClient.post('/news/articles/', data),
    update: (id: string, data: any) => apiClient.put(`/news/articles/${id}/`, data),
    patch: (id: string, data: any) => apiClient.patch(`/news/articles/${id}/`, data),
    delete: (id: string) => apiClient.delete(`/news/articles/${id}/`),
    incrementViews: (id: string) => apiClient.post(`/news/articles/${id}/increment_views/`),
  },

  categories: {
    list: () => apiClient.get('/news/categories/'),
    get: (id: string) => apiClient.get(`/news/categories/${id}/`),
  },

  tags: {
    list: () => apiClient.get('/news/tags/'),
    get: (id: string) => apiClient.get(`/news/tags/${id}/`),
  },

  media: {
    list: (params?: { media_type?: string; is_public?: boolean }) =>
      apiClient.get('/news/media/', params),
    get: (id: string) => apiClient.get(`/news/media/${id}/`),
    upload: (file: File, data?: any) => apiClient.uploadFile('/news/media/', file, data),
  },

  siteSettings: {
    list: () => apiClient.get('/news/site-settings/'),
    get: (key: string) => apiClient.get(`/news/site-settings/?key=${key}`),
    create: (data: any) => apiClient.post('/news/site-settings/', data),
    update: (id: string, data: any) => apiClient.put(`/news/site-settings/${id}/`, data),
    delete: (id: string) => apiClient.delete(`/news/site-settings/${id}/`),
  },

  pageHeroes: {
    list: () => apiClient.get('/news/page-heroes/'),
    listForPage: (pageSlug: string) =>
      apiClient.get(`/news/page-heroes/?page_slug=${encodeURIComponent(pageSlug)}`),
    create: (data: {
      page_slug: string
      enabled?: boolean
      image_id?: string | null
      title?: string
      subtitle?: string
      cta_label?: string
      cta_href?: string
    }) => apiClient.post('/news/page-heroes/', data),
    update: (
      id: string,
      data: Partial<{
        enabled: boolean
        image_id: string | null
        title: string
        subtitle: string
        cta_label: string
        cta_href: string
      }>,
    ) => apiClient.patch(`/news/page-heroes/${id}/`, data),
    delete: (id: string) => apiClient.delete(`/news/page-heroes/${id}/`),
  },

  profile: {
    get: () => apiClient.get('/news/profiles/me/'),
    update: (data: any) => apiClient.put('/news/profiles/me/', data),
    patch: (data: any) => apiClient.patch('/news/profiles/me/', data),
  },

  businesses: {
    list: (params?: { search?: string; industry?: string; city?: string; is_verified?: boolean; page?: number }) =>
      apiClient.get('/news/businesses/', params),
    get: (id: string) => apiClient.get(`/news/businesses/${id}/`),
    myBusinesses: () => apiClient.get('/news/businesses/my_businesses/'),
    create: (data: any) => apiClient.post('/news/businesses/', data),
    update: (id: string, data: any) => apiClient.put(`/news/businesses/${id}/`, data),
    patch: (id: string, data: any) => apiClient.patch(`/news/businesses/${id}/`, data),
    delete: (id: string) => apiClient.delete(`/news/businesses/${id}/`),
  },

  // Combined businesses from all sources
  allBusinesses: {
    list: (params?: { search?: string; source?: string; industry?: string; city?: string; is_verified?: boolean; is_active?: boolean; page?: number }) =>
      apiClient.get('/all-businesses/', params),
    get: (id: string) => apiClient.get(`/all-businesses/${id}/`),
    myBusinesses: () => apiClient.get('/all-businesses/my_businesses/'),
    search: (params?: any) => apiClient.get('/all-businesses/search/', params),
    stats: () => apiClient.get('/all-businesses/stats/'),
    byLocation: () => apiClient.get('/all-businesses/by_location/'),
  },
}

// Ecommerce API methods
export const ecommerceApi = {
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
      apiClient.get(`/v1/public/${DEFAULT_COMPANY_SLUG}/products/`, params),
    /** List all products including drafts (for store admin). Uses authenticated /v1/products/ */
    listForAdmin: (params?: { status?: string; category?: string; search?: string; page?: number; featured?: string; limit?: number }) =>
      apiClient.get('/v1/products/', params),
    /** Bulk operations: update, delete (archive), or archive */
    bulk: (data: { operation: 'update' | 'delete' | 'archive'; ids: string[]; data?: Record<string, unknown> }) =>
      apiClient.post('/v1/products/bulk/', data),
    get: (id: string) => apiClient.get(`/v1/products/${id}/`),
    getBySlug: (slug: string) => apiClient.get(`/v1/public/${DEFAULT_COMPANY_SLUG}/products/slug/${slug}/`),
    create: (data: Record<string, unknown>) => apiClient.post('/v1/products/', data),
    update: (id: string, data: Record<string, unknown>) => apiClient.put(`/v1/products/${id}/`, data),
    delete: (id: string) => apiClient.delete(`/v1/products/${id}/`),
    /** Upload product images via ecommerce API (stores in ProductImage, not news Media) */
    uploadImages: (files: File[]) =>
      apiClient.uploadMultipleFiles<{ success: boolean; data: { url: string }[] }>(
        '/v1/products/images/upload-multiple/',
        files
      ),
  },

  categories: {
    list: () => apiClient.get(`/v1/public/${DEFAULT_COMPANY_SLUG}/categories/`),
    /** Authenticated list — same company scope as create/update (avoid relying on public list for admin UI). */
    listForAdmin: (params?: { page?: number }) => apiClient.get('/v1/categories/', params),
    get: (id: string) => apiClient.get(`/v1/categories/${id}/`),
    create: (data: Record<string, unknown>) => apiClient.post('/v1/categories/', data),
    update: (id: string, data: Record<string, unknown>) => apiClient.put(`/v1/categories/${id}/`, data),
    delete: (id: string) => apiClient.delete(`/v1/categories/${id}/`),
  },

  pudo: {
    locations: (params?: { search?: string; postalCode?: string; city?: string; province?: string }) =>
      apiClient.get('/v1/pudo/locations/', params),
  },

  orders: {
    list: (params?: { status?: string; page?: number; limit?: number }) =>
      apiClient.get('/v1/orders/', params),
    /** Customer orders (current user only). Use for profile / non-business flow. */
    myOrders: () => apiClient.get<{ success?: boolean; data?: unknown[] }>('/v1/orders/my-orders/'),
    get: (id: string) => apiClient.get(`/v1/orders/${id}/`),
    create: (data: Record<string, unknown>) => apiClient.post('/v1/orders/', data),
    update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/v1/orders/${id}/`, data),
    updateStatus: (id: string, data: { status: string; notes?: string }) =>
      apiClient.put(`/v1/orders/${id}/status/`, data),
    cancel: (id: string, data: { reason: string; refund?: boolean }) =>
      apiClient.put(`/v1/orders/${id}/cancel/`, data),
    cancelItem: (orderId: string, itemId: string) =>
      apiClient.put(`/v1/orders/${orderId}/items/${itemId}/cancel/`, {}),
    createShipment: (orderId: string) =>
      apiClient.post(`/v1/orders/${orderId}/create-shipment/`, {}),
    trackShipment: (orderId: string) =>
      apiClient.get(`/v1/orders/${orderId}/track-shipment/`),
  },

  cart: {
    get: () => apiClient.get('/v1/carts/me/'),
    addItem: (productId: string, quantity: number) =>
      apiClient.post('/v1/carts/items/', { product_id: productId, quantity }),
    updateItem: (productId: string, quantity: number) =>
      apiClient.patch(`/v1/carts/items/${productId}/`, { quantity }),
    removeItem: (productId: string) =>
      apiClient.delete(`/v1/carts/items/${productId}/`),
    clear: () => apiClient.delete('/v1/carts/me/'),
    updateShipping: (data: { delivery_method?: string; shipping_address?: Record<string, unknown>; pudo_pickup_point?: Record<string, unknown> | object }) =>
      apiClient.put('/v1/carts/me/shipping/', data),
    shippingQuote: (data: {
      shipping_address: Record<string, unknown>
      items?: Array<{ product_id: string; quantity: number }>
      gumtree_fulfillment_method?: 'collect' | 'deliver'
    }) =>
      apiClient.post<ShippingQuoteData | { success?: boolean; data?: ShippingQuoteData }>('/v1/carts/me/shipping-quote/', data),
    /** Get calculated totals for guest cart items (supplier_delivery, supplier_delivery_breakdown). No auth required. */
    quote: (items: Array<{ product_id: string; quantity: number }>) =>
      apiClient.post('/v1/carts/quote/', { items }),
  },

  checkout: {
    initiate: (data: Record<string, unknown>) => apiClient.post('/v1/orders/create-from-cart/', data),
    complete: (orderId: string, paymentData: Record<string, unknown>) =>
      apiClient.post(`/v1/orders/${orderId}/complete/`, paymentData),
  },

  companies: {
    get: (id: string) => apiClient.get(`/v1/companies/${id}/`),
    update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/v1/companies/${id}/`, data),
  },

  countries: {
    list: () => apiClient.get('/v1/countries/'),
  },

  integrationSettings: {
    getMe: () => apiClient.get('/v1/integration-settings/me/'),
    update: (id: string, data: Record<string, unknown>) => apiClient.put(`/v1/integration-settings/${id}/`, data),
  },

  // Yoco payment integration (backend: POST /v1/yoco/orders/{orderId}/yoco-checkout/)
  payments: {
    createCheckout: (orderId: string, options?: { successUrl?: string; cancelUrl?: string }) => {
      const base = typeof window !== 'undefined' ? window.location.origin : ''
      const successUrl = options?.successUrl ?? `${base}/checkout/success`
      const cancelUrl = options?.cancelUrl ?? `${base}/checkout`
      return apiClient.post(`/v1/yoco/orders/${orderId}/yoco-checkout/`, {
        successUrl,
        cancelUrl,
      })
    },
    verifyPayment: (checkoutId: string) =>
      apiClient.get(`/v1/payments/yoco/verify/${checkoutId}/`),
  },
}

export default apiClient
