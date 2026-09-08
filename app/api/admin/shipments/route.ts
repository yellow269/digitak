import { NextRequest, NextResponse } from 'next/server';
import { updateShipmentStatus } from '@/lib/fulfillment';
import type { ShipmentStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shipmentId, status } = body as { shipmentId: string; status: ShipmentStatus };

    if (!shipmentId || !status) {
      return NextResponse.json({ error: 'shipmentId and status required' }, { status: 400 });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
    }

    const result = await updateShipmentStatus(shipmentId, status);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ShipmentUpdate] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
