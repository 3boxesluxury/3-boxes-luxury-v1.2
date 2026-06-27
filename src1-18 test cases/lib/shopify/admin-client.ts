/**
 * Shopify Admin API Client
 * Handles all REST communication with Shopify's Admin API
 * Store: 3boxesluxury-2.myshopify.com
 * API Version: 2025-01
 *
 * This client is used for WRITE operations (create/update/delete products, collections, etc.)
 * The Storefront API client (client.ts) handles READ operations for the storefront.
 */

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '3boxesluxury-2.myshopify.com';
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || '';
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';

const ADMIN_API_BASE = `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}`;

// ==============================
// ERROR TYPES
// ==============================

export class ShopifyAdminError extends Error {
  public status: number;
  public statusText: string;
  public body?: any;

  constructor(status: number, statusText: string, body?: any) {
    const message = body?.errors
      ? typeof body.errors === 'string'
        ? body.errors
        : JSON.stringify(body.errors)
      : `Shopify Admin API error: ${status} ${statusText}`;

    super(message);
    this.name = 'ShopifyAdminError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

// ==============================
// CORE HTTP HELPER
// ==============================

interface AdminRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: any;
  params?: Record<string, string>;
}

async function adminFetch<T = any>(options: AdminRequestOptions): Promise<T> {
  if (!ADMIN_TOKEN) {
    throw new Error(
      'SHOPIFY_ADMIN_TOKEN is not set. Please add it to your .env file.'
    );
  }

  const url = new URL(`${ADMIN_API_BASE}${options.path}`);
  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const fetchOptions: RequestInit = {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_TOKEN,
    },
  };

  if (options.body && (options.method === 'POST' || options.method === 'PUT')) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url.toString(), fetchOptions);

  // For DELETE requests, Shopify returns 200 OK with empty body
  if (options.method === 'DELETE' && response.status === 200) {
    return {} as T;
  }

  const responseBody = await response.json();

  if (!response.ok) {
    throw new ShopifyAdminError(response.status, response.statusText, responseBody);
  }

  return responseBody as T;
}

// ==============================
// TYPE DEFINITIONS — PRODUCTS
// ==============================

export interface ShopifyAdminProductImage {
  id?: number;
  src?: string;
  alt?: string;
  position?: number;
  width?: number;
  height?: number;
  variant_ids?: number[];
}

export interface ShopifyAdminProductVariant {
  id?: number;
  title?: string;
  price?: string;
  compare_at_price?: string;
  sku?: string;
  inventory_quantity?: number;
  weight?: number;
  weight_unit?: 'g' | 'kg' | 'oz' | 'lb';
  inventory_management?: string;
  taxable?: boolean;
  barcode?: string;
  fulfillment_service?: string;
  requires_shipping?: boolean;
  image_id?: number;
  option1?: string;
  option2?: string;
  option3?: string;
  position?: number;
  metafields?: ShopifyAdminMetafield[];
}

export interface ShopifyAdminMetafield {
  namespace: string;
  key: string;
  value: string;
  type: string; // e.g. "single_line_text_field", "json_string", "number_integer"
  description?: string;
}

export interface ShopifyAdminProductInput {
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  tags?: string;
  status?: 'active' | 'archived' | 'draft';
  published?: boolean;
  handle?: string;
  template_suffix?: string;
  published_scope?: string;
  options?: Array<{
    name: string;
    values: string[];
  }>;
  variants?: ShopifyAdminProductVariant[];
  images?: ShopifyAdminProductImage[];
  metafields?: ShopifyAdminMetafield[];
  seo?: {
    title?: string;
    description?: string;
  };
}

export interface ShopifyAdminProductResponse {
  product: {
    id: number;
    title: string;
    body_html: string;
    vendor: string;
    product_type: string;
    created_at: string;
    handle: string;
    updated_at: string;
    published_at: string | null;
    template_suffix: string | null;
    published_scope: string;
    tags: string;
    status: string;
    admin_graphql_api_id: string;
    variants: Array<{
      id: number;
      product_id: number;
      title: string;
      price: string;
      sku: string;
      position: number;
      inventory_policy: string;
      compare_at_price: string | null;
      fulfillment_service: string;
      inventory_management: string;
      option1: string | null;
      option2: string | null;
      option3: string | null;
      created_at: string;
      updated_at: string;
      taxable: boolean;
      barcode: string | null;
      grams: number;
      image_id: number | null;
      weight: number;
      weight_unit: string;
      inventory_item_id: number;
      inventory_quantity: number;
      requires_shipping: boolean;
      admin_graphql_api_id: string;
    }>;
    options: Array<{
      id: number;
      product_id: number;
      name: string;
      position: number;
      values: string[];
    }>;
    images: Array<{
      id: number;
      product_id: number;
      position: number;
      created_at: string;
      updated_at: string;
      alt: string | null;
      width: number;
      height: number;
      src: string;
      variant_ids: number[];
      admin_graphql_api_id: string;
    }>;
    image: {
      id: number;
      product_id: number;
      position: number;
      created_at: string;
      updated_at: string;
      alt: string | null;
      width: number;
      height: number;
      src: string;
      variant_ids: number[];
      admin_graphql_api_id: string;
    } | null;
  };
}

