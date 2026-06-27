/**
 * Shopify Storefront API Client
 * Handles all GraphQL communication with Shopify's Storefront API
 * Store: 3boxesluxury-2.myshopify.com
 */

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '3boxesluxury-2.myshopify.com';
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';

const STOREFRONT_API_URL = `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;

/**
 * Check if the Shopify Storefront API token is configured in environment variables
 */
export function isShopifyConfigured(): boolean {
  return !!(process.env.SHOPIFY_STOREFRONT_TOKEN && process.env.SHOPIFY_STOREFRONT_TOKEN.length > 0);
}

/**
 * Test the Storefront API connection by querying the shop info
 * Returns connection status and shop name if successful
 */
export async function testStorefrontConnection(): Promise<{
  connected: boolean;
  shopName?: string;
  error?: string;
}> {
  try {
    if (!isShopifyConfigured()) {
      return {
        connected: false,
        error: 'Shopify Storefront API token not configured',
      };
    }

    const shop = await getShopInfo();
    return {
      connected: true,
      shopName: shop?.name,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error testing Shopify Storefront API connection';
    return {
      connected: false,
      error: message,
    };
  }
}

interface ShopifyResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code: string } }>;
  extensions?: { cost: { requestedQueryCost: number } };
}

async function shopifyFetch<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN;

  if (!storefrontToken) {
    throw new Error('Shopify Storefront API token not configured');
  }

  const response = await fetch(STOREFRONT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': storefrontToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
  }

  const json: ShopifyResponse<T> = await response.json();

  if (json.errors && json.errors.length > 0) {
    const errorMessages = json.errors.map(e => e.message).join(', ');
    throw new Error(`Shopify GraphQL error: ${errorMessages}`);
  }

  return json.data as T;
}

// ==============================
// PRODUCT QUERIES
// ==============================

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  productType: string;
  vendor: string;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  featuredImage?: {
    id: string;
    url: string;
    altText: string;
    width: number;
    height: number;
  };
  images: {
    edges: Array<{
      node: {
        id: string;
        url: string;
        altText: string;
        width: number;
        height: number;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        availableForSale: boolean;
        price: { amount: string; currencyCode: string };
        compareAtPrice?: { amount: string; currencyCode: string };
        selectedOptions: Array<{ name: string; value: string }>;
        image?: { id: string; url: string; altText: string };
      };
    }>;
  };
  options: Array<{
    id: string;
    name: string;
    values: string[];
  }>;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  seo: {
    title: string;
    description: string;
  };
}

export interface ShopifyCollection {
  id: string;
  title: string;
  handle: string;
  description: string;
  image?: {
    id: string;
    url: string;
    altText: string;
  };
}

const PRODUCT_FRAGMENT = `
  fragment ProductFragment on Product {
    id
    title
    handle
    description
    productType
    vendor
    tags
    createdAt
    updatedAt
    featuredImage { id url altText width height }
    images(first: 10) { edges { node { id url altText width height } } }
    variants(first: 10) {
      edges {
        node {
          id
          title
          availableForSale
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
          selectedOptions { name value }
          image { id url altText }
        }
      }
    }
    options { id name values }
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    seo { title description }
  }
