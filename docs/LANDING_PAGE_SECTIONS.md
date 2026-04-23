# Wire and Bead: Landing Page Sections – Vintage Treasures & New Arrivals

This document describes how the Wire and Bead storefront (forked from the Past and Present template) implements the **Vintage Treasures** and **New Arrivals** sections on the landing page.

---

## 1. Landing Page Component

**File:** `src/app/page.tsx`

The landing page is a single Next.js Server Component. It renders all sections directly:

- **Hero Section** (lines 84–106)
- **Featured Treasures** (lines 108–165)
- **Vintage Treasures** (lines 166–223)
- **New Arrivals** (lines 225–279)
- **Stories & Inspiration** (lines 281–322)
- **CTA Section** (lines 324–335)

### Vintage Treasures Section (lines 166–223)

```tsx
<section className="py-16 bg-vintage-background">
  <div className="container-wide">
    <div className="section-header">
      <div>
        <h2 className="section-title">Vintage Treasures</h2>
        <p className="text-text-muted mt-1">Unique second-hand finds with character</p>
      </div>
      <Link href="/products?condition=vintage" className="btn btn-primary">View All …</Link>
    </div>
    {vintageProducts.length > 0 ? (
      <div className="product-grid">
        {vintageProducts.map((product) => (
          <Link key={product.id} href={`/products/${product.slug}`} className="product-card-vintage group">
            …
          </Link>
        ))}
      </div>
    ) : (
      <div className="text-center py-12 text-text-muted">
        <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p>Vintage items coming soon!</p>
      </div>
    )}
  </div>
</section>
```

### New Arrivals Section (lines 225–279)

```tsx
<section className="py-16 bg-modern-background">
  <div className="container-wide">
    <div className="section-header-modern">
      <div>
        <h2 className="section-title">New Arrivals</h2>
        <p className="text-text-muted mt-1">Fresh finds and modern essentials</p>
      </div>
      <Link href="/products?condition=new" className="btn btn-modern">View All …</Link>
    </div>
    {newProducts.length > 0 ? (
      <div className="product-grid">
        {newProducts.map((product) => (
          <Link key={product.id} href={`/products/${product.slug}`} className="product-card-modern group">
            …
          </Link>
        ))}
      </div>
    ) : (
      <div className="text-center py-12 text-text-muted">
        <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p>New products coming soon!</p>
      </div>
    )}
  </div>
</section>
```

- **Vintage Treasures**: `product-card-vintage`, `tag-vintage`
- **New Arrivals**: `product-card-modern`, `tag-new`

---

## 2. Product Filtering by Tags

### Vintage Treasures

**Logic:** Products with the tag `"vintage"` and not featured.

- **API call:** `serverEcommerceApi.products.list()` with:
  - `is_active: true`
  - `exclude_featured: true`
  - `tags: 'vintage'`
  - `page_size: 20`
  - `ordering: 'random'`

- **Post-fetch:**  
  Filter out archived products, then take up to 20 items from the result.

### New Arrivals

**Logic:** Products that are not vintage and not featured.

- **API call:** `serverEcommerceApi.products.list()` with:
  - `is_active: true`
  - `exclude_featured: true`
  - `page_size: 100`
  - No `tags` filter

- **Post-fetch:**
  - Drop archived products.
  - Filter to products whose tags do not include `'vintage'` (handles both `string` and `{ name: string }` shapes).
  - Shuffle with `shuffleArray()`.
  - Slice to 20 items.

### Tag Handling (Client-side)

The frontend treats `tags` as either:

- `string[]`
- `Tag[]` (objects with `{ name: string }`)

Vintage check:

```ts
Array.isArray(p.tags) && p.tags.some((t: string | { name: string }) => 
  (typeof t === 'string' ? t : t.name) === 'vintage'
)
```

---

## 3. Data Structures

### Product (from `src/lib/types.ts`)

```ts
export interface Product {
  id: string
  name: string
  slug: string
  description?: string
  price: number
  compare_at_price?: number
  quantity: number
  is_active: boolean
  featured: boolean
  status: 'active' | 'draft' | 'archived'
  tags?: string[] | Tag[]
  image?: string
  // ... other fields
}
```

### Tag (from `src/lib/types.ts`)

```ts
export interface Tag {
  id: string
  name: string
  slug: string
  description?: string
  color: string
  usage_count: number
}
```

### Vintage vs New

- **Vintage:** Product has a tag whose `name` (or string value) is `'vintage'`.
- **New:** Product has no `'vintage'` tag. This is enforced in the frontend logic, not by a dedicated tag.

---

## 4. API & Data Fetching

### API Client

**File:** `src/lib/api-server.ts`

- **Base URL:** `NEXT_PUBLIC_API_URL` (default: `https://3pillars.pythonanywhere.com/api`)
- **Company slug:** `NEXT_PUBLIC_COMPANY_SLUG` (default: `'wire-and-bead'`)

### Endpoint

```
GET /v1/public/{company_slug}/products/
```

### Parameters

| Parameter        | Type    | Used for Vintage | Used for New |
|-----------------|---------|------------------|--------------|
| `is_active`     | boolean | ✓ `true`         | ✓ `true`     |
| `exclude_featured` | boolean | ✓ `true`      | ✓ `true`     |
| `tags`          | string  | ✓ `'vintage'`    | —            |
| `page_size`     | number  | 20               | 100          |
| `ordering`      | string  | `'random'`       | —            |
| `condition`     | string  | —                | —            |

### Data Fetching Flow

`getHomeData()` in `page.tsx` runs four calls in parallel:

```ts
const [featuredRes, vintageRes, newRes, articlesData] = await Promise.all([
  serverEcommerceApi.products.list({ is_active: true, featured: true, page_size: 100 }),
  serverEcommerceApi.products.list({ is_active: true, exclude_featured: true, tags: 'vintage', page_size: 20, ordering: 'random' }),
  serverEcommerceApi.products.list({ is_active: true, exclude_featured: true, page_size: 100 }),
  serverNewsApi.articles.list({ status: 'published' }),
])
```

Response handling supports:

- Array: `response` itself
- `response.data`
- `response.results`

---

## 5. Related: Products Page Filtering

**File:** `src/app/products/page.tsx`

The `/products` page uses the `condition` query param:

- `?condition=vintage` → title “Vintage Treasures”
- `?condition=new` → title “New Arrivals”

`getProducts()` passes `condition` to the API:

```ts
serverEcommerceApi.products.list({
  is_active: true,
  condition: params.condition,  // 'vintage' or 'new'
  …
})
```

So the backend filters by `condition` on the products listing.

---

## Summary

| Aspect            | Vintage Treasures                     | New Arrivals                                |
|------------------|----------------------------------------|---------------------------------------------|
| **Filter**       | API `tags: 'vintage'`                  | Post-fetch: `!tags.includes('vintage')`      |
| **Source**       | Tag-based on backend                  | Client-side filtering of non-vintage        |
| **Ordering**     | `ordering: 'random'`                   | Shuffled locally                            |
| **Limit**        | 20 (API)                               | 20 (after shuffle and slice)                 |
| **Section link** | `/products?condition=vintage`         | `/products?condition=new`                    |
