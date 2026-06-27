import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

/**
 * POST /api/shopify/webhooks
 * Handle Shopify webhooks for real-time sync
 *
 * Supported topics:
 * - products/create
 * - products/update
 * - products/delete
 * - orders/create
 * - orders/updated
 * - orders/cancelled
 * - app/uninstalled
 */

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
function mapFulfillmentStatus(fulfillmentStatus: string): string {
  const map: Record<string, string> = {
    'pending': 'pending',
    'partial': 'processing',
    'fulfilled': 'shipped',
    'restocked': 'cancelled',
  };
  return map[fulfillmentStatus] || 'pending';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const topic = request.headers.get('x-shopify-topic');
    const shopDomain = request.headers.get('x-shopify-shop-domain');
    const hmac = request.headers.get('x-shopify-hmac-sha256');

    // Verify webhook authenticity
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (webhookSecret && hmac) {
      const computedHmac = crypto.createHmac('sha256', webhookSecret).update(body).digest('base64');
      if (computedHmac !== hmac) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    const data = JSON.parse(body);
    console.log(`Shopify webhook received: ${topic} from ${shopDomain}`);

    switch (topic) {
      case 'products/create':
      case 'products/update': {
        const productId = data.id;

        // Find existing product by Shopify ID
        const existing = await db.product.findFirst({
          where: { shopifyId: `gid://shopify/Product/${productId}` },
        });

        const variant = data.variants?.[0];
        const price = variant?.price ? parseFloat(variant.price) : 0;
        const compareAtPrice = variant?.compare_at_price ? parseFloat(variant.compare_at_price) : null;
        const allImages = (data.images || []).map((img: Record<string, unknown>) => img.src as string);
        const imageUrl = data.image?.src || allImages[0] || '';

        // Find or create category
        let categoryId: string | undefined;
        if (data.product_type) {
          const catSlug = data.product_type.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
          let cat = await db.category.findFirst({ where: { slug: catSlug } });
          if (!cat) {
            cat = await db.category.create({
              data: {
                name: data.product_type,
                slug: catSlug,
                description: `Products of type ${data.product_type}`,
              },
            });
          }
          categoryId = cat.id;
        } else {
          // Use default "Uncategorized" category
          let defaultCat = await db.category.findFirst({ where: { slug: 'uncategorized' } });
          if (!defaultCat) {
            defaultCat = await db.category.create({
              data: { name: 'Uncategorized', slug: 'uncategorized', description: '' },
            });
          }
          categoryId = defaultCat.id;
        }

        const productNumber = existing?.productNumber || `SHP-${productId}`;
        const stockQty = variant?.inventory_quantity ?? (variant?.inventory_management ? 0 : 10);

        const productData: Record<string, unknown> = {
          name: data.title,
          slug: data.handle,
          description: data.body_html || '',
          price,
          compareAtPrice,
          productNumber,
          images: JSON.stringify(allImages.length > 0 ? allImages : (imageUrl ? [imageUrl] : [])),
          categoryId,
          stock: stockQty,
          stockStatus: stockQty > 0 ? 'in_stock' : 'out_of_stock',
          tags: JSON.stringify(data.tags ? data.tags.split(', ').filter(Boolean) : []),
          shopifyId: `gid://shopify/Product/${productId}`,
          shopifyVariantId: variant?.id ? `gid://shopify/ProductVariant/${variant.id}` : '',
          shopifyData: JSON.stringify(data),
          source: 'shopify',
        };

        if (existing) {
          await db.product.update({
            where: { id: existing.id },
            data: productData,
          });
          console.log(`Updated Shopify product: ${data.title}`);
        } else {
          await db.product.create({
            data: productData as Parameters<typeof db.product.create>[0]['data'],
          });
          console.log(`Created Shopify product: ${data.title}`);
        }
        break;
      }

      case 'products/delete': {
        const productId = data.id;
        const existing = await db.product.findFirst({
          where: { shopifyId: `gid://shopify/Product/${productId}` },
        });

        if (existing) {
          await db.product.delete({
            where: { id: existing.id },
          });
          console.log(`Deleted Shopify product: ${productId}`);
        }
        break;
      }

      case 'orders/create': {
        const orderId = data.id;
        const orderName = data.name; // e.g. "#1001"
        const shopifyGid = `gid://shopify/Order/${orderId}`;

        // Check if order already exists
        const existingOrder = await db.order.findFirst({
          where: { shopifyOrderId: shopifyGid },
        });

        if (existingOrder) {
          // Order already synced — update it instead
          const newStatus = data.fulfillment_status
            ? mapFulfillmentStatus(data.fulfillment_status)
            : mapFinancialStatus(data.financial_status);

          await db.order.update({
            where: { id: existingOrder.id },
            data: {
              status: newStatus,
              paymentStatus: mapPaymentStatus(data.financial_status),
              shopifyOrderData: JSON.stringify(data),
            },
          });

          await db.orderTrackingEvent.create({
            data: {
              orderId: existingOrder.id,
              status: newStatus,
              description: `Shopify order ${orderName} updated: financial=${data.financial_status}, fulfillment=${data.fulfillment_status || 'pending'}`,
            },
          });

          console.log(`Updated existing Shopify order: ${orderName}`);
        } else {
          // ─── Create a new Order from Shopify data ───
          const shippingAddr = data.shipping_address || {};
          const billingAddr = data.billing_address || {};
          const customer = data.customer || {};

          // Determine status from financial_status
          const financialStatus = data.financial_status || 'pending';
          const orderStatus = mapFinancialStatus(financialStatus);
          const paymentStatus = mapPaymentStatus(financialStatus);

          const newOrder = await db.order.create({
            data: {
              orderNumber: orderName || `SHO-${orderId}`,
              email: data.email || customer.email || 'no-email@shopify',
              firstName: shippingAddr.first_name || customer.first_name || billingAddr.first_name || '',
              lastName: shippingAddr.last_name || customer.last_name || billingAddr.last_name || '',
              address: shippingAddr.address1 || billingAddr.address1 || '',
              city: shippingAddr.city || billingAddr.city || '',
              state: shippingAddr.province || billingAddr.province || '',
              zipCode: shippingAddr.zip || billingAddr.zip || '',
              country: shippingAddr.country || billingAddr.country || 'IN',
              phone: data.phone || shippingAddr.phone || customer.phone || null,
              subtotal: parseFloat(data.subtotal_price) || 0,
              shipping: parseFloat(data.total_shipping_price_set?.shop_money?.amount || data.total_shipping_price_set?.presentment_money?.amount || '0'),
              tax: parseFloat(data.total_tax) || 0,
              discount: parseFloat(data.total_discounts) || 0,
              total: parseFloat(data.total_price) || 0,
              status: orderStatus,
              paymentMethod: 'shopify',
              paymentStatus: paymentStatus,
              deliveryType: 'standard',
              shopifyOrderId: shopifyGid,
              shopifyOrderName: orderName,
              shopifyOrderData: JSON.stringify(data),
            },
          });

          // ─── Create OrderTrackingEvent for "Order Placed" ───
          await db.orderTrackingEvent.create({
            data: {
              orderId: newOrder.id,
              status: 'pending',
              description: 'Order Placed',
            },
          });

          // ─── Create OrderItem records for each line item ───
          const lineItems = data.line_items || [];
          for (const item of lineItems) {
            // Try to find the local product by Shopify product ID
            const shopifyProductId = item.product_id;
            let localProduct: { id: string } | null = null;

            if (shopifyProductId) {
              localProduct = await db.product.findFirst({
                where: { shopifyId: `gid://shopify/Product/${shopifyProductId}` },
                select: { id: true },
              });
            }

            // If no product found, try to find by SKU
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
              // Product not found in local DB — create a placeholder product
              // so we don't lose the order item data
              console.log(`Product not found for line item: ${item.title} (shopify_product_id: ${shopifyProductId}), creating placeholder`);

              const placeholderProduct = await db.product.create({
                data: {
                  productNumber: `SHO-ITEM-${item.id || Date.now()}`,
                  name: item.title || item.name || 'Unknown Product',
                  slug: `shopify-item-${item.id || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  description: item.title || 'Imported from Shopify order',
                  price: parseFloat(item.price) || 0,
                  images: JSON.stringify(item.image ? [item.image] : []),
                  categoryId: (await db.category.findFirst({ where: { slug: 'uncategorized' } }))?.id || (await db.category.create({ data: { name: 'Uncategorized', slug: 'uncategorized', description: '' } })).id,
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

          // ─── Try to link order to a local user by email ───
          const orderEmail = data.email || customer.email;
          if (orderEmail) {
            const localUser = await db.user.findFirst({
              where: { email: orderEmail },
              select: { id: true },
            });
            if (localUser) {
              await db.order.update({
                where: { id: newOrder.id },
                data: { userId: localUser.id },
              });
            }
          }

          console.log(`Created Shopify order: ${orderName} with ${lineItems.length} items`);
        }
        break;
      }

      case 'orders/updated': {
        const orderId = data.id;
        const orderName = data.name;
        const shopifyGid = `gid://shopify/Order/${orderId}`;

        const existingOrder = await db.order.findFirst({
          where: { shopifyOrderId: shopifyGid },
        });

        if (existingOrder) {
          const newStatus = data.fulfillment_status
            ? mapFulfillmentStatus(data.fulfillment_status)
            : mapFinancialStatus(data.financial_status);

          await db.order.update({
            where: { id: existingOrder.id },
            data: {
              status: newStatus,
              paymentStatus: mapPaymentStatus(data.financial_status),
              shopifyOrderData: JSON.stringify(data),
            },
          });

          await db.orderTrackingEvent.create({
            data: {
              orderId: existingOrder.id,
              status: newStatus,
              description: `Shopify order ${orderName} updated: financial=${data.financial_status}, fulfillment=${data.fulfillment_status || 'pending'}`,
            },
          });

          console.log(`Updated Shopify order: ${orderName}`);
        } else {
          // Order doesn't exist locally — create it (same flow as orders/create)
          console.log(`Shopify order ${orderName} not found locally, creating from orders/updated webhook`);

          const shippingAddr = data.shipping_address || {};
          const billingAddr = data.billing_address || {};
          const customer = data.customer || {};

          const financialStatus = data.financial_status || 'pending';
          const orderStatus = mapFinancialStatus(financialStatus);
          const paymentStatus = mapPaymentStatus(financialStatus);

          const newOrder = await db.order.create({
            data: {
              orderNumber: orderName || `SHO-${orderId}`,
              email: data.email || customer.email || 'no-email@shopify',
              firstName: shippingAddr.first_name || customer.first_name || billingAddr.first_name || '',
              lastName: shippingAddr.last_name || customer.last_name || billingAddr.last_name || '',
              address: shippingAddr.address1 || billingAddr.address1 || '',
              city: shippingAddr.city || billingAddr.city || '',
              state: shippingAddr.province || billingAddr.province || '',
              zipCode: shippingAddr.zip || billingAddr.zip || '',
              country: shippingAddr.country || billingAddr.country || 'IN',
              phone: data.phone || shippingAddr.phone || customer.phone || null,
              subtotal: parseFloat(data.subtotal_price) || 0,
              shipping: parseFloat(data.total_shipping_price_set?.shop_money?.amount || data.total_shipping_price_set?.presentment_money?.amount || '0'),
              tax: parseFloat(data.total_tax) || 0,
              discount: parseFloat(data.total_discounts) || 0,
              total: parseFloat(data.total_price) || 0,
              status: orderStatus,
              paymentMethod: 'shopify',
              paymentStatus: paymentStatus,
              deliveryType: 'standard',
              shopifyOrderId: shopifyGid,
              shopifyOrderName: orderName,
              shopifyOrderData: JSON.stringify(data),
            },
          });

          await db.orderTrackingEvent.create({
            data: {
              orderId: newOrder.id,
              status: orderStatus,
              description: `Order synced from Shopify: financial=${financialStatus}, fulfillment=${data.fulfillment_status || 'pending'}`,
            },
          });

          // Create OrderItem records
          const lineItems = data.line_items || [];
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
              console.log(`Product not found for line item: ${item.title} (shopify_product_id: ${shopifyProductId})`);
            }
          }

          // Link to local user
          const orderEmail = data.email || customer.email;
          if (orderEmail) {
            const localUser = await db.user.findFirst({
              where: { email: orderEmail },
              select: { id: true },
            });
            if (localUser) {
              await db.order.update({
                where: { id: newOrder.id },
                data: { userId: localUser.id },
              });
            }
          }

          console.log(`Created Shopify order from update webhook: ${orderName} with ${lineItems.length} items`);
        }
        break;
      }

      case 'orders/cancelled': {
        const orderId = data.id;
        const orderName = data.name;
        const shopifyGid = `gid://shopify/Order/${orderId}`;

        const existingOrder = await db.order.findFirst({
          where: { shopifyOrderId: shopifyGid },
        });

        if (existingOrder) {
          await db.order.update({
            where: { id: existingOrder.id },
            data: {
              status: 'cancelled',
              paymentStatus: 'refunded',
              cancelledAt: data.cancelled_at ? new Date(data.cancelled_at) : new Date(),
              cancelReason: data.cancel_reason || 'cancelled_on_shopify',
              shopifyOrderData: JSON.stringify(data),
            },
          });

          await db.orderTrackingEvent.create({
            data: {
              orderId: existingOrder.id,
              status: 'cancelled',
              description: `Order cancelled on Shopify: ${data.cancel_reason || 'No reason provided'}`,
            },
          });

          console.log(`Cancelled Shopify order: ${orderName}`);
        } else {
          console.log(`Shopify order ${orderName} not found locally for cancellation — skipping`);
        }
        break;
      }

      case 'app/uninstalled': {
        console.log('Shopify app uninstalled - cleaning up...');
        // Mark all Shopify products as out of stock
        await db.product.updateMany({
          where: { source: 'shopify' },
          data: { stockStatus: 'out_of_stock', stock: 0 },
        });
        break;
      }

      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Shopify webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/shopify/webhooks
 * Verify webhook registration and list supported topics
 */
export async function GET() {
  return NextResponse.json({
    webhookEndpoint: '/api/shopify/webhooks',
    supportedTopics: [
      'products/create',
      'products/update',
      'products/delete',
      'orders/create',
      'orders/updated',
      'orders/cancelled',
      'app/uninstalled',
    ],
    note: 'Register webhooks via POST /api/shopify/webhooks/register or in Shopify Admin > Settings > Notifications > Webhooks',
  });
}