`;

/**
 * Get all products from Shopify
 */
export async function getShopifyProducts(limit = 50, cursor?: string) {
  const data = await shopifyFetch<any>(`
    ${PRODUCT_FRAGMENT}
    query GetProducts($first: Int!, $after: String) {
      products(first: $first, after: $after) {
        edges {
          cursor
          node { ...ProductFragment }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `, { first: limit, after: cursor || null });

  return {
    products: data.products.edges.map((e: any) => e.node) as ShopifyProduct[],
    pageInfo: data.products.pageInfo,
  };
}

/**
 * Get a single product by handle
 */
export async function getShopifyProductByHandle(handle: string) {
  const data = await shopifyFetch<any>(`
    ${PRODUCT_FRAGMENT}
    query GetProductByHandle($handle: String!) {
      product(handle: $handle) { ...ProductFragment }
    }
  `, { handle });

  return data.product as ShopifyProduct | null;
}

/**
 * Get a single product by ID
 */
export async function getShopifyProductById(id: string) {
  const data = await shopifyFetch<any>(`
    ${PRODUCT_FRAGMENT}
    query GetProductById($id: ID!) {
      product(id: $id) { ...ProductFragment }
    }
  `, { id });

  return data.product as ShopifyProduct | null;
}

/**
 * Search products
 */
export async function searchShopifyProducts(query: string, limit = 20) {
  const data = await shopifyFetch<any>(`
    ${PRODUCT_FRAGMENT}
    query SearchProducts($query: String!, $first: Int!) {
      products(first: $first, query: $query) {
        edges {
          node { ...ProductFragment }
        }
      }
    }
  `, { query, first: limit });

  return data.products.edges.map((e: any) => e.node) as ShopifyProduct[];
}

/**
 * Get all collections
 */
export async function getShopifyCollections() {
  const data = await shopifyFetch<any>(`
    query GetCollections {
      collections(first: 50) {
        edges {
          node {
            id
            title
            handle
            description
            image { id url altText }
          }
        }
      }
    }
  `);

  return data.collections.edges.map((e: any) => e.node) as ShopifyCollection[];
}

/**
 * Get products in a collection
 */
export async function getShopifyCollectionProducts(handle: string, limit = 50) {
  const data = await shopifyFetch<any>(`
    ${PRODUCT_FRAGMENT}
    query GetCollectionProducts($handle: String!, $first: Int!) {
      collection(handle: $handle) {
        id
        title
        description
        products(first: $first) {
          edges {
            node { ...ProductFragment }
          }
        }
      }
    }
  `, { handle, first: limit });

  if (!data.collection) return null;

  return {
    ...data.collection,
    products: data.collection.products.edges.map((e: any) => e.node) as ShopifyProduct[],
  };
}

// ==============================
// CART & CHECKOUT
// ==============================

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  lines: {
    edges: Array<{
      node: {
        id: string;
        quantity: number;
        merchandise: {
          id: string;
          title: string;
          product: { id: string; title: string; handle: string };
          image?: { url: string; altText: string };
          price: { amount: string; currencyCode: string };
        };
      };
    }>;
  };
  cost: {
    totalAmount: { amount: string; currencyCode: string };
    subtotalAmount: { amount: string; currencyCode: string };
    totalTaxAmount?: { amount: string; currencyCode: string };
    totalDutyAmount?: { amount: string; currencyCode: string };
  };
  totalQuantity: number;
}

/**
 * Create a new cart
 */
export async function createShopifyCart(lines?: Array<{ merchandiseId: string; quantity: number }>) {
  const input: any = {};
  if (lines && lines.length > 0) {
    input.lines = lines.map(l => ({ merchandiseId: l.merchandiseId, quantity: l.quantity }));
  }

  const data = await shopifyFetch<any>(`
    mutation CreateCart($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount { amount currencyCode }
            subtotalAmount { amount currencyCode }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    product { id title handle }
                    image { url altText }
                    price { amount currencyCode }
                  }
                }
              }
            }
          }
        }
        userErrors { message code }
      }
    }
  `, { input });

  if (data.cartCreate.userErrors && data.cartCreate.userErrors.length > 0) {
    throw new Error(data.cartCreate.userErrors.map((e: any) => e.message).join(', '));
  }

  return data.cartCreate.cart as ShopifyCart;
}

/**
 * Add items to cart
 */
export async function addToShopifyCart(cartId: string, lines: Array<{ merchandiseId: string; quantity: number }>) {
  const data = await shopifyFetch<any>(`
    mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount { amount currencyCode }
            subtotalAmount { amount currencyCode }
          }
        }
        userErrors { message code }
      }
    }
  `, { cartId, lines });

  if (data.cartLinesAdd.userErrors && data.cartLinesAdd.userErrors.length > 0) {
    throw new Error(data.cartLinesAdd.userErrors.map((e: any) => e.message).join(', '));
  }

  return data.cartLinesAdd.cart as ShopifyCart;
}

/**
 * Remove items from cart
 */
export async function removeFromShopifyCart(cartId: string, lineIds: string[]) {
  const data = await shopifyFetch<any>(`
    mutation RemoveFromCart($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount { amount currencyCode }
            subtotalAmount { amount currencyCode }
          }
        }
        userErrors { message code }
      }
    }
  `, { cartId, lineIds });

  if (data.cartLinesRemove.userErrors && data.cartLinesRemove.userErrors.length > 0) {
    throw new Error(data.cartLinesRemove.userErrors.map((e: any) => e.message).join(', '));
  }

  return data.cartLinesRemove.cart as ShopifyCart;
}

/**
 * Update cart line quantities
 */
export async function updateShopifyCartLines(cartId: string, lines: Array<{ id: string; quantity: number }>) {
  const data = await shopifyFetch<any>(`
    mutation UpdateCartLines($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount { amount currencyCode }
            subtotalAmount { amount currencyCode }
          }
        }
        userErrors { message code }
      }
    }
  `, { cartId, lines });

  if (data.cartLinesUpdate.userErrors && data.cartLinesUpdate.userErrors.length > 0) {
    throw new Error(data.cartLinesUpdate.userErrors.map((e: any) => e.message).join(', '));
  }

  return data.cartLinesUpdate.cart as ShopifyCart;
}

/**
 * Get cart details
 */
export async function getShopifyCart(cartId: string) {
  const data = await shopifyFetch<any>(`
    query GetCart($cartId: ID!) {
      cart(id: $cartId) {
        id
        checkoutUrl
        totalQuantity
        attributes { key value }
        cost {
          totalAmount { amount currencyCode }
          subtotalAmount { amount currencyCode }
          totalTaxAmount { amount currencyCode }
          totalDutyAmount { amount currencyCode }
        }
        lines(first: 50) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  product { id title handle }
                  image { url altText }
                  price { amount currencyCode }
                }
              }
            }
          }
        }
      }
    }
  `, { cartId });

  return data.cart as ShopifyCart | null;
}

/**
 * Update cart attributes (gift wrap, delivery, greeting, etc.)
 */
export async function updateShopifyCartAttributes(
  cartId: string,
  attributes: Array<{ key: string; value: string }>,
  note?: string
) {
  const data = await shopifyFetch<any>(`
    mutation CartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!) {
      cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount { amount currencyCode }
            subtotalAmount { amount currencyCode }
          }
          attributes { key value }
        }
        userErrors { message code }
      }
    }
  `, { cartId, attributes });

  if (data.cartAttributesUpdate.userErrors && data.cartAttributesUpdate.userErrors.length > 0) {
    throw new Error(data.cartAttributesUpdate.userErrors.map((e: any) => e.message).join(', '));
  }

  return data.cartAttributesUpdate.cart as ShopifyCart & { attributes: Array<{ key: string; value: string }> };
}

/**
 * Apply a discount code to the cart
 */
export async function applyShopifyDiscountCode(cartId: string, discountCodes: string[]) {
  const data = await shopifyFetch<any>(`
    mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
      cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount { amount currencyCode }
            subtotalAmount { amount currencyCode }
          }
        }
        userErrors { message code }
      }
    }
  `, { cartId, discountCodes });

  if (data.cartDiscountCodesUpdate.userErrors && data.cartDiscountCodesUpdate.userErrors.length > 0) {
    throw new Error(data.cartDiscountCodesUpdate.userErrors.map((e: any) => e.message).join(', '));
  }

  return data.cartDiscountCodesUpdate.cart as ShopifyCart;
}

// ==============================
// CHECKOUT (Storefront API)
// ==============================

export interface ShopifyCheckoutResult {
  id: string;
  webUrl: string;
}

/**
 * Create a Shopify checkout using the Storefront API.
 *
 * Strategy: Use cartCreate (the Checkout API was deprecated in 2025-01).
 * The cart's checkoutUrl naturally supports the return_to query parameter.
 */
export async function createShopifyCheckout(
  lines: Array<{ variantId: string; quantity: number }>,
  customAttributes?: Array<{ key: string; value: string }>
): Promise<ShopifyCheckoutResult> {
  const cartLines = lines.map((l) => {
    // Convert numeric ID to GID if needed
    let merchandiseId = l.variantId;
    if (!merchandiseId.startsWith('gid://')) {
      merchandiseId = `gid://shopify/ProductVariant/${merchandiseId}`;
    }
    return { merchandiseId, quantity: l.quantity };
  });

  const input: Record<string, unknown> = { lines: cartLines };
  if (customAttributes && customAttributes.length > 0) {
    input.note = customAttributes.map((a) => `${a.key}=${a.value}`).join('; ');
  }

  const data = await shopifyFetch<any>(`
    mutation CreateCart($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
        }
        userErrors { message code }
      }
    }
  `, { input });

  if (data.cartCreate.userErrors && data.cartCreate.userErrors.length > 0) {
    throw new Error(data.cartCreate.userErrors.map((e: { message: string }) => e.message).join(', '));
  }

  return {
    id: data.cartCreate.cart.id,
    webUrl: data.cartCreate.cart.checkoutUrl,
  };
}

