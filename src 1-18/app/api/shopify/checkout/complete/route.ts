import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getShopifyCheckoutStatus, getShopifyOrderDetails, isShopifyConfigured } from '@/lib/shopify/client';
import { getSessionFromRequest } from '@/lib/auth-helper';

// Map Shopify financial_status to our Order status
function mapFinancialStatus(financialStatus: string): string {
  const map: Record<string, string> = {
    'pending': 'pending',
    'authorized': 'processing',
    'partially_paid': 'processing',
    'paid': 'processing',
    'partially_refunded': 'refunded',
    'refunded': 'refunded',
    'voided': 'cancelled',
  };
  return map[financialStatus] || 'pending';
}

// Map Shopify financial_status to our Order paymentStatus
function mapPaymentStatus(financialStatus: string): string {
  if (financialStatus === 'paid') return 'paid';
  if (financialStatus === 'refunded' || financialStatus === 'partially_refunded') return 'refunded';
  if (financialStatus === 'voided') return 'failed';
  return 'pending';
}

// Map Shopify fulfillment_status to our Order status
function mapFulfillmentStatus(fulfillmentStatus: string | null): string {
  if (!fulfillmentStatus) return 'pending';
  const map: Record<string, string> = {
    'pending': 'pending',
    'partial': 'processing',
    'fulfilled': 'shipped',
    'restocked': 'cancelled',
  };
  return map[fulfillmentStatus] || 'pending';
}

