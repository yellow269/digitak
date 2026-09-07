import { NextRequest, NextResponse } from 'next/server';
import { retryFulfillment } from '@/lib/fulfillment';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = body as { orderId: string };

    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    }

    const result = await retryFulfillment(orderId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      fulfillmentId: result.fulfillmentId,
      skipped: result.skipped,
      stockIssues: result.stockIssues,
      message: result.skipped
        ? 'Fulfillment already exists.'
        : result.stockIssues && result.stockIssues.length > 0
          ? `Fulfillment created with ${result.stockIssues.length} stock issue(s).`
          : 'Fulfillment created successfully.',
    });
  } catch (err) {
    console.error('[RetryFulfillment] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