export interface ShopifyAdminProductsListResponse {
  products: Array<ShopifyAdminProductResponse['product']>;
}

// ==============================
// TYPE DEFINITIONS — COLLECTIONS
// ==============================

export interface ShopifyAdminCustomCollectionInput {
  title: string;
  body_html?: string;
  image?: {
    src?: string;
    alt?: string;
  };
  published?: boolean;
  handle?: string;
  sort_order?: string;
  template_suffix?: string;
  metafields?: ShopifyAdminMetafield[];
}

export interface ShopifyAdminCustomCollectionResponse {
  custom_collection: {
    id: number;
    handle: string;
    title: string;
    updated_at: string;
    body_html: string;
    published_at: string | null;
    sort_order: string;
    template_suffix: string | null;
    image: {
      created_at: string;
      alt: string | null;
      height: number;
      src: string;
      width: number;
    } | null;
    published_scope: string;
    admin_graphql_api_id: string;
  };
}

export interface ShopifyAdminCustomCollectionsListResponse {
  custom_collections: Array<ShopifyAdminCustomCollectionResponse['custom_collection']>;
}

// ==============================
// TYPE DEFINITIONS — COLLECTS
// ==============================

export interface ShopifyAdminCollectInput {
  collection_id: number;
  product_id: number;
  position?: number;
  sort_value?: string;
}

export interface ShopifyAdminCollectResponse {
  collect: {
    id: number;
    collection_id: number;
    product_id: number;
    created_at: string;
    updated_at: string;
    position: number;
    sort_value: string;
  };
}

export interface ShopifyAdminCollectsListResponse {
  collects: Array<ShopifyAdminCollectResponse['collect']>;
}

// ==============================
// TYPE DEFINITIONS — SHOP INFO
// ==============================

export interface ShopifyAdminShopResponse {
  shop: {
    id: number;
    name: string;
    email: string;
    domain: string;
    province: string;
    country: string;
    address1: string;
    zip: string;
    city: string;
    phone: string | null;
    primary_locale: string;
    country_code: string;
    country_name: string;
    currency: string;
    customer_email: string | null;
    latitude: number;
    longitude: number;
    money_format: string;
    money_with_currency_format: string;
    weight_unit: string;
    province_code: string;
    taxes_included: boolean;
    auto_configure_tax_inclusivity: boolean | null;
    tax_shipping: boolean | null;
    county_taxes: boolean | null;
    plan_display_name: string;
    plan_name: string;
    has_discounts: boolean;
    has_gift_cards: boolean;
    myshopify_domain: string;
    google_apps_domain: string | null;
    google_apps_login_enabled: boolean | null;
    money_in_emails_format: string;
    money_with_currency_in_emails_format: string;
    eligible_for_payments: boolean;
    requires_extra_payments_agreement: boolean;
    password_enabled: boolean;
    has_storefront: boolean;
    eligible_for_card_reader_giveaway: boolean;
    finances: boolean;
    primary_location_id: number;
    cookie_consent_level: string;
    visitor_tracking_consent_preference: string;
    checkout_api_supported: boolean;
    multi_location_enabled: boolean;
    setup_required: boolean;
    force_ssl: boolean;
    pre_launch_enabled: boolean;
    enabled_presentment_currencies: string[];
    has_store_credit_system_enabled: boolean;
  };
}

// ==============================
// PRODUCT OPERATIONS
// ==============================

/**
 * Create a new product on Shopify
 * POST /admin/api/2025-01/products.json
 */
export async function createShopifyProduct(
  product: ShopifyAdminProductInput
): Promise<ShopifyAdminProductResponse> {
  return adminFetch<ShopifyAdminProductResponse>({
    method: 'POST',
    path: '/products.json',
    body: { product },
  });
}

/**
 * Update an existing product on Shopify
 * PUT /admin/api/2025-01/products/{id}.json
 */
export async function updateShopifyProduct(
  productId: number,
  product: Partial<ShopifyAdminProductInput>
): Promise<ShopifyAdminProductResponse> {
  return adminFetch<ShopifyAdminProductResponse>({
    method: 'PUT',
    path: `/products/${productId}.json`,
    body: { product },
  });
}

