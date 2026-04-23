// TypeScript types for the Wire and Bead e-commerce platform

export type UserRole = 'user' | 'admin' | 'editor' | 'author' | 'business_owner' | 'subscriber'
export type ArticleStatus = 'draft' | 'scheduled' | 'published' | 'archived' | 'featured'
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type ProductCondition = 'new' | 'like_new' | 'good' | 'fair' | 'vintage'

// Profile interface
export interface Profile {
  id: string
  email: string
  username?: string
  full_name?: string
  bio?: string
  avatar_url?: string
  role: UserRole
  is_verified: boolean
  social_links: Record<string, string>
  preferences: Record<string, any>
  last_seen_at?: string
  created_at: string
  updated_at: string
}

// Category for products and articles
export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  color: string
  icon?: string
  parent_id?: string
  is_featured: boolean
  sort_order: number
  created_at: string
  updated_at: string
  parent?: Category
  subcategories?: Category[]
}

// Tag system
export interface Tag {
  id: string
  name: string
  slug: string
  description?: string
  color: string
  usage_count: number
  created_at: string
}

// Media/Gallery system
export interface Media {
  id: string
  filename: string
  original_filename: string
  file_url: string
  thumbnail_url?: string
  media_type: 'image' | 'video' | 'audio' | 'document'
  mime_type: string
  file_size?: number
  width?: number
  height?: number
  alt_text?: string
  caption?: string
  credits?: string
  is_public: boolean
  created_at: string
  updated_at: string
}

// Article for content pages (home, about, recipes, etc.)
export interface Article {
  id: string
  title: string
  slug: string
  subtitle?: string
  excerpt?: string
  content: string
  featured_media_id?: string
  author_id: string
  category_id?: string
  status: ArticleStatus
  is_premium: boolean
  views: number
  likes: number
  read_time_minutes?: number
  published_at?: string
  created_at: string
  updated_at: string
  author?: Profile
  category?: Category
  tags?: Tag[]
  featured_media?: Media
}

// Product for e-commerce
export interface Product {
  id: string
  name: string
  slug: string
  description?: string
  short_description?: string
  long_description?: string
  price: number
  compare_at_price?: number
  cost_price?: number
  sku?: string
  barcode?: string
  quantity: number
  track_inventory: boolean
  allow_backorder: boolean
  weight?: number
  weight_unit?: string
  dimension_length?: number
  dimension_width?: number
  dimension_height?: number
  is_active: boolean
  featured: boolean
  status: 'active' | 'draft' | 'archived'
  color?: string
  category_id?: string
  featured_image_id?: string
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
  canonical_url?: string
  source_url?: string
  supplier_slug?: string | null
  supplier_delivery_cost?: number | null
  free_delivery_threshold?: number | null
  delivery_time?: string | null
  min_quantity?: number | null
  bundle_product_ids?: string[]
  is_bundle?: boolean
  bundle_images?: Array<string | { url?: string }>
  bundle_product_details?: Array<{
    id: string
    name: string
    slug?: string
    image?: string
    images?: Array<string | { url?: string; file_url?: string }>
  }>
  timed_duration_minutes?: number | null
  timed_expires_at?: string | null
  created_at: string
  updated_at: string
  published_at?: string
  category?: Category
  featured_image?: Media
   images?: ProductImage[]
   tags?: string[] | Tag[]
   stock_quantity: number | null
   in_stock: boolean
   image?: string // Flattened image URL for public API
  is_expired?: boolean // Admin: true when product is active but older than product_expiry_days
 }

export interface ProductImage {
  id: string
  product_id: string
  media_id: string
  sort_order: number
  created_at: string
  media?: Media
}

// Shopping Cart
export interface SupplierDeliveryBreakdownItem {
  supplier_slug: string
  supplier_name: string
  delivery_cost: number
  weight_based?: boolean
  total_weight_kg?: number
  free_delivery_threshold?: number
  group_subtotal?: number
  threshold_met?: boolean
  amount_to_free_delivery?: number
}

export interface CartItem {
  id: string
  product_id: string
  product_name?: string
  product_image?: string
  product_sku?: string
  quantity: number
  price: number
  cost_price?: number | null
  subtotal: number
  min_quantity?: number
  is_bundle?: boolean
  bundle_product_ids?: string[]
  timed_expires_at?: string | null
  bundle_product_details?: Array<{
    id: string
    name: string
    slug?: string
    image?: string
    images?: Array<string | { url?: string; file_url?: string }>
  }>
  bundle_images?: Array<string | { url?: string }>
  supplier_slug?: string | null
  supplierSlug?: string | null  // API may return camelCase
  supplier_delivery_cost?: number | null
  free_delivery_threshold?: number | null
  stock_quantity?: number | null
  featured?: boolean
  gumtree_origin_complete?: boolean
  created_at: string
  product?: Product
}

export interface Cart {
  id: string
  user_id?: string
  session_id?: string
  items: CartItem[]
  subtotal: number
  supplier_delivery?: number
  supplier_delivery_breakdown?: SupplierDeliveryBreakdownItem[]
  tax: number
  shipping: number
  discount?: number
  total: number
  currency?: string
  created_at: string
  updated_at: string
}

