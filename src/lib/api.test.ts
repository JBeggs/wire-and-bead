/**
 * API Client unit tests for the storefront
 * Uses mocked fetch; aligns with Django API response shapes
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authApi, apiClient, ecommerceApi } from './api';

const API_BASE = 'http://localhost:8000/api';
const COMPANY_SLUG = 'wire-and-bead';

function createMockResponse(body: Record<string, unknown>, ok = true, status = ok ? 200 : 400) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Bad Request',
    url: `${API_BASE}/auth/login/`,
    headers: {
      get: (name: string) => (name === 'content-type' ? 'application/json' : null),
    },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe('authApi', () => {
  beforeEach(() => {
    authApi.logout();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('POSTs to /auth/login/ with username, password, company_slug', async () => {
      const mockResponse = {
        access: 'new-access',
        refresh: 'new-refresh',
        user: { id: '1', username: 'testuser' },
        company: { id: 'company-1', name: 'Wire and Bead' },
      };
      const fetchMock = vi.fn().mockResolvedValue(createMockResponse(mockResponse));
      vi.stubGlobal('fetch', fetchMock);

      const result = await authApi.login('testuser', 'testpass');

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE}/auth/login/`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            username: 'testuser',
            password: 'testpass',
            company_slug: COMPANY_SLUG,
          }),
        })
      );
      expect(result.access).toBe('new-access');
      expect(result.refresh).toBe('new-refresh');
      expect(apiClient.getToken()).toBe('new-access');
      expect(apiClient.getRefreshToken()).toBe('new-refresh');
      expect(apiClient.getCompanyId()).toBe('company-1');
    });

    it('throws on non-200 response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        createMockResponse({ error: 'Invalid credentials' }, false)
      ));

      await expect(authApi.login('bad', 'bad')).rejects.toThrow();
    });
  });

  describe('register', () => {
    it('POSTs to /auth/register/ and sets tokens.access, tokens.refresh, company.id', async () => {
      const mockResponse = {
        tokens: { access: 'reg-access', refresh: 'reg-refresh' },
        user: { id: '2', email: 'new@test.com' },
        company: { id: 'company-1', name: 'Wire and Bead' },
      };
      const fetchMock = vi.fn().mockResolvedValue(createMockResponse(mockResponse));
      vi.stubGlobal('fetch', fetchMock);

      await authApi.register({
        email: 'new@test.com',
        password: 'pass123',
        password_confirm: 'pass123',
        first_name: 'Test',
        last_name: 'User',
        phone: '+27821234567',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE}/auth/register/`,
        expect.objectContaining({
          method: 'POST',
        }),
      )
      const postInit = fetchMock.mock.calls[0]?.[1] as RequestInit
      const parsed = JSON.parse(String(postInit.body)) as Record<string, string>
      expect(parsed.email).toBe('new@test.com')
      expect(parsed.first_name).toBe('Test')
      expect(parsed.last_name).toBe('User')
      expect(parsed.phone).toBe('+27821234567')
      expect(parsed.company_slug).toBe(COMPANY_SLUG)
      expect(apiClient.getToken()).toBe('reg-access');
      expect(apiClient.getCompanyId()).toBe('company-1');
    });
  });


  describe('checkRegistrationEmail', () => {
    it('POSTs to /auth/check-registration-email/ with normalized email and company_slug', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        createMockResponse({ status: 'existing_can_link' }),
      )
      vi.stubGlobal('fetch', fetchMock)

      const result = await authApi.checkRegistrationEmail('User@Test.COM')

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE}/auth/check-registration-email/`,
        expect.objectContaining({ method: 'POST' }),
      )
      const postInit = fetchMock.mock.calls[0]?.[1] as RequestInit
      const parsed = JSON.parse(String(postInit.body)) as Record<string, unknown>
      expect(parsed.email).toBe('user@test.com')
      expect(parsed.company_slug).toBe(COMPANY_SLUG)
      expect(parsed.linkable).toBe(true)
      expect(result.status).toBe('existing_can_link')
    })

    it('passes linkable: false when requested', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        createMockResponse({ status: 'existing_no_link' }),
      )
      vi.stubGlobal('fetch', fetchMock)

      await authApi.checkRegistrationEmail('biz@test.com', { linkable: false })

      const postInit = fetchMock.mock.calls[0]?.[1] as RequestInit
      const parsed = JSON.parse(String(postInit.body)) as Record<string, unknown>
      expect(parsed.linkable).toBe(false)
    })
  })

  describe('linkTenantAccount', () => {
    it('POSTs to /auth/link-tenant/ and sets tokens on success', async () => {
      const mockResponse = {
        tokens: { access: 'link-access', refresh: 'link-refresh' },
        user: { id: '3', email: 'linked@test.com' },
        company: { id: 'company-1', name: 'Store' },
        account_linked: true,
      }
      const fetchMock = vi.fn().mockResolvedValue(createMockResponse(mockResponse))
      vi.stubGlobal('fetch', fetchMock)

      const result = await authApi.linkTenantAccount({
        email: 'Linked@Test.COM',
        password: 'secret',
      })

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE}/auth/link-tenant/`,
        expect.objectContaining({ method: 'POST' }),
      )
      const postInit = fetchMock.mock.calls[0]?.[1] as RequestInit
      const parsed = JSON.parse(String(postInit.body)) as Record<string, string>
      expect(parsed.email).toBe('linked@test.com')
      expect(parsed.password).toBe('secret')
      expect(parsed.company_slug).toBe(COMPANY_SLUG)
      expect(apiClient.getToken()).toBe('link-access')
      expect(result.account_linked).toBe(true)
    })
  })

  describe('logout', () => {
    it('clears token, refresh token, and company id', async () => {
      const mockResponse = {
        access: 'tok',
        refresh: 'ref',
        user: {},
        company: { id: 'c1' },
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockResponse(mockResponse)));

      await authApi.login('u', 'p');
      expect(apiClient.getToken()).toBeTruthy();
      authApi.logout();
      expect(apiClient.getToken()).toBeNull();
      expect(apiClient.getRefreshToken()).toBeNull();
      expect(apiClient.getCompanyId()).toBeNull();
    });
  });
});

describe('apiClient', () => {
  beforeEach(() => {
    authApi.logout();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('payments.createCheckout (Yoco)', () => {
    it('POSTs to /v1/yoco/orders/{orderId}/yoco-checkout/ with successUrl and cancelUrl', async () => {
      const orderId = 'order-uuid-123'
      const redirectUrl = 'https://payments.yoco.com/checkout/abc'
      const mockResponse = {
        success: true,
        data: { checkoutId: 'abc', redirectUrl, orderId },
      }
      const fetchMock = vi.fn().mockResolvedValue(createMockResponse(mockResponse))
      vi.stubGlobal('fetch', fetchMock)

      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      await authApi.login('u', 'p')
      const result = await ecommerceApi.payments.createCheckout(orderId) as { data?: { data?: { redirectUrl?: string }; redirectUrl?: string } }

      const call = fetchMock.mock.calls.find((c: [string]) => c[0].includes('yoco-checkout'))
      expect(call).toBeDefined()
      expect(call[0]).toContain(`/v1/yoco/orders/${orderId}/yoco-checkout/`)
      const body = JSON.parse((call[1] as RequestInit).body as string)
      expect(body.successUrl).toBe(`${origin}/checkout/success`)
      expect(body.cancelUrl).toBe(`${origin}/checkout`)
      expect((result as { data?: { redirectUrl?: string } })?.data?.redirectUrl).toBe(redirectUrl)
    })

    it('accepts custom successUrl and cancelUrl options', async () => {
      const fetchMock = vi.fn().mockResolvedValue(createMockResponse({ success: true, data: {} }))
      vi.stubGlobal('fetch', fetchMock)
      await authApi.login('u', 'p')

      await ecommerceApi.payments.createCheckout('ord-1', {
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      })

      const call = fetchMock.mock.calls.find((c: [string]) => c[0].includes('yoco-checkout'))
      const body = JSON.parse((call[1] as RequestInit).body as string)
      expect(body.successUrl).toBe('https://example.com/success')
      expect(body.cancelUrl).toBe('https://example.com/cancel')
    })
  })

  describe('request headers', () => {
    it('adds Authorization Bearer and X-Company-Id when authenticated', async () => {
      const loginResponse = {
        access: 'my-token',
        refresh: 'my-refresh',
        user: {},
        company: { id: 'company-123' },
      };
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(createMockResponse(loginResponse))
        .mockResolvedValueOnce(createMockResponse({ data: [] }));
      vi.stubGlobal('fetch', fetchMock);

      await authApi.login('u', 'p');
      await apiClient.get('/v1/products/');

      const getCall = fetchMock.mock.calls.find((c: [string, RequestInit]) =>
        c[0].includes('/v1/products/')
      );
      expect(getCall).toBeDefined();
      expect(getCall[1].headers).toMatchObject(
        expect.objectContaining({
          Authorization: 'Bearer my-token',
          'X-Company-Id': 'company-123',
        })
      );
    });
  });
});