// ==============================
// CHECKOUT VERIFICATION
// ==============================

export interface ShopifyCheckoutStatus {
  id: string;
  completedAt: string | null;
  order: {
    id: string;
    name: string;
    processedAt: string;
    fulfillmentStatus: string;
    financialStatus: string;
  } | null;
  status: 'completed' | 'pending' | 'abandoned' | 'unknown';
}

/**
 * Verify a Shopify checkout/cart status via Storefront API.
 *
 * In the 2025-01 API, the Checkout API is deprecated in favor of Cart API.
 * This function attempts to query the Cart to determine checkout status.
 * After checkout completion, the cart may no longer be queryable or may
 * return with zero quantity, which we use as a heuristic for completion.
 */
export async function getShopifyCheckoutStatus(checkoutId: string): Promise<ShopifyCheckoutStatus | null> {
  // Ensure the ID is a GID
  let gid = checkoutId;
  if (!gid.startsWith('gid://')) {
    // Could be a Cart ID or Checkout ID — try Cart first
    gid = `gid://shopify/Cart/${gid}`;
  }

  try {
    const cart = await getShopifyCart(gid);

    if (!cart) {
      // Cart not found — it may have been completed and expired
      // Try as a Checkout GID (legacy)
      const checkoutGid = checkoutId.startsWith('gid://shopify/Checkout/')
        ? checkoutId
        : `gid://shopify/Checkout/${checkoutId.replace('gid://shopify/Cart/', '')}`;

      try {
        const data = await shopifyFetch<any>(`
          query GetCheckout($id: ID!) {
            node(id: $id) {
              ... on Checkout {
                id
                completedAt
                order {
                  id
                  name
                  processedAt
                  fulfillmentStatus
                  financialStatus
                }
              }
            }
          }
        `, { id: checkoutGid });

        if (data.node) {
          const checkout = data.node;
          const status: ShopifyCheckoutStatus['status'] = checkout.completedAt
            ? 'completed'
            : checkout.order
              ? 'completed'
              : 'pending';

          return {
            id: checkout.id,
            completedAt: checkout.completedAt,
            order: checkout.order || null,
            status,
          };
        }
      } catch {
        // Checkout query failed — cart was likely completed
      }

      // If we can't find the cart at all, it was likely completed
      // (Shopify removes carts after checkout)
      return {
        id: checkoutId,
        completedAt: null,
        order: null,
        status: 'unknown',
      };
    }

    // Cart still exists — check if it has been checked out
    // A completed checkout typically means the cart is empty or has been "consumed"
    const hasItems = cart.totalQuantity > 0;

    return {
      id: cart.id,
      completedAt: null,
      order: null,
      status: hasItems ? 'pending' : 'completed',
    };
  } catch (error) {
    console.error('Error verifying Shopify checkout:', error);
    return null;
  }
}

