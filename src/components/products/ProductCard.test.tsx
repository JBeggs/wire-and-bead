/**
 * Unit tests for ProductCard component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ProductCard from './ProductCard';
import type { Product } from '@/lib/types';

/** Inline image avoids jsdom network fetches that can exceed the 5s test timeout */
const TEST_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/** No images by default — avoids placeholder / onLoad state updates outside act(). */
const mockGetProductCardImages = vi.fn((): string[] => []);

vi.mock('@/lib/image-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/image-utils')>();
  return {
    ...actual,
    getProductCardImages: (
      ...args: Parameters<typeof actual.getProductCardImages>
    ) => mockGetProductCardImages(...args),
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { role: 'user' } }),
}));
vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('@/lib/api', () => ({
  ecommerceApi: { products: { delete: vi.fn() } },
}));

const baseProduct: Product = {
  id: 'prod-1',
  name: 'Test Product',
  slug: 'test-product',
  price: 49.99,
  quantity: 10,
  track_inventory: true,
  allow_backorder: false,
  is_active: true,
  featured: false,
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  stock_quantity: 10,
  in_stock: true,
};

async function renderProductCard(product: Product) {
  await act(async () => {
    render(<ProductCard product={product} />);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('ProductCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProductCardImages.mockReturnValue([]);
  });

  it('renders product name and price', async () => {
    await renderProductCard(baseProduct);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('R49.99')).toBeInTheDocument();
  });

  it('renders product image when provided', async () => {
    mockGetProductCardImages.mockReturnValue([TEST_IMAGE]);
    const product = { ...baseProduct, image: TEST_IMAGE };
    await renderProductCard(product);
    const img = screen.getByRole('img', { name: 'Test Product' });
    expect(img).toHaveAttribute('src', TEST_IMAGE);
  });

  it('shows Vintage tag when product has vintage tag', async () => {
    const product = { ...baseProduct, tags: ['vintage'] };
    await renderProductCard(product);
    expect(screen.getByText('Vintage')).toBeInTheDocument();
  });

  it('shows New tag when product has no vintage tag', async () => {
    await renderProductCard(baseProduct);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('shows Sale tag when compare_at_price is greater than price', async () => {
    const product = {
      ...baseProduct,
      price: 39.99,
      compare_at_price: 49.99,
    };
    await renderProductCard(product);
    expect(screen.getByText('Sale')).toBeInTheDocument();
  });

  it('does not show Sale tag when compare_at_price is less than or equal to price', async () => {
    const product = {
      ...baseProduct,
      price: 49.99,
      compare_at_price: 49.99,
    };
    await renderProductCard(product);
    expect(screen.queryByText('Sale')).not.toBeInTheDocument();
  });

  it('shows Featured tag when product is featured', async () => {
    const product = { ...baseProduct, featured: true };
    await renderProductCard(product);
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('renders description when provided', async () => {
    const product = { ...baseProduct, description: 'A beautiful vintage item' };
    await renderProductCard(product);
    expect(screen.getByText('A beautiful vintage item')).toBeInTheDocument();
  });

  it('shows "Only X left!" when quantity is low', async () => {
    const product = { ...baseProduct, quantity: 3 };
    await renderProductCard(product);
    expect(screen.getByText('Only 3 left!')).toBeInTheDocument();
  });

  it('shows "Out of stock" when quantity is 0', async () => {
    const product = { ...baseProduct, quantity: 0 };
    await renderProductCard(product);
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });

  it('has data-cy product-card attribute', async () => {
    await renderProductCard(baseProduct);
    const card = document.querySelector('[data-cy="product-card"]');
    expect(card).toBeInTheDocument();
  });
});
