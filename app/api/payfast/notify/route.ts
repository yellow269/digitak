import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { processPaidOrder, emitEmailEvent } from '@/lib/fulfillment';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function generateSignature(data: Record<string, string>, passphrase: string): string {
  const sortedKeys = Object.keys(data).sort();
  let str = '';
  sortedKeys.forEach((key) => {
    if (key !== 'signature' && data[key] !== '') {
      str += `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}&`;
    }
  });
  str = str.slice(0, -1);
  if (passphrase) {
    str += `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`;
  }
  return crypto.createHash('md5').update(str).digest('hex');
}

async function verifyPayment(params: Record<string, string>): Promise<boolean> {
  const validateUrl = process.env.PAYFAST_SANDBOX === 'true'
    ? 'https://sandbox.payfast.co.za/eng/query/validate'
    : 'https://www.payfast.co.za/eng/query/validate';

  try {
    const response = await fetch(validateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
    const text = await response.text();
    return text.trim() === 'VALID';
  } catch {
    console.error('[PayFast] Validation request failed');
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const paymentStatus = params.payment_status;
    const mPaymentId = params.m_payment_id;

    console.log(`[PayFast] ITN received: status=${paymentStatus}, payment_id=${mPaymentId}`);

    if (!mPaymentId) {
      console.warn('[PayFast] No m_payment_id in notification — ignoring');
      return new NextResponse('OK', { status: 200 });
    }

    // Verify payment with PayFast
    const isValid = await verifyPayment(params);
    if (!isValid) {
      console.error('[PayFast] Invalid payment notification for order:', mPaymentId);
      return new NextResponse('INVALID', { status: 400 });
    }

    const supabase = createServiceRoleClient();

    if (paymentStatus === 'COMPLETE') {
      // Idempotent: only update if still pending_payment
      const { data: order, error: fetchErr } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_email, total, payment_status')
        .eq('id', mPaymentId)
        .single();

      if (fetchErr || !order) {
        console.error('[PayFast] Order not found:', mPaymentId);
        return new NextResponse('OK', { status: 200 });
      }

      // Already processed — idempotent skip
      if (order.payment_status === 'paid') {
        console.log(`[PayFast] Order #${order.order_number} already paid — skipping`);
        return new NextResponse('OK', { status: 200 });
      }

      // Only process if pending
      if (order.payment_status !== 'pending_payment') {
        console.warn(`[PayFast] Order #${order.order_number} has status "${order.payment_status}" — not pending. Skipping.`);
        return new NextResponse('OK', { status: 200 });
      }

      // Update payment status + paid_at
      const { error: updateErr } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'paid',
          payfast_payment_id: params.pf_payment_id || null,
          paid_at: new Date().toISOString(),
        })
        .eq('id', mPaymentId)
        .eq('payment_status', 'pending_payment');

      if (updateErr) {
        console.error('[PayFast] Failed to update order:', updateErr.message);
        return new NextResponse('ERROR', { status: 500 });
      }

      console.log(`[PayFast] Order #${order.order_number} marked as paid`);

      // Emit payment confirmed email event
      emitEmailEvent('PAYMENT_CONFIRMED', {
        orderId: order.id,
        orderNumber: order.order_number,
        customerEmail: order.customer_email,
        customerName: order.customer_name,
      });

      // Automatically process the order → create fulfillment records
      // This moves the order from "Paid" to "Supplier Processing"
      try {
        const result = await processPaidOrder(mPaymentId);
        if (result.success) {
          console.log(`[PayFast] Order #${order.order_number} fulfillment processed successfully`, {
            fulfillmentId: result.fulfillmentId,
            skipped: result.skipped,
            stockIssues: result.stockIssues,
          });

          emitEmailEvent('SUPPLIER_PROCESSING', {
            orderId: order.id,
            orderNumber: order.order_number,
            customerEmail: order.customer_email,
            customerName: order.customer_name,
          });
        } else {
          console.error(`[PayFast] Order #${order.order_number} fulfillment failed:`, result.error);
          // Order is still marked as paid — admin can retry fulfillment manually
        }
      } catch (fulfillmentErr) {
        console.error(`[PayFast] Order #${order.order_number} fulfillment error:`, fulfillmentErr);
        // Order is still marked as paid — admin can retry fulfillment manually
      }

    } else if (paymentStatus === 'FAILED') {
      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          status: 'cancelled',
        })
        .eq('id', mPaymentId);

      console.log(`[PayFast] Order ${mPaymentId} payment failed`);
      emitEmailEvent('CANCELLED', {
        orderId: mPaymentId,
        orderNumber: 0,
        customerEmail: '',
        customerName: '',
      });

    } else if (paymentStatus === 'CANCELLED') {
      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          status: 'cancelled',
        })
        .eq('id', mPaymentId);

      console.log(`[PayFast] Order ${mPaymentId} payment cancelled`);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[PayFast] Notify error:', err);
    return new NextResponse('ERROR', { status: 500 });
  }
}