export interface CollectionAddress {
  display?: string
  street_address?: string
  suburb?: string
  city?: string
  postal_code?: string
  province?: string
}

export interface ShippingQuoteData {
  rates?: Array<Record<string, unknown>>
  fallback?: boolean
  courier_guy_not_needed?: boolean
  message?: string
  standard_rate?: number
  express_rate?: number
  pudo_available?: boolean
  collection_address?: CollectionAddress | null
}

/**
 * Split fulfillment payload for checkout when cart has both Gumtree and other Courier Guy items.
 *
 * - gumtree_fulfillment_method: 'collect' | 'deliver'
 *   - Required when cart has Gumtree items.
 *   - 'collect' = Gumtree items collected in-store (no courier cost for Gumtree).
 *   - 'deliver' = Gumtree items shipped via Courier Guy (included in courier quote).
 *
 * - courier_fulfillment_method: 'standard' | 'express' | 'pudo'
 *   - Required when cart has non-Gumtree Courier Guy items (temu, aliexpress, ubuy).
 *   - Used for Courier Guy delivery of import items.
 *
 * - supplier_delivery: number (existing)
 * - courier_guy_shipping: number
 *   - When gumtree_fulfillment_method='collect': cost for non-Gumtree parcels only.
 *   - When gumtree_fulfillment_method='deliver': full courier cost (all parcels).
 *
 * - fulfillment_split: persisted on order
 *   - { gumtree: 'collect'|'deliver', other_courier: 'standard'|'express'|'pudo' }
 */
export type GumtreeFulfillmentMethod = 'collect' | 'deliver'
export type CourierFulfillmentMethod = 'standard' | 'express' | 'pudo'

export interface CheckoutFulfillmentPayload {
  gumtree_fulfillment_method?: GumtreeFulfillmentMethod
  courier_fulfillment_method?: CourierFulfillmentMethod
  supplier_delivery: number
  courier_guy_shipping: number
}

// Order
export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  product_sku?: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  product?: Product
}

export interface Order {
  id: string
  order_number: string
  user_id?: string
  status: OrderStatus
  payment_status: PaymentStatus
  
  // Customer info
  customer_email: string
  customer_name: string
  customer_phone?: string
  
  // Shipping address
  shipping_address_line1: string
  shipping_address_line2?: string
  shipping_city: string
  shipping_state?: string
  shipping_postal_code: string
  shipping_country: string
  
  // Billing address (if different)
  billing_same_as_shipping: boolean
  billing_address_line1?: string
  billing_address_line2?: string
  billing_city?: string
  billing_state?: string
  billing_postal_code?: string
  billing_country?: string
  
  // Totals
  subtotal: number
  tax: number
  shipping_cost: number
  discount: number
  total: number
  
  // Payment
  payment_method?: string
  payment_reference?: string
  paid_at?: string
  
  // Shipping
  shipping_method?: string
  tracking_number?: string
  shipped_at?: string
  delivered_at?: string
  
  // Notes
  customer_notes?: string
  internal_notes?: string
  
  created_at: string
  updated_at: string
  
  items?: OrderItem[]
  user?: Profile
}

// Site settings
export interface SiteSetting {
  key: string
  value: any
  type: 'string' | 'number' | 'boolean' | 'json'
  description?: string
  updated_at: string
}

// API Response types
export interface PaginatedResponse<T> {
  results: T[]
  count: number
  next?: string
  previous?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Cart management types
export interface AddToCartRequest {
  product_id: string
  quantity: number
}

export interface UpdateCartItemRequest {
  quantity: number
}

// Checkout types
export interface CheckoutRequest {
  customer_email: string
  customer_name: string
  customer_phone?: string
  shipping_address_line1: string
  shipping_address_line2?: string
  shipping_city: string
  shipping_state?: string
  shipping_postal_code: string
  shipping_country: string
  billing_same_as_shipping: boolean
  billing_address_line1?: string
  billing_address_line2?: string
  billing_city?: string
  billing_state?: string
  billing_postal_code?: string
  billing_country?: string
  customer_notes?: string
  shipping_method?: string
}

// Yoco payment types
export interface YocoCheckoutResponse {
  id: string
  redirectUrl: string
  status: string
}

export interface YocoPaymentVerification {
  status: 'successful' | 'failed' | 'pending'
  order_id?: string
  payment_reference?: string
  error?: string
}

// Integration settings (Yoco + Courier Guy) for business owners
export interface IntegrationSettings {
  id: string
  company?: string
  company_name?: string
  payment_gateway?: string
  yoco_public_key?: string
  yoco_secret_key?: string
  yoco_webhook_secret?: string
  yoco_sandbox_mode?: boolean
  courier_service?: string
  courier_guy_api_key?: string
  courier_guy_api_secret?: string
  courier_guy_account_number?: string
  courier_guy_sandbox_mode?: boolean
  payment_gateway_settings?: Record<string, unknown>
  courier_settings?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface IntegrationSettingsUpdatePayload {
  yoco_public_key?: string
  yoco_secret_key?: string
  yoco_webhook_secret?: string
  yoco_sandbox_mode?: boolean
  courier_guy_api_key?: string
  courier_guy_api_secret?: string
  courier_guy_account_number?: string
  courier_guy_sandbox_mode?: boolean
}
