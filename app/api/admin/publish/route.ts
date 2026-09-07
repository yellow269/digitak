import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  price: number | null;
  selling_price: number | null;
  supplier_cost: number | null;
  stock_status: string;
  quantity_available: number;
  status: string;
  options: unknown;
  variant_stock: unknown;
  supplier_handle: string | null;
  category_id: string | null;
  category: { name: string } | null;
};

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50')));
    const offset = (page - 1) * pageSize;

    const stockFilter = searchParams.get('stock'); // in_stock, out_of_stock, low_stock
    const statusFilter = searchParams.get('status'); // draft, published
    const hasImage = searchParams.get('hasImage'); // true, false
    const hasVariants = searchParams.get('hasVariants'); // true, false
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    const search = searchParams.get('search');

    // Build query with filters using Supabase's filter API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('products')
      .select(
        'id, name, slug, image_url, price, selling_price, supplier_cost, stock_status, quantity_available, status, options, variant_stock, supplier_handle, category_id, category:categories(name)',
        { count: 'exact', head: false }
      )
      .eq('product_type', 'dropshipping')
      .not('supplier_handle', 'is', null);

    // Filters
    if (stockFilter) {
      query = query.eq('stock_status', stockFilter);
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (hasImage === 'true') {
      query = query.not('image_url', 'is', null);
    } else if (hasImage === 'false') {
      query = query.is('image_url', null);
    }
    if (hasVariants === 'true') {
      query = query.neq('options', '[]');
    } else if (hasVariants === 'false') {
      query = query.eq('options', '[]');
    }
    if (minPrice) {
      query = query.gte('selling_price', parseFloat(minPrice));
    }
    if (maxPrice) {
      query = query.lte('selling_price', parseFloat(maxPrice));
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%,supplier_handle.ilike.%${search}%`);
    }

    // Sorting
    const ascending = order === 'asc';
    if (sort === 'name') query = query.order('name', { ascending });
    else if (sort === 'price') query = query.order('selling_price', { ascending, nullsFirst: false });
    else if (sort === 'stock') query = query.order('quantity_available', { ascending });
    else if (sort === 'status') query = query.order('status', { ascending });
    else query = query.order('created_at', { ascending });

    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Summary stats (unfiltered counts)
    const { count: totalProducts } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('product_type', 'dropshipping')
      .not('supplier_handle', 'is', null);

    const { count: draftCount } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('product_type', 'dropshipping')
      .not('supplier_handle', 'is', null)
      .eq('status', 'draft');

    const { count: publishedCount } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('product_type', 'dropshipping')
      .not('supplier_handle', 'is', null)
      .eq('status', 'published');

    const { count: outOfStockCount } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('product_type', 'dropshipping')
      .not('supplier_handle', 'is', null)
      .eq('stock_status', 'out_of_stock');

    return NextResponse.json({
      products: (data as unknown as ProductRow[]) || [],
      total: count || 0,
      page,
      pageSize,
      stats: {
        total: totalProducts || 0,
        draft: draftCount || 0,
        published: publishedCount || 0,
        outOfStock: outOfStockCount || 0,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const body = await req.json();
    const { action, productIds } = body as {
      action: 'publish' | 'unpublish';
      productIds: string[];
    };

    if (!action || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'action and productIds required' }, { status: 400 });
    }

    if (!['publish', 'unpublish'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'publish') {
      // Only publish products that are in stock
      // First, check which ones are in stock
      const { data: products } = await supabase
        .from('products')
        .select('id, stock_status')
        .in('id', productIds);

      const inStockIds = (products || [])
        .filter((p) => p.stock_status !== 'out_of_stock')
        .map((p) => p.id);

      const skippedCount = productIds.length - inStockIds.length;

      if (inStockIds.length === 0) {
        return NextResponse.json({
          published: 0,
          skipped: skippedCount,
          message: 'All selected products are out of stock. Only in-stock products can be published.',
        });
      }

      const { error } = await supabase
        .from('products')
        .update({ status: 'published' })
        .in('id', inStockIds);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        published: inStockIds.length,
        skipped: skippedCount,
        message: skippedCount > 0
          ? `Published ${inStockIds.length} products. ${skippedCount} out-of-stock products were skipped.`
          : `Published ${inStockIds.length} products.`,
      });
    }

    // Unpublish
    const { error } = await supabase
      .from('products')
      .update({ status: 'draft' })
      .in('id', productIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      unpublished: productIds.length,
      message: `Unpublished ${productIds.length} products.`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
