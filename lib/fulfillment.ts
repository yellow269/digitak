/**
 * Supplier fulfillment service.
 *
 * Creates supplier_fulfillments AND shipments records from paid orders.
 * Handles stock validation, data snapshots, idempotency, and error states.
 *
 * Called by the PayFast notification handler after payment is confirmed.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ShipmentStatus } from '@/lib/types';

type SupabaseClient = ReturnType<typeof createServiceRoleClient>;

export type FulfillmentResult = {
  success: boolean;
  fulfillmentId?: string;
  shipmentIds?: string[];
  skipped?: boolean;
  error?: string;
  stockIssues?: string[];
};

/**
 * Process a paid order: validate stock, create fulfillment + shipment records, update status.
 * Idempotent — safe to call multiple times for the same order.
 */
export async function processPaidOrder(orderId: string): Promise<FulfillmentResult> {
  const supabase = createServiceRoleClient();

  // 1. Fetch the order
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    return { success: false, error: `Order not found: ${orderId}` };
  }

  // 2. Check if fulfillment already exists (idempotency)
  const { data: existingFulfillments } = await supabase
    .from('supplier_fulfillments')
    .select('id, supplier_id')
    .eq('order_id', orderId);

  const existingSupplierIds = new Set(
    (existingFulfillments || []).map((f) => f.supplier_id)
  );

  // 2b. Check if shipments already exist (idempotency)
  const { data: existingShipments } = await supabase
    .from('shipments')
    .select('id, supplier_id')
    .eq('order_id', orderId);

  const existingShipmentSupplierIds = new Set(
    (existingShipments || []).map((s) => s.supplier_id)
  );

  // 3. Fetch order items with supplier info
  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  if (itemsErr || !items || items.length === 0) {
    return { success: false, error: 'No order items found' };
  }

  // 4. Fetch suppliers for the items
  const supplierIds = [...new Set(items.map((i) => i.supplier_id).filter(Boolean))] as string[];
  const supplierMap = new Map<string, { id: string; name: string }>();

  if (supplierIds.length > 0) {
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, name')
      .in('id', supplierIds);

    for (const s of suppliers || []) {
      supplierMap.set(s.id, s);
    }
  }

  // 5. Fetch product data for stock validation
  const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))] as string[];
  const productMap = new Map<string, {
    id: string;
    name: string;
    variant_stock: Record<string, { stock: number; sku: string; price?: number }> | null;
    stock_status: string;
    quantity_available: number;
  }>();

  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, variant_stock, stock_status, quantity_available')
      .in('id', productIds);

    for (const p of products || []) {
      productMap.set(p.id, p);
    }
  }

  // 6. Group items by supplier for fulfillment records
  const itemsBySupplier = new Map<string, typeof items>();
  const unsuppliedItems: typeof items = [];

  for (const item of items) {
    if (item.supplier_id) {
      const list = itemsBySupplier.get(item.supplier_id) || [];
      list.push(item);
      itemsBySupplier.set(item.supplier_id, list);
    } else {
      unsuppliedItems.push(item);
    }
  }

  // 7. Create fulfillment records (one per item per supplier)
  const stockIssues: string[] = [];
  const fulfillments: Record<string, unknown>[] = [];

  for (const item of items) {
    const supplier = item.supplier_id ? supplierMap.get(item.supplier_id) : null;
    const product = item.product_id ? productMap.get(item.product_id) : null;

    // Skip items without a supplier
    if (!supplier) continue;

    // Skip if fulfillment already exists for this order+supplier
    if (existingSupplierIds.has(supplier.id)) continue;

    // Stock validation
    let stockValid = true;
    let stockError = '';

    if (product) {
      if (product.stock_status === 'out_of_stock' && product.quantity_available <= 0) {
        stockValid = false;
        stockError = `Product "${product.name}" is out of stock (available: ${product.quantity_available})`;
      }

      // Validate variant stock if options exist
      if (product.variant_stock && item.selected_options && Object.keys(item.selected_options).length > 0) {
        const variantKey = Object.entries(item.selected_options as Record<string, { name: string; hex?: string }>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v.name}`)
          .join(':');

        const variant = product.variant_stock[variantKey];
        if (variant) {
          if (variant.stock < item.quantity) {
            stockValid = false;
            stockError = `Insufficient stock for variant "${variantKey}": need ${item.quantity}, have ${variant.stock}`;
          }
        }
      }
    }

    if (!stockValid) {
      stockIssues.push(stockError);
    }

    // Build fulfillment record
    const fulfillment: Record<string, unknown> = {
      order_id: orderId,
      order_number: order.order_number,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      product_id: item.product_id,
      product_name: item.product_name,
      product_image: item.product_image,
      supplier_handle: null,
      supplier_sku: item.supplier_sku,
      variant_sku: item.variant_sku,
      selected_options: item.selected_options,
      quantity: item.quantity,
      supplier_cost: item.supplier_cost,
      selling_price: item.unit_price,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      shipping_address: order.shipping_address,
      shipping_city: order.shipping_city,
      shipping_province: order.shipping_province,
      shipping_postal_code: order.shipping_postal_code,
      shipping_country: order.shipping_country || 'South Africa',
      status: stockValid ? 'pending' : 'error',
      error_message: stockValid ? null : stockError,
      error_at: stockValid ? null : new Date().toISOString(),
    };

    fulfillments.push(fulfillment);
  }

  // 8. Insert fulfillment records
  let createdId: string | undefined;

  if (fulfillments.length > 0) {
    const { data: inserted, error: insertErr } = await supabase
      .from('supplier_fulfillments')
      .insert(fulfillments)
      .select('id');

    if (insertErr) {
      if (insertErr.message?.includes('duplicate key')) {
        return { success: true, skipped: true };
      }
      return { success: false, error: `Failed to create fulfillment: ${insertErr.message}` };
    }

    createdId = inserted?.[0]?.id;
  }

  // 9. Create shipment records (one per supplier)
  const shipmentIds: string[] = [];

  for (const [supplierId, supplierItems] of itemsBySupplier) {
    // Skip if shipment already exists for this order+supplier
    if (existingShipmentSupplierIds.has(supplierId)) continue;

    const supplier = supplierMap.get(supplierId);
    if (!supplier) continue;

    // Check if any items have stock issues
    const hasStockIssue = supplierItems.some((item) => {
      const product = item.product_id ? productMap.get(item.product_id) : null;
      if (!product) return false;
      if (product.stock_status === 'out_of_stock' && product.quantity_available <= 0) return true;
      if (product.variant_stock && item.selected_options && Object.keys(item.selected_options).length > 0) {
        const variantKey = Object.entries(item.selected_options as Record<string, { name: string; hex?: string }>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v.name}`)
          .join(':');
        const variant = product.variant_stock[variantKey];
        if (variant && variant.stock < item.quantity) return true;
      }
      return false;
    });

    const shipmentStatus: ShipmentStatus = hasStockIssue ? 'pending' : 'processing';

    // Calculate supplier cost for this shipment
    const supplierCost = supplierItems.reduce((sum, item) => {
      return sum + (item.supplier_cost ? item.supplier_cost * item.quantity : 0);
    }, 0);

    const { data: shipment, error: shipmentErr } = await supabase
      .from('shipments')
      .insert({
        order_id: orderId,
        order_number: order.order_number,
        supplier_id: supplierId,
        supplier_name: supplier.name,
        status: shipmentStatus,
        shipping_cost: 0,
      })
      .select('id')
      .single();

    if (shipmentErr) {
      if (shipmentErr.message?.includes('duplicate key')) continue;
      console.error(`[Fulfillment] Failed to create shipment for supplier ${supplier.name}:`, shipmentErr.message);
      continue;
    }

    shipmentIds.push(shipment.id);

    // Create shipment items
    const shipmentItems = supplierItems.map((item) => ({
      shipment_id: shipment.id,
      order_item_id: item.id,
      quantity: item.quantity,
    }));

    await supabase.from('shipment_items').insert(shipmentItems);
  }

  // 10. Update order status to supplier_processing
  const orderUpdate: Record<string, unknown> = {
    status: 'supplier_processing',
  };

  if (!order.paid_at) {
    orderUpdate.paid_at = new Date().toISOString();
  }

  if (stockIssues.length > 0) {
    orderUpdate.fulfillment_error = stockIssues.join('; ');
    orderUpdate.fulfillment_error_at = new Date().toISOString();
  }

  await supabase
    .from('orders')
    .update(orderUpdate)
    .eq('id', orderId);

  // 11. Create admin notification
  await createAdminNotification(supabase, {
    type: stockIssues.length > 0 ? 'fulfillment_stock_issue' : 'new_paid_order',
    title: stockIssues.length > 0
      ? `Order #${order.order_number} — Stock Issue`
      : `New paid order #${order.order_number}`,
    message: stockIssues.length > 0
      ? `Order #${order.order_number} from ${order.customer_name} has stock issues: ${stockIssues.join('; ')}`
      : `Order #${order.order_number} from ${order.customer_name} (${formatCurrency(order.total)}) is ready for supplier fulfillment.`,
    referenceId: orderId,
    referenceType: 'order',
  });

  return {
    success: true,
    fulfillmentId: createdId,
    shipmentIds: shipmentIds.length > 0 ? shipmentIds : undefined,
    stockIssues: stockIssues.length > 0 ? stockIssues : undefined,
  };
}