/**
 * Delete a product from Shopify
 * DELETE /admin/api/2025-01/products/{id}.json
 */
export async function deleteShopifyProduct(productId: number): Promise<void> {
  await adminFetch({
    method: 'DELETE',
    path: `/products/${productId}.json`,
  });
}

/**
 * Get a single product from Shopify by ID
 * GET /admin/api/2025-01/products/{id}.json
 */
export async function getShopifyAdminProduct(
  productId: number
): Promise<ShopifyAdminProductResponse> {
  return adminFetch<ShopifyAdminProductResponse>({
    method: 'GET',
    path: `/products/${productId}.json`,
  });
}

/**
 * Get all products from Shopify (up to 250 per page)
 * GET /admin/api/2025-01/products.json
 */
export async function getShopifyAdminProducts(
  params?: {
    limit?: number;       // max 250, default 50
    page_info?: string;   // for pagination
    status?: string;      // active, archived, draft, any
    product_type?: string;
    vendor?: string;
    handle?: string;
    fields?: string;      // comma-separated list of fields to return
    created_at_min?: string;
    created_at_max?: string;
    updated_at_min?: string;
    updated_at_max?: string;
    published_at_min?: string;
    published_at_max?: string;
    published_status?: string; // published, unpublished, any
  }
): Promise<ShopifyAdminProductsListResponse> {
  const queryParams: Record<string, string> = {};
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams[key] = String(value);
      }
    });
  }

  return adminFetch<ShopifyAdminProductsListResponse>({
    method: 'GET',
    path: '/products.json',
    params: queryParams,
  });
}

/**
 * Get the count of products on Shopify
 * GET /admin/api/2025-01/products/count.json
 */
export async function getShopifyProductCount(
  params?: {
    status?: string;
    product_type?: string;
    vendor?: string;
    published_status?: string;
  }
): Promise<{ count: number }> {
  const queryParams: Record<string, string> = {};
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams[key] = String(value);
      }
    });
  }

  return adminFetch<{ count: number }>({
    method: 'GET',
    path: '/products/count.json',
    params: queryParams,
  });
}

// ==============================
// COLLECTION OPERATIONS
// ==============================

/**
 * Create a custom collection on Shopify
 * POST /admin/api/2025-01/custom_collections.json
 */
export async function createShopifyCustomCollection(
  collection: ShopifyAdminCustomCollectionInput
): Promise<ShopifyAdminCustomCollectionResponse> {
  return adminFetch<ShopifyAdminCustomCollectionResponse>({
    method: 'POST',
    path: '/custom_collections.json',
    body: { custom_collection: collection },
  });
}

/**
 * Update an existing custom collection on Shopify
 * PUT /admin/api/2025-01/custom_collections/{id}.json
 */
export async function updateShopifyCustomCollection(
  collectionId: number,
  collection: Partial<ShopifyAdminCustomCollectionInput>
): Promise<ShopifyAdminCustomCollectionResponse> {
  return adminFetch<ShopifyAdminCustomCollectionResponse>({
    method: 'PUT',
    path: `/custom_collections/${collectionId}.json`,
    body: { custom_collection: collection },
  });
}

/**
 * Delete a custom collection from Shopify
 * DELETE /admin/api/2025-01/custom_collections/{id}.json
 */
export async function deleteShopifyCustomCollection(
  collectionId: number
): Promise<void> {
  await adminFetch({
    method: 'DELETE',
    path: `/custom_collections/${collectionId}.json`,
  });
}

/**
 * Get a single custom collection from Shopify
 * GET /admin/api/2025-01/custom_collections/{id}.json
 */
export async function getShopifyAdminCustomCollection(
  collectionId: number
): Promise<ShopifyAdminCustomCollectionResponse> {
  return adminFetch<ShopifyAdminCustomCollectionResponse>({
    method: 'GET',
    path: `/custom_collections/${collectionId}.json`,
  });
}

/**
 * Get all custom collections from Shopify
 * GET /admin/api/2025-01/custom_collections.json
 */
export async function getShopifyAdminCustomCollections(
  params?: {
    limit?: number;       // max 250, default 50
    page_info?: string;
    title?: string;
    handle?: string;
    product_id?: number;
    published_at_min?: string;
    published_at_max?: string;
    published_status?: string;
    fields?: string;
  }
): Promise<ShopifyAdminCustomCollectionsListResponse> {
  const queryParams: Record<string, string> = {};
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams[key] = String(value);
      }
    });
  }

  return adminFetch<ShopifyAdminCustomCollectionsListResponse>({
    method: 'GET',
    path: '/custom_collections.json',
    params: queryParams,
  });
}

