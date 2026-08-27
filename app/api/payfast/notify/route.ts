import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
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
  const passphrase = process.env.PAYFAST_PASSPHRASE || '';
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

    if (!mPaymentId) {
      return new NextResponse('OK', { status: 200 });
    }

    // Verify payment with PayFast
    const isValid = await verifyPayment(params);
    if (!isValid) {
      console.error('[PayFast] Invalid payment notification');
      return new NextResponse('INVALID', { status: 400 });
    }

    const supabase = createServiceRoleClient();

    if (paymentStatus === 'COMPLETE') {
      // Update order status
      await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'paid',
          payfast_payment_id: params.pf_payment_id || null,
        })
        .eq('id', mPaymentId)
        .eq('payment_status', 'pending_payment');
    } else if (paymentStatus === 'FAILED') {
      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          status: 'cancelled',
        })
        .eq('id', mPaymentId);
    } else if (paymentStatus === 'CANCELLED') {
      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          status: 'cancelled',
        })
        .eq('id', mPaymentId);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[PayFast] Notify error:', err);
    return new NextResponse('ERROR', { status: 500 });
  }
}
