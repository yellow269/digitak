import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ZALEMART_FEED_URL, parseZalemartCsv } from '@/lib/zalemart';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const search = url.searchParams.get('search') || '';

    const res = await fetch(ZALEMART_FEED_URL, {
      headers: { Accept: 'text/csv' },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Feed fetch failed: ${res.status}` }, { status: 502 });
    }

    const feedText = await res.text();
    const allProducts = parseZalemartCsv(feedText);

    // Get existing product handles
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('name', 'Zalemart')
      .single();

    let existingHandles = new Set<string>();
    if (supplier) {
      const { data: existing } = await supabase
        .from('products')
        .select('supplier_handle')
        .eq('supplier_id', supplier.id)
        .not('supplier_handle', 'is', null);
      for (const p of existing || []) {
        if (p.supplier_handle) existingHandles.add(p.supplier_handle);
      }
    }

    let filtered = allProducts;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.handle.toLowerCase().includes(q) ||
          p.productType.toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    const preview = paginated.map((p) => ({
      handle: p.handle,
      title: p.title,
      productType: p.productType,
      variantCount: p.variants.length,
      totalStock: p.totalStock,
      minCost: p.minCost,
      imageUrl: p.imageUrl,
      alreadyImported: existingHandles.has(p.handle),
      options: p.options.map((o) => o.type).join(', '),
    }));

    return NextResponse.json({ total, products: preview, offset, limit });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