/**
 * GET /api/shopify/checkout/complete
 *
 * Handles the return from Shopify checkout after a customer completes payment.
 * Query params: checkout_id, order_id
 *
 * Flow:
 * 1. Verify the checkout was completed via Shopify API
 * 2. Check if a local order already exists (dedup)
 * 3. If order_id provided, fetch full order details from Shopify Admin API
 * 4. Create a local Order record with all details
 * 5. Link to the user if they're logged in (match by email)
 * 6. Return the order data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkoutId = searchParams.get('checkout_id');
    const orderId = searchParams.get('order_id');

    if (!checkoutId && !orderId) {
      return NextResponse.json(
        { error: 'Either checkout_id or order_id query parameter is required' },
        { status: 400 }
      );
    }

    // --- Step 1: If we have an order_id, check if we already have this order locally ---
    if (orderId) {
      const shopifyGid = orderId.startsWith('gid://')
        ? orderId
        : `gid://shopify/Order/${orderId}`;

      const existingOrder = await db.order.findFirst({
        where: { shopifyOrderId: shopifyGid },
        include: { items: true },
      });

      if (existingOrder) {
        // Order already exists — return it
        return NextResponse.json({
          order: {
            id: existingOrder.id,
            orderNumber: existingOrder.orderNumber,
            email: existingOrder.email,
            firstName: existingOrder.firstName,
            lastName: existingOrder.lastName,
            address: existingOrder.address,
            city: existingOrder.city,
            state: existingOrder.state,
            zipCode: existingOrder.zipCode,
            country: existingOrder.country,
            phone: existingOrder.phone,
            subtotal: existingOrder.subtotal,
            shipping: existingOrder.shipping,
            tax: existingOrder.tax,
            discount: existingOrder.discount,
            total: existingOrder.total,
            status: existingOrder.status,
            paymentMethod: existingOrder.paymentMethod,
            paymentStatus: existingOrder.paymentStatus,
            deliveryType: existingOrder.deliveryType,
            shopifyOrderId: existingOrder.shopifyOrderId,
            shopifyOrderName: existingOrder.shopifyOrderName,
            createdAt: existingOrder.createdAt,
            items: existingOrder.items.map((item) => ({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              image: item.image,
              variantId: item.variantId,
              variantName: item.variantName,
              productId: item.productId,
            })),
          },
          source: 'existing',
        });
      }
    }

    // Also check by checkoutId (stored as shopifyCartId)
    if (checkoutId) {
      const normalizedCheckoutId = checkoutId.startsWith('gid://')
        ? checkoutId
        : `gid://shopify/Cart/${checkoutId}`;

      const existingByCart = await db.order.findFirst({
        where: { shopifyCartId: normalizedCheckoutId },
        include: { items: true },
      });

      if (existingByCart) {
        return NextResponse.json({
          order: {
            id: existingByCart.id,
            orderNumber: existingByCart.orderNumber,
            email: existingByCart.email,
            firstName: existingByCart.firstName,
            lastName: existingByCart.lastName,
            address: existingByCart.address,
            city: existingByCart.city,
            state: existingByCart.state,
            zipCode: existingByCart.zipCode,
            country: existingByCart.country,
            phone: existingByCart.phone,
            subtotal: existingByCart.subtotal,
            shipping: existingByCart.shipping,
            tax: existingByCart.tax,
            discount: existingByCart.discount,
            total: existingByCart.total,
            status: existingByCart.status,
            paymentMethod: existingByCart.paymentMethod,
            paymentStatus: existingByCart.paymentStatus,
            deliveryType: existingByCart.deliveryType,
            shopifyOrderId: existingByCart.shopifyOrderId,
            shopifyOrderName: existingByCart.shopifyOrderName,
            shopifyCartId: existingByCart.shopifyCartId,
            createdAt: existingByCart.createdAt,
            items: existingByCart.items.map((item) => ({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              image: item.image,
              variantId: item.variantId,
              variantName: item.variantName,
              productId: item.productId,
            })),
          },
          source: 'existing',
        });
      }
    }

    // --- Step 2: Verify checkout status via Shopify API ---
    let checkoutStatus: Awaited<ReturnType<typeof getShopifyCheckoutStatus>> = null;
    if (checkoutId && isShopifyConfigured()) {
      checkoutStatus = await getShopifyCheckoutStatus(checkoutId);
    }

    // --- Step 3: Fetch order details from Shopify Admin API ---
    type ShopifyOrderType = NonNullable<Awaited<ReturnType<typeof getShopifyOrderDetails>>['order']>;
    let shopifyOrder: ShopifyOrderType | undefined;

    // If we have an order_id (from URL param or from checkout status), fetch details
    const resolvedOrderId = orderId || checkoutStatus?.order?.id;
    if (resolvedOrderId) {
      const orderResult = await getShopifyOrderDetails(resolvedOrderId);
      if (orderResult.success && orderResult.order) {
        shopifyOrder = orderResult.order;
      }
    }

    // --- Step 4: Create local order ---
    // If we have Shopify order data, use it. Otherwise, use checkout data.
    if (shopifyOrder) {
      const shippingAddr = shopifyOrder.shipping_address || {} as Record<string, unknown>;
      const billingAddr = shopifyOrder.billing_address || {} as Record<string, unknown>;
      const customer = shopifyOrder.customer || {} as Record<string, unknown>;

      const financialStatus = shopifyOrder.financial_status || 'pending';
      const fulfillmentStatus = shopifyOrder.fulfillment_status;
      const orderStatus = fulfillmentStatus
        ? mapFulfillmentStatus(fulfillmentStatus)
        : mapFinancialStatus(financialStatus);
      const paymentStatus = mapPaymentStatus(financialStatus);

      const shopifyGid = `gid://shopify/Order/${shopifyOrder.id}`;
      const normalizedCheckoutId = checkoutId
        ? (checkoutId.startsWith('gid://') ? checkoutId : `gid://shopify/Cart/${checkoutId}`)
        : null;

      // Determine coupon code from discount_codes
      const couponCode = shopifyOrder.discount_codes?.length
        ? shopifyOrder.discount_codes.map((dc) => dc.code).join(',')
        : null;

      const newOrder = await db.order.create({
        data: {
          orderNumber: shopifyOrder.name || `SHO-${shopifyOrder.id}`,
          email: shopifyOrder.email || (customer as Record<string, unknown>).email as string || 'no-email@shopify',
          firstName: (shippingAddr as Record<string, unknown>).first_name as string || (customer as Record<string, unknown>).first_name as string || (billingAddr as Record<string, unknown>).first_name as string || '',
          lastName: (shippingAddr as Record<string, unknown>).last_name as string || (customer as Record<string, unknown>).last_name as string || (billingAddr as Record<string, unknown>).last_name as string || '',
          address: (shippingAddr as Record<string, unknown>).address1 as string || (billingAddr as Record<string, unknown>).address1 as string || '',
          city: (shippingAddr as Record<string, unknown>).city as string || (billingAddr as Record<string, unknown>).city as string || '',
          state: (shippingAddr as Record<string, unknown>).province as string || (billingAddr as Record<string, unknown>).province as string || '',
          zipCode: (shippingAddr as Record<string, unknown>).zip as string || (billingAddr as Record<string, unknown>).zip as string || '',
          country: (shippingAddr as Record<string, unknown>).country as string || (billingAddr as Record<string, unknown>).country as string || 'IN',
          phone: shopifyOrder.phone || (shippingAddr as Record<string, unknown>).phone as string || (customer as Record<string, unknown>).phone as string || null,
          subtotal: parseFloat(shopifyOrder.subtotal_price) || 0,
          shipping: parseFloat(shopifyOrder.total_shipping_price_set?.shop_money?.amount || '0'),
          tax: parseFloat(shopifyOrder.total_tax) || 0,
          discount: parseFloat(shopifyOrder.total_discounts) || 0,
          total: parseFloat(shopifyOrder.total_price) || 0,
          status: orderStatus,
          paymentMethod: 'shopify',
          paymentStatus: paymentStatus,
          deliveryType: 'standard',
          shopifyOrderId: shopifyGid,
          shopifyOrderName: shopifyOrder.name,
          shopifyOrderData: JSON.stringify(shopifyOrder),
          shopifyCartId: normalizedCheckoutId,
          couponCode,
        },
      });

      // Create tracking event
      await db.orderTrackingEvent.create({
        data: {
          orderId: newOrder.id,
          status: 'pending',
          description: 'Order Placed via Shopify Checkout',
        },
      });

      // Create OrderItem records
      const lineItems = shopifyOrder.line_items || [];
      for (const item of lineItems) {
        const shopifyProductId = item.product_id;
        let localProduct: { id: string } | null = null;

        if (shopifyProductId) {
          localProduct = await db.product.findFirst({
            where: { shopifyId: `gid://shopify/Product/${shopifyProductId}` },
            select: { id: true },
          });
        }

        if (!localProduct && item.sku) {
          localProduct = await db.product.findFirst({
            where: { sku: item.sku },
            select: { id: true },
          });
        }

        if (localProduct) {
          await db.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: localProduct.id,
              name: item.title || item.name || 'Unknown Product',
              price: parseFloat(item.price) || 0,
              quantity: item.quantity || 1,
              image: item.image || null,
              variantId: item.variant_id ? `gid://shopify/ProductVariant/${item.variant_id}` : null,
              variantName: item.variant_title || null,
            },
          });
        } else {
          // Product not found locally — create a placeholder
          console.log(
            `Product not found for line item: ${item.title} (shopify_product_id: ${shopifyProductId}), creating placeholder`
          );

          let defaultCat = await db.category.findFirst({ where: { slug: 'uncategorized' } });
          if (!defaultCat) {
            defaultCat = await db.category.create({
              data: { name: 'Uncategorized', slug: 'uncategorized', description: '' },
            });
          }

          const placeholderProduct = await db.product.create({
            data: {
              productNumber: `SHO-ITEM-${item.id || Date.now()}`,
              name: item.title || item.name || 'Unknown Product',
              slug: `shopify-item-${item.id || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              description: item.title || 'Imported from Shopify order',
              price: parseFloat(item.price) || 0,
              images: JSON.stringify(item.image ? [item.image] : []),
              categoryId: defaultCat.id,
              stock: 0,
              stockStatus: 'out_of_stock',
              shopifyId: shopifyProductId ? `gid://shopify/Product/${shopifyProductId}` : null,
              source: 'shopify',
            },
          });

          await db.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: placeholderProduct.id,
              name: item.title || item.name || 'Unknown Product',
              price: parseFloat(item.price) || 0,
              quantity: item.quantity || 1,
              image: item.image || null,
              variantId: item.variant_id ? `gid://shopify/ProductVariant/${item.variant_id}` : null,
              variantName: item.variant_title || null,
            },
          });
        }
      }

      // Link to user by email
      const orderEmail = shopifyOrder.email || (customer as Record<string, unknown>).email as string;
      if (orderEmail) {
        const localUser = await db.user.findFirst({
          where: { email: orderEmail.toLowerCase().trim() },
          select: { id: true },
        });
        if (localUser) {
          await db.order.update({
            where: { id: newOrder.id },
            data: { userId: localUser.id },
          });
        }
      }

      // Also try to link via auth session
      const authUser = await getSessionFromRequest(request);
      if (authUser && !newOrder.userId) {
        await db.order.update({
          where: { id: newOrder.id },
          data: { userId: authUser.id },
        });
      }

      // Fetch the complete order with items for response
      const completeOrder = await db.order.findUnique({
        where: { id: newOrder.id },
        include: { items: true },
      });

      return NextResponse.json({
        order: {
          id: completeOrder!.id,
          orderNumber: completeOrder!.orderNumber,
          email: completeOrder!.email,
          firstName: completeOrder!.firstName,
          lastName: completeOrder!.lastName,
          address: completeOrder!.address,
          city: completeOrder!.city,
          state: completeOrder!.state,
          zipCode: completeOrder!.zipCode,
          country: completeOrder!.country,
          phone: completeOrder!.phone,
          subtotal: completeOrder!.subtotal,
          shipping: completeOrder!.shipping,
          tax: completeOrder!.tax,
          discount: completeOrder!.discount,
          total: completeOrder!.total,
          status: completeOrder!.status,
          paymentMethod: completeOrder!.paymentMethod,
          paymentStatus: completeOrder!.paymentStatus,
          deliveryType: completeOrder!.deliveryType,
          shopifyOrderId: completeOrder!.shopifyOrderId,
          shopifyOrderName: completeOrder!.shopifyOrderName,
          shopifyCartId: completeOrder!.shopifyCartId,
          couponCode: completeOrder!.couponCode,
          createdAt: completeOrder!.createdAt,
          items: completeOrder!.items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            variantId: item.variantId,
            variantName: item.variantName,
            productId: item.productId,
          })),
        },
        source: 'created',
      });
    }

    // --- Step 5: No Shopify order data available ---
    // If we have checkout verification data but no order details, return what we know
    if (checkoutStatus) {
      return NextResponse.json({
        order: null,
        checkoutStatus: {
          id: checkoutStatus.id,
          status: checkoutStatus.status,
          completedAt: checkoutStatus.completedAt,
          orderId: checkoutStatus.order?.id || null,
          orderName: checkoutStatus.order?.name || null,
        },
        source: 'checkout_only',
        message: checkoutStatus.status === 'completed'
          ? 'Checkout completed but order details not available via API. The webhook may create the order shortly.'
          : checkoutStatus.status === 'pending'
            ? 'Checkout is still pending.'
            : 'Checkout status unknown. The order may still be processing.',
      });
    }

    // No data available at all
    return NextResponse.json(
      {
        error: 'Could not verify checkout or fetch order details. The Shopify API may not be configured, or the checkout/order ID is invalid.',
        hint: 'Ensure SHOPIFY_STOREFRONT_TOKEN and SHOPIFY_ADMIN_TOKEN are set in your environment.',
      },
      { status: 404 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Shopify checkout complete error:', error);
    return NextResponse.json(
      { error: 'Failed to process checkout completion', details: message },
      { status: 500 }
    );
  }
}