/**
 * Fetch order details from Shopify Admin API by order GID or numeric ID.
 * This provides full order details for creating local order records.
 */
export async function getShopifyOrderDetails(orderId: string): Promise<{
  success: boolean;
  order?: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    financial_status: string;
    fulfillment_status: string | null;
    subtotal_price: string;
    total_shipping_price_set: {
      shop_money: { amount: string; currency_code: string };
    };
    total_tax: string;
    total_discounts: string;
    total_price: string;
    currency: string;
    processed_at: string;
    created_at: string;
    customer: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      phone: string | null;
    } | null;
    shipping_address: {
      first_name: string;
      last_name: string;
      address1: string;
      address2: string | null;
      city: string;
      province: string;
      province_code: string;
      zip: string;
      country: string;
      country_code: string;
      phone: string | null;
    } | null;
    billing_address: {
      first_name: string;
      last_name: string;
      address1: string;
      city: string;
      province: string;
      zip: string;
      country: string;
      phone: string | null;
    } | null;
    line_items: Array<{
      id: number;
      title: string;
      name: string;
      price: string;
      quantity: number;
      sku: string | null;
      variant_id: number | null;
      variant_title: string | null;
      product_id: number | null;
      image: string | null;
    }>;
    discount_codes: Array<{ code: string; amount: string; type: string }>;
  };
  error?: string;
}> {
  const adminToken = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!adminToken) {
    return { success: false, error: 'Shopify Admin API token not configured' };
  }

  const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '3boxesluxury-2.myshopify.com';
  const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';
  const ADMIN_API_BASE = `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}`;

  // Extract numeric ID from GID if needed
  let numericId = orderId;
  if (numericId.startsWith('gid://shopify/Order/')) {
    numericId = numericId.replace('gid://shopify/Order/', '');
  }

  try {
    const response = await fetch(
      `${ADMIN_API_BASE}/orders/${numericId}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error(`Shopify Admin API error: ${response.status}`, text);
      return { success: false, error: `Admin API error: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, order: data.order };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error fetching order';
    return { success: false, error: message };
  }
}

