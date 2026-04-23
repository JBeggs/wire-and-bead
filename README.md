# Wire and Bead

A Next.js e-commerce storefront (fork of the Past and Present template, brand-neutralised). Branding and **tenant-specific business rules** are read at runtime from django-crm **`SiteSetting`** rows (via `/news/site-settings/`) and normalised through `getCompany()` / `getSiteSetting()` — set `NEXT_PUBLIC_COMPANY_SLUG` to point this app at your tenant. See [PLAN-01-WIRE-AND-BEAD.md](../PLAN-01-WIRE-AND-BEAD.md) for the full contract (policy keys, money/locale helpers, `storefront_shelves` JSON).

## Overview

This storefront is a multi-tenant template. Install-time setup (`/admin/setup` on first login) creates the Company record; all pages then render with that brand's data. The default tenant slug is `wire-and-bead`.

## Feature Breakdown

### E-commerce
- **Products** (`/products`): Browse all products by category and search. **Shelf chips** (Featured, Vintage, etc.) render only when django-crm exposes a public JSON `SiteSetting` key `storefront_shelves` — there is **no** hardcoded tenant taxonomy in this repo (avoids “active in admin but missing on the storefront” bugs). Without that setting, the default view lists all active products.

  Example `storefront_shelves` value (type `json`, `is_public=true`). Each `filter` entry maps to public product list query params:

  ```json
  [
    { "id": "featured", "label": "Featured", "icon": "star", "filter": { "featured": true } },
    { "id": "vintage", "label": "Vintage", "icon": "clock", "filter": { "condition": "vintage", "exclude_featured": true } },
    { "id": "bundles", "label": "Bundles", "icon": "package", "filter": { "bundle_only": true } }
  ]
  ```
- **Cart** (`/cart`): Shopping cart with quantity updates and removal.
- **Checkout** (`/checkout`): Full checkout flow with the tenant’s configured payment gateway (typically Yoco when enabled in django-crm). Delivery options and copy still include integration-specific labels where the UI is not yet fully driven by `SiteSetting` — see PLAN-01 for the target end state.
- **Admin Inventory** (`/admin/inventory`): Product CRUD, category manager, **product export (CSV)**. Admin and business_owner roles only.
- **Admin Orders** (`/admin/orders`): Order list with status filter, Create Shipment for paid orders (Courier Guy integration).

### Articles & Content
- **Articles** (`/articles`): Public article list with category filter and search. Categories fetched from backend. Article cards show image, category, excerpt, date, author.
- **Article Detail** (`/articles/[slug]`): Full article view with featured image, HTML content, tags, author, published date.
- **Home**: Featured products, vintage/new sections, latest articles. Content from Django CRM.

### Auth & Profile
- **Login** (`/login`), **Register** (`/register`): JWT auth via Django.
- **Profile** (`/profile`): User profile, company info (for business owners).

### Static Pages
- About, Contact, FAQ, Terms, Privacy, Returns, Shipping

## Articles Page

The articles page (`/articles`) supports:

- **Category filter**: Pills for "All" and each category from `/news/categories/`. Active category highlighted. URL: `?category=<id>`.
- **Search**: Form submits to `?search=<query>`. Preserves category when searching.
- **Empty state**: "No articles match your filters" when filtered; "Clear filters" link.

Articles are fetched from `/news/articles/` with `status=published`, `category`, and `search` params.

## Features

- **Hybrid Theme**: Vintage olive/cream colors for second-hand items, modern navy/gold for new products
- **E-commerce**: Full shopping cart and checkout with Yoco payments
- **Content Management**: Articles and content pages managed via Django CRM backend
- **Authentication**: User registration and login
- **Responsive Design**: Mobile-first approach with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS with custom vintage/modern theme
- **Backend**: Django CRM API (shared with other sites)
- **Payments**: Yoco integration
- **Fonts**: Inter (body), Playfair Display (headings)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` from template:
   ```bash
   cp env-template.txt .env.local
   ```

3. Configure environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://3pillars.pythonanywhere.com/api
   NEXT_PUBLIC_COMPANY_SLUG=wire-and-bead
   ```

4. Run development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3001](http://localhost:3001)

## Project Structure

```
wire-and-bead/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── products/        # Product listing and detail pages
│   │   ├── articles/        # Article/blog pages
│   │   ├── cart/            # Shopping cart
│   │   ├── checkout/        # Checkout flow
│   │   └── ...              # Other pages
│   ├── components/          # React components
│   │   ├── layout/          # Header, Footer, Navigation
│   │   ├── ui/              # Toast, Modal, etc.
│   │   └── ...
│   ├── contexts/            # React contexts (Auth, Toast)
│   ├── lib/                 # API client, types, utilities
│   └── styles/              # Global CSS
├── public/                  # Static assets
└── ...config files
```

## Color Palette

### Vintage Section
- Primary: Olive Green `#2C5F2D`
- Background: Cream `#FAF5E9`
- Accent: Terracotta `#B85042`

### Modern Section
- Primary: Navy Blue `#002349`
- Background: Light Gray `#F1F1F2`
- Accent: Gold `#D4AF37`

## Product Data: SKU

- **SKU** is an optional field on each product. Store owners enter it when creating/editing products in the Product Form.
- SKU is stored in the database, shown in admin inventory and product detail pages, and included in CSV export.
- **Yoco does not use SKU** — the payment integration sends only the order total to Yoco, not line items or SKUs. SKU is for internal record-keeping and order history (OrderItem.product_sku).

## Backend Requirements

This site connects to the Django CRM backend. Ensure:

1. Company `wire-and-bead` is registered in the backend (or run the first-login `/admin/setup` wizard to create it)
2. Products are created with `is_vintage` flag for categorization
3. Articles are created for content pages (home, about, etc.)
4. Yoco integration is configured for payments
5. Courier Guy credentials (optional) for Pudo locations and shipment creation

## Routes

### Public
- `/` - Home (featured products, vintage/new, latest articles)
- `/products` - Product listing (filter: condition, category, search)
- `/products/[slug]` - Product detail
- `/articles` - Article listing (filter: category, search)
- `/articles/[slug]` - Article detail
- `/about`, `/contact`, `/faq`, `/terms`, `/privacy`, `/returns`, `/shipping` - Static pages

### Auth
- `/login`, `/register` - Authentication

### Protected (authenticated)
- `/cart` - Shopping cart
- `/checkout` - Checkout
- `/profile` - User profile

### Admin (admin or business_owner)
- `/admin/inventory` - Product and category management, CSV export
- `/admin/orders` - Order list, Create Shipment (Courier Guy)

## Scripts

- `npm run dev` - Start development server (port 3001)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
