import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/orders/[id]/invoice - Return invoice details for an order
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Look up the order with all related data
    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        invoice: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // If no invoice exists yet, generate one
    let invoice = order.invoice
    if (!invoice) {
      const timestamp = Date.now().toString(36).toUpperCase()
      const random = Math.random().toString(36).substring(2, 6).toUpperCase()
      const invoiceNumber = `INV-${timestamp}-${random}`

      invoice = await db.orderInvoice.create({
        data: {
          orderId: order.id,
          invoiceNumber,
          amount: order.subtotal,
          tax: order.tax,
          total: order.total,
          status: 'generated',
        },
      })
    }

    // Build invoice response
    const invoiceItems = order.items.map((item) => {
      const itemTotal = item.price * item.quantity
      return {
        id: item.id,
        productId: item.productId,
        productName: item.name,
        productSku: item.product?.sku || null,
        variantId: item.variantId,
        variantName: item.variantName,
        price: item.price,
        quantity: item.quantity,
        total: Math.round(itemTotal * 100) / 100,
        giftWrapping: item.giftWrapping,
        hidePrice: item.hidePrice,
      }
    })

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        pdfUrl: invoice.pdfUrl,
        createdAt: invoice.createdAt,
      },
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        date: order.createdAt,
        customer: {
          firstName: order.firstName,
          lastName: order.lastName,
          email: order.email,
          phone: order.phone,
          address: order.address,
          city: order.city,
          state: order.state,
          zipCode: order.zipCode,
          country: order.country,
        },
        delivery: {
          type: order.deliveryType,
          scheduledDate: order.scheduledDate,
          occasion: order.occasion,
        },
        giftOptions: {
          giftWrapping: order.giftWrapping,
          giftWrapStyle: order.giftWrapStyle,
          greetingMessage: order.greetingMessage,
          hidePrice: order.hidePrice,
        },
        couponCode: order.couponCode,
        items: invoiceItems,
        subtotal: order.subtotal,
        shipping: order.shipping,
        tax: order.tax,
        taxRate: '8%',
        discount: order.discount,
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
      },
    })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}