// ==============================
// SHOP INFO
// ==============================

export async function getShopInfo() {
  const data = await shopifyFetch<any>(`
    query GetShop {
      shop {
        name
        description
        primaryDomain { url host }
        paymentSettings { currencyCode }
        shipsToCountries
      }
    }
  `);

  return data.shop;
}

/**
 * Convert Shopify product to our app's product format
 */
export function shopifyProductToAppProduct(shopifyProduct: ShopifyProduct) {
  const variant = shopifyProduct.variants.edges[0]?.node;
  const price = variant?.price?.amount ? parseFloat(variant.price.amount) : 0;
  const compareAtPrice = variant?.compareAtPrice?.amount ? parseFloat(variant.compareAtPrice.amount) : undefined;

  return {
    id: shopifyProduct.id,
    name: shopifyProduct.title,
    slug: shopifyProduct.handle,
    description: shopifyProduct.description,
    price,
    compareAtPrice,
    images: shopifyProduct.images.edges.map(e => e.node.url),
    featuredImage: shopifyProduct.featuredImage?.url,
    category: shopifyProduct.productType || 'Uncategorized',
    vendor: shopifyProduct.vendor,
    tags: shopifyProduct.tags,
    variants: shopifyProduct.variants.edges.map(e => ({
      id: e.node.id,
      title: e.node.title,
      price: parseFloat(e.node.price.amount),
      compareAtPrice: e.node.compareAtPrice ? parseFloat(e.node.compareAtPrice.amount) : undefined,
      available: e.node.availableForSale,
      options: e.node.selectedOptions,
    })),
    options: shopifyProduct.options,
    inStock: variant?.availableForSale ?? false,
    currency: variant?.price?.currencyCode || 'INR',
    source: 'shopify' as const,
    shopifyVariantId: variant?.id || '',
  };
}