/**
 * Retry fulfillment for an order that previously failed.
 * Idempotent — won't create duplicates.
 */
export async function retryFulfillment(orderId: string): Promise<FulfillmentResult> {
  const supabase = createServiceRoleClient();

  // Clear any previous error state
  await supabase
    .from('orders')
    .update({
      fulfillment_error: null,
      fulfillment_error_at: null,
    })
    .eq('id', orderId);

  // Delete existing error fulfillments so they can be recreated
  await supabase
    .from('supplier_fulfillments')
    .delete()
    .eq('order_id', orderId)
    .eq('status', 'error');

  // Re-process
  return processPaidOrder(orderId);
}

/**
 * Update shipment status. Sets shipped_at/delivered_at timestamps.
 * Does NOT update the parent order status — that should be derived separately.
 */
export async function updateShipmentStatus(
  shipmentId: string,
  status: ShipmentStatus
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const update: Record<string, unknown> = { status };

  if (status === 'shipped') {
    update.shipped_at = new Date().toISOString();
  } else if (status === 'delivered') {
    update.delivered_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('shipments')
    .update(update)
    .eq('id', shipmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Derive order status from all shipments
  const { data: shipment } = await supabase
    .from('shipments')
    .select('order_id')
    .eq('id', shipmentId)
    .single();

  if (shipment) {
    await deriveOrderStatusFromShipments(shipment.order_id);
  }

  return { success: true };
}

/**
 * Derive the overall order status from its shipments.
 * All cancelled → Cancelled. All delivered → Delivered.
 * Mix → Partially Shipped/Delivered. None shipped → Supplier Processing.
 */
export async function deriveOrderStatusFromShipments(orderId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: shipments } = await supabase
    .from('shipments')
    .select('status')
    .eq('order_id', orderId);

  if (!shipments || shipments.length === 0) return;

  const statuses = shipments.map((s) => s.status);
  const allDelivered = statuses.every((s) => s === 'delivered');
  const allCancelled = statuses.every((s) => s === 'cancelled');
  const anyShipped = statuses.some((s) => s === 'shipped');
  const anyDelivered = statuses.some((s) => s === 'delivered');
  const anyProcessing = statuses.some((s) => s === 'processing' || s === 'pending');

  let orderStatus: string;

  if (allCancelled) {
    orderStatus = 'cancelled';
  } else if (allDelivered) {
    orderStatus = 'delivered';
  } else if (anyDelivered || (anyShipped && anyDelivered)) {
    orderStatus = 'delivered'; // Partially delivered still shows as delivered at order level
  } else if (anyShipped) {
    orderStatus = 'shipped';
  } else if (anyProcessing) {
    orderStatus = 'supplier_processing';
  } else {
    orderStatus = 'supplier_processing';
  }

  await supabase
    .from('orders')
    .update({ status: orderStatus })
    .eq('id', orderId);
}

/**
 * Create an admin notification record.
 */
async function createAdminNotification(
  supabase: SupabaseClient,
  notification: {
    type: string;
    title: string;
    message: string;
    referenceId?: string;
    referenceType?: string;
  }
) {
  try {
    await supabase.from('admin_notifications').insert({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      reference_id: notification.referenceId || null,
      reference_type: notification.referenceType || null,
    });
  } catch (err) {
    console.error('[Fulfillment] Failed to create admin notification:', err);
  }
}

function formatCurrency(amount: number): string {
  return `R${Number(amount).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Email event hooks (architecture ready for Stage 2).
 */
export const EMAIL_EVENTS = {
  ORDER_CONFIRMED: 'order_confirmed',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  SUPPLIER_PROCESSING: 'supplier_processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export function emitEmailEvent(
  event: keyof typeof EMAIL_EVENTS,
  data: {
    orderId: string;
    orderNumber: number;
    customerEmail: string;
    customerName: string;
    [key: string]: unknown;
  }
) {
  console.log(`[EmailEvent] ${event}: Order #${data.orderNumber} → ${data.customerEmail}`);
}