/**
 * Get the count of custom collections on Shopify
 * GET /admin/api/2025-01/custom_collections/count.json
 */
export async function getShopifyCustomCollectionCount(
  params?: {
    title?: string;
    product_id?: number;
    published_status?: string;
  }
): Promise<{ count: number }> {
  const queryParams: Record<string, string> = {};
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams[key] = String(value);
      }
    });
  }

  return adminFetch<{ count: number }>({
    method: 'GET',
    path: '/custom_collections/count.json',
    params: queryParams,
  });
}

// ==============================
// COLLECT OPERATIONS (Product ↔ Collection linking)
// ==============================

/**
 * Add a product to a collection
 * POST /admin/api/2025-01/collects.json
 */
export async function createShopifyCollect(
  collect: ShopifyAdminCollectInput
): Promise<ShopifyAdminCollectResponse> {
  return adminFetch<ShopifyAdminCollectResponse>({
    method: 'POST',
    path: '/collects.json',
    body: { collect },
  });
}

/**
 * Remove a product from a collection
 * DELETE /admin/api/2025-01/collects/{id}.json
 */
export async function deleteShopifyCollect(collectId: number): Promise<void> {
  await adminFetch({
    method: 'DELETE',
    path: `/collects/${collectId}.json`,
  });
}

/**
 * Get all collects (product-collection links)
 * GET /admin/api/2025-01/collects.json
 */
export async function getShopifyCollects(
  params?: {
    limit?: number;
    page_info?: string;
    collection_id?: number;
    product_id?: number;
  }
): Promise<ShopifyAdminCollectsListResponse> {
  const queryParams: Record<string, string> = {};
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams[key] = String(value);
      }
    });
  }

  return adminFetch<ShopifyAdminCollectsListResponse>({
    method: 'GET',
    path: '/collects.json',
    params: queryParams,
  });
}

// ==============================
// CONNECTION TEST
// ==============================

/**
 * Test the Admin API connection by fetching the shop info
 * Returns the shop data if the connection is successful
 */
export async function testAdminConnection(): Promise<{
  success: boolean;
  shop?: ShopifyAdminShopResponse['shop'];
  error?: string;
}> {
  try {
    if (!ADMIN_TOKEN) {
      return {
        success: false,
        error: 'SHOPIFY_ADMIN_TOKEN is not set in environment variables.',
      };
    }

    const response = await adminFetch<ShopifyAdminShopResponse>({
      method: 'GET',
      path: '/shop.json',
    });

    return {
      success: true,
      shop: response.shop,
    };
  } catch (error) {
    const message =
      error instanceof ShopifyAdminError
        ? `Admin API error (${error.status}): ${error.message}`
        : error instanceof Error
          ? error.message
          : 'Unknown error testing Shopify Admin API connection';

    return {
      success: false,
      error: message,
    };
  }
}

// ==============================
// HELPER: Convert local Product to Shopify Admin product input
// ==============================

interface LocalProductData {
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  sku?: string | null;
  images: string;       // JSON array string of image URLs
  stock?: number;
  tags?: string | null;  // JSON array string
  occasions?: string | null;
  recipientTypes?: string | null;
  relationships?: string | null;
  category?: string;
  vendor?: string;
  variants?: Array<{
    name: string;
    price: number;
    compareAtPrice?: number | null;
    sku?: string | null;
    stock?: number;
    attributes?: string; // JSON string
    image?: string | null;
  }>;
}

/**
 * Convert a local product (from Prisma/SQLite) into the Shopify Admin API
 * product input format. This handles:
 * - Title, description, vendor, product_type, tags, status
 * - Variants with price, compare_at_price, sku, inventory_quantity, weight
 * - Images with src URL, alt text, position
 * - Metafields for gift-related data (occasions, recipientTypes, relationships)
 */
