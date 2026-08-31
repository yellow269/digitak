import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE, PAYFAST_URL, SITE_URL } from '@/lib/constants';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

interface CheckoutItem {
  productId: string;
  name: string;
  slug: string;
  image_url: string | null;
  price: number;
  quantity: number;
  product_type: string;
  supplier_shipping_cost: number;
}

interface CheckoutPayload {
  items: CheckoutItem[];
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
    country: string;
  };
  subtotal: number;
  shipping: number;
  total: number;
}

function generatePayFastSignature(data: Record<string, string>, passphrase: string): string {
  // Sort keys and build string
  const sortedKeys = Object.keys(data).sort();
  let str = '';
  sortedKeys.forEach((key) => {
    if (data[key] !== '') {
      str += `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}&`;
    }
  });
  str = str.slice(0, -1); // Remove trailing &
  
  if (passphrase) {
    str += `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`;
  }

  return crypto.createHash('md5').update(str).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body: CheckoutPayload = await req.json();
    const { items, customer, subtotal, shipping, total } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (!customer.name || !customer.email || !customer.address || !customer.city || !customer.province || !customer.postal_code) {
      return NextResponse.json({ error: 'Missing required customer information' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Look up product details and calculate server-side totals
    let serverSubtotal = 0;
    let serverShipping = 0;
    const orderItems: {
      product_id: string;
      product_name: string;
      product_image: string | null;
      quantity: number;
      unit_price: number;
      total_price: number;
      supplier_id: string | null;
      supplier_sku: string | null;
      supplier_cost: number | null;
      supplier_shipping_cost: number | null;
      estimated_profit: number | null;
    }[] = [];

    for (const item of items) {
      const { data: product, error: productErr } = await supabase
        .from('products')
        .select('id, name, image_url, price, sale_price, selling_price, product_type, supplier_id, supplier_sku, supplier_cost, supplier_shipping_cost, estimated_profit, stock_status')
        .eq('id', item.productId)
        .eq('status', 'published')
        .single();

      if (productErr || !product) {
        console.error('[Checkout] Product not found:', item.productId, 'error:', productErr?.message);
        continue;
      }

      // Resolve the best price from the database fields
      // Priority: sale_price (if valid) < price < selling_price
      const dbPrice = product.price != null ? Number(product.price) : null;
      const dbSalePrice = product.sale_price != null ? Number(product.sale_price) : null;
      const dbSellingPrice = product.selling_price != null ? Number(product.selling_price) : null;

      let unitPrice = 0;
      if (dbSalePrice != null && dbPrice != null && dbSalePrice > 0 && dbSalePrice < dbPrice) {
        unitPrice = dbSalePrice;
      } else if (dbPrice != null && dbPrice > 0) {
        unitPrice = dbPrice;
      } else if (dbSellingPrice != null && dbSellingPrice > 0) {
        unitPrice = dbSellingPrice;
      }

      console.log('[Checkout] Product:', product.id, '| price:', dbPrice, '| sale_price:', dbSalePrice, '| selling_price:', dbSellingPrice, '| resolved unitPrice:', unitPrice);

      const itemTotal = unitPrice * item.quantity;
      const itemShipping = (product.supplier_shipping_cost || 0) * item.quantity;

      serverSubtotal += itemTotal;
      serverShipping += itemShipping;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: itemTotal,
        supplier_id: product.supplier_id,
        supplier_sku: product.supplier_sku,
        supplier_cost: product.supplier_cost,
        supplier_shipping_cost: product.supplier_shipping_cost,
        estimated_profit: product.estimated_profit,
      });
    }

    let serverTotal = Number(serverSubtotal) + Number(serverShipping);

    console.log('[Checkout] serverSubtotal:', serverSubtotal, '| serverShipping:', serverShipping, '| serverTotal:', serverTotal);

    // Validate serverTotal is a finite number greater than 0
    if (!Number.isFinite(serverTotal) || serverTotal <= 0) {
      console.error('[Checkout] Invalid serverTotal:', serverTotal);
      return NextResponse.json({ error: 'Unable to calculate order total. Please check your cart.' }, { status: 400 });
    }

    // Round to 2 decimal places, then format for PayFast: numeric only, exactly 2 decimal places
    serverTotal = Math.round(serverTotal * 100) / 100;
    const payfastAmount = Number(serverTotal).toFixed(2);

    console.log('[Checkout] payfastAmount (ZAR):', payfastAmount);

    // Validate amount before proceeding
    if (!Number.isFinite(Number(payfastAmount)) || Number(payfastAmount) <= 0) {
      console.error('[Checkout] PayFast amount validation failed:', payfastAmount);
      return NextResponse.json({ error: 'Invalid payment amount calculated.' }, { status: 400 });
    }

    // Calculate PayFast fee (3.5% + R2.00, min R5.00)
    const paymentFee = Math.max(5, serverTotal * 0.035 + 2);

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone || null,
        shipping_address: customer.address,
        shipping_city: customer.city,
        shipping_province: customer.province,
        shipping_postal_code: customer.postal_code,
        shipping_country: customer.country,
        payment_status: 'pending_payment',
        payment_method: 'payfast',
        status: 'pending_payment',
        subtotal: serverSubtotal,
        shipping_total: serverShipping,
        total: serverTotal,
        payment_fee: paymentFee,
      })
      .select('id, order_number')
      .single();

    if (orderError || !order) {
      console.error('[Checkout] Order creation error:', orderError?.message);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // Insert order items
    const orderItemRecords = orderItems.map((item) => ({
      order_id: order.id,
      ...item,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItemRecords);
    if (itemsError) {
      console.error('[Checkout] Order items error:', itemsError.message);
    }

    // Build PayFast payment data
    const payfastData: Record<string, string> = {
      merchant_id: PAYFAST_MERCHANT_ID,
      merchant_key: PAYFAST_MERCHANT_KEY,
      return_url: `${SITE_URL}/checkout/success?order=${order.order_number}`,
      cancel_url: `${SITE_URL}/checkout/cancel?order=${order.order_number}`,
      notify_url: `${SITE_URL}/api/payfast/notify`,
      email_confirmation: '1',
      confirmation_address: customer.email,
      m_payment_id: order.id,
      amount: payfastAmount,
      item_name: `Everything Store - Order #${order.order_number}`,
      item_description: `Order #${order.order_number} (${orderItems.length} items)`,
      name_first: customer.name.split(' ')[0] || customer.name,
      name_last: customer.name.split(' ').slice(1).join(' ') || '',
      email_address: customer.email,
      cell_number: customer.phone || '',
    };

    // Generate signature
    const signature = generatePayFastSignature(payfastData, PAYFAST_PASSPHRASE);

    return NextResponse.json({
      payfast_url: PAYFAST_URL,
      form_data: { ...payfastData, signature },
    });
  } catch (err) {
    console.error('[Checkout] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
