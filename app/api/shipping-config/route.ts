import { NextResponse } from 'next/server';
import { loadShippingConfig } from '@/lib/shipping-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await loadShippingConfig();
  return NextResponse.json(config);
}