export function localProductToShopifyInput(
  product: LocalProductData,
  options?: {
    status?: 'active' | 'draft';
    weight?: number;
    weightUnit?: 'g' | 'kg' | 'oz' | 'lb';
  }
): ShopifyAdminProductInput {
  // Parse images JSON
  let imageUrls: string[] = [];
  try {
    imageUrls = JSON.parse(product.images || '[]');
  } catch {
    imageUrls = product.images ? [product.images] : [];
  }

  // Parse tags JSON
  let tagsArray: string[] = [];
  try {
    tagsArray = JSON.parse(product.tags || '[]');
  } catch {
    tagsArray = product.tags ? [product.tags] : [];
  }

  // Build variants
  const variants: ShopifyAdminProductVariant[] = [];

  if (product.variants && product.variants.length > 0) {
    product.variants.forEach((v, index) => {
      variants.push({
        title: v.name || `Variant ${index + 1}`,
        price: v.price.toFixed(2),
        compare_at_price: v.compareAtPrice ? v.compareAtPrice.toFixed(2) : undefined,
        sku: v.sku || undefined,
        inventory_quantity: v.stock ?? 0,
        weight: options?.weight,
        weight_unit: options?.weightUnit,
        inventory_management: 'shopify',
      });
    });
  } else {
    // Single default variant
    variants.push({
      title: 'Default',
      price: product.price.toFixed(2),
      compare_at_price: product.compareAtPrice ? product.compareAtPrice.toFixed(2) : undefined,
      sku: product.sku || undefined,
      inventory_quantity: product.stock ?? 0,
      weight: options?.weight,
      weight_unit: options?.weightUnit,
      inventory_management: 'shopify',
    });
  }

  // Build images
  const images: ShopifyAdminProductImage[] = imageUrls.map((url, index) => ({
    src: url,
    alt: `${product.name} - Image ${index + 1}`,
    position: index + 1,
  }));

  // Build metafields for gift-related data
  const metafields: ShopifyAdminMetafield[] = [];

  if (product.occasions) {
    let occasionsValue: string;
    try {
      const parsed = JSON.parse(product.occasions);
      occasionsValue = Array.isArray(parsed) ? JSON.stringify(parsed) : product.occasions;
    } catch {
      occasionsValue = product.occasions;
    }
    metafields.push({
      namespace: 'gift',
      key: 'occasions',
      value: occasionsValue,
      type: 'json_string',
    });
  }

  if (product.recipientTypes) {
    let recipientTypesValue: string;
    try {
      const parsed = JSON.parse(product.recipientTypes);
      recipientTypesValue = Array.isArray(parsed) ? JSON.stringify(parsed) : product.recipientTypes;
    } catch {
      recipientTypesValue = product.recipientTypes;
    }
    metafields.push({
      namespace: 'gift',
      key: 'recipient_types',
      value: recipientTypesValue,
      type: 'json_string',
    });
  }

  if (product.relationships) {
    let relationshipsValue: string;
    try {
      const parsed = JSON.parse(product.relationships);
      relationshipsValue = Array.isArray(parsed) ? JSON.stringify(parsed) : product.relationships;
    } catch {
      relationshipsValue = product.relationships;
    }
    metafields.push({
      namespace: 'gift',
      key: 'relationships',
      value: relationshipsValue,
      type: 'json_string',
    });
  }

  return {
    title: product.name,
    body_html: product.description || '',
    vendor: product.vendor || '3 BOXES LUXURY',
    product_type: product.category || '',
    tags: tagsArray.join(', '),
    status: options?.status || 'active',
    variants,
    images,
    metafields: metafields.length > 0 ? metafields : undefined,
  };
}

// ==============================
// HELPER: Convert local Category to Shopify Admin collection input
// ==============================

interface LocalCategoryData {
  name: string;
  description?: string | null;
  image?: string | null;
}

/**
 * Convert a local category (from Prisma/SQLite) into the Shopify Admin API
 * custom collection input format.
 */
export function localCategoryToShopifyCollectionInput(
  category: LocalCategoryData,
  options?: {
    published?: boolean;
  }
): ShopifyAdminCustomCollectionInput {
  const collection: ShopifyAdminCustomCollectionInput = {
    title: category.name,
    body_html: category.description || '',
    published: options?.published !== false,
  };

  if (category.image) {
    collection.image = {
      src: category.image,
      alt: category.name,
    };
  }

  return collection;
}

// ==============================
// HELPER: Extract Shopify numeric ID from GID
// ==============================

/**
 * Convert a Shopify GID (e.g. "gid://shopify/Product/7981234") to a numeric ID (e.g. 7981234)
 * This is needed because the Storefront API uses GIDs but the Admin REST API uses numeric IDs.
 */
export function shopifyGidToNumericId(gid: string): number | null {
  try {
    const parts = gid.split('/');
    const numericPart = parts[parts.length - 1];
    const num = parseInt(numericPart, 10);
    return isNaN(num) ? null : num;
  } catch {
    return null;
  }
}

/**
 * Convert a numeric ID to a Shopify GID
 * e.g. 7981234 → "gid://shopify/Product/7981234"
 */
export function numericIdToShopifyGid(
  numericId: number,
  type: 'Product' | 'ProductVariant' | 'Collection' | 'CustomCollection'
): string {
  return `gid://shopify/${type}/${numericId}`;
}
