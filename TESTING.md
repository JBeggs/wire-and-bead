# Wire and Bead – Testing Guide

Next.js 16 e-commerce and articles site. Consumes Django API. Runs on port 3001.

---

## Quick Start

### Prerequisites

- Node.js 18+
- Django backend running at `http://localhost:8000`

### Run the App Locally

```bash
cd wire-and-bead
npm install

# Create .env.local for local backend
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local

npm run dev
```

- Home: http://localhost:3001
- Products: http://localhost:3001/products
- Contact: http://localhost:3001/contact
- Profile: http://localhost:3001/profile

---

## Integration Testing

### Recommended Tools

- **Vitest** or **Jest** + React Testing Library (Next.js default)
- Mock `next/navigation`, `next/headers`, and API clients

### What to Test

- Client components with `@testing-library/react`
- Server components by rendering (run in Node)
- Mock `fetch` or `serverNewsApi` for pages that fetch from Django
- Loading and error states, not just happy path

### Example Setup

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
# or use next/jest with Jest
```

---

## End-to-End Testing

### Recommended Tool

**Cypress**. Use `baseUrl: 'http://localhost:3001'` in `cypress.config.js`.

### Prerequisites

- Django running at `http://localhost:8000`
- A Company registered with slug `wire-and-bead` (plus test user and sample products)
- **`.env.local`** with `NEXT_PUBLIC_API_URL=http://localhost:8000/api` (required; Next.js reads this at build time, so the dev server must be started with it for E2E)

### Seed Django Test Data

Register the tenant via the first-login `/admin/setup` wizard or an admin fixture, then create a test user (`testuser`/`testpass`) and at least one published product for the `wire-and-bead` company.

### Run E2E Tests

1. Ensure `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000/api` (see Quick Start)
2. Start Django: `python manage.py runserver 8000`
3. Start Next.js: `cd wire-and-bead && npm run dev` (port 3001)
4. Run Cypress:

```bash
cd wire-and-bead
npm run test:e2e        # Headless run (CI-friendly)
npm run test:e2e:open   # Open Cypress UI for interactive debugging
```

### E2E Environment Variables

- `CYPRESS_TEST_USER` (default: testuser)
- `CYPRESS_TEST_PASSWORD` (default: testpass)

### Critical Flows to Test

- Auth: login, logout, register
- Products list and detail
- Cart and checkout
- Profile (orders, business profile, site settings)
- Contact page (data from API)

### data-cy Attributes

| Attribute | Location |
|-----------|----------|
| `login-username` | Login form username input |
| `login-password` | Login form password input |
| `login-submit` | Login submit button |
| `register-full-name` | Register form full name |
| `register-email` | Register form email |
| `register-password` | Register form password |
| `register-password-confirm` | Register form confirm password |
| `register-submit` | Register submit button |
| `header-user` | Header when logged in |
| `product-card` | Product card (each product) |
| `products-section` | Products page section |
| `products-grid` | Product grid |
| `products-empty` | Empty products state |
| `add-to-cart` | Add to cart button |
| `cart-container` | Cart page container |
| `cart-empty` | Empty cart state |
| `cart-content` | Cart with items |
| `cart-item` | Cart item row |
| `checkout-link` | Proceed to checkout link |
| `checkout-content` | Checkout page content |
| `checkout-form` | Checkout form |
| `checkout-submit` | Checkout submit button |

---

## Best Testing Practices

- Use `next/jest` or Vitest with Next.js config; mock `next/navigation`, `next/headers` when needed
- **Test server components** by rendering them; they run in Node, no browser required
- **Mock `fetch` or `serverNewsApi`** for pages that fetch from Django
- Use `@testing-library/react` with `render`; wrap client components in `Suspense` if needed
- **Test loading and error states**, not just happy path
- **E2E**: test full flows (auth, products, cart, checkout, profile) across pages; use `data-cy` for stable selectors; log in via `cy.request()` + `cy.session()` for speed; use `beforeEach` for shared setup, not `afterEach` for cleanup
- **Avoid testing implementation details**; focus on what the user sees and can do

---

## Learning Focus

- Next.js App Router testing
- Server components vs client components
- Mocking Next.js APIs
- E-commerce flows (products, cart, checkout)
- Profile and site settings forms

---

## Suggested Test Order

1. Add Vitest/Jest + RTL; test one client component
2. Mock API and test a page (e.g. products)
3. Add Cypress; test login and product list
4. Add E2E for cart and checkout
5. Add E2E for profile (business hours, site settings)
6. Test contact page renders data from API
