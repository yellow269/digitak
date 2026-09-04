import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  ZALEMART_FEED_URL,
  ZALEMART_BASE_URL,
  parseZalemartCsv,
  mapZalemartTypeToCategoryId,
  calculateSellingPrice,
  type ZalemartProduct,
} from '@/lib/zalemart';
import { slugify } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type SyncResult = {
  productsFound: number;
  productsCreated: number;
  productsUpdated: number;
  productsDeactivated: number;
  variantsTotal: number;
  errors: string[];
};

async function fetchFeed(): Promise<string> {
  const res = await fetch(ZALEMART_FEED_URL, {
    headers: { 'Accept': 'text/csv' },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status} ${res.statusText}`);
  return res.text();
}

async function getCategoryMap(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>): Promise<Record<string, string>> {
  const { data: cats } = await supabase.from('categories').select('id, slug');
  const map: Record<string, string> = {};
  for (const c of cats || []) {
    map[c.slug] = c.id;
  }
  return map;
}

async function getZalemartSupplierId(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>): Promise<string> {
  const { data } = await supabase
    .from('suppliers')
    .select('id')
    .eq('name', 'Zalemart')
    .single();
  if (!data) throw new Error('Zalemart supplier not found. Run migration 0015 first.');
  return data.id;
}

async function getExistingProducts(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  supplierId: string
): Promise<Map<string, { id: string; supplier_handle: string; auto_repricing: boolean; selling_price: number | null; markup_percentage: number | null }>> {
  const { data } = await supabase
    .from('products')
    .select('id, supplier_handle, auto_repricing, selling_price, markup_percentage')
    .eq('supplier_id', supplierId)
    .not('supplier_handle', 'is', null);

  const map = new Map();
  for (const p of data || []) {
    map.set(p.supplier_handle, p);
  }
  return map;
}

function buildProductRow(
  product: ZalemartProduct,
  supplierId: string,
  categoryId: string | null,
  existing: { id?: string; selling_price?: number | null; markup_percentage?: number | null } | null,
  defaultMarkupPct: number = 40
) {
  const slug = slugify(product.title);
  const supplierCost = product.minCost || null;
  const markupPct = existing?.markup_percentage ?? defaultMarkupPct;

  let sellingPrice: number | null = null;
  if (existing?.selling_price && !product.minCost) {
    sellingPrice = existing.selling_price;
  } else if (supplierCost) {
    sellingPrice = calculateSellingPrice(supplierCost, markupPct, 0);
  }

  const stockStatus =
    product.totalStock === 0
      ? 'out_of_stock'
      : product.totalStock <= 5
        ? 'low_stock'
        : 'in_stock';

  const images = product.variants
    .map((v) => v.imageUrl)
    .filter((url): url is string => !!url);
  const imageUrl = images[0] || product.imageUrl || null;

  const description = product.description
    ? product.description.replace(/<[^>]+>/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    : null;

  const shortDesc = description
    ? stripHtmlSimple(description).slice(0, 500)
    : null;

  return {
    name: product.title,
    slug,
    short_description: shortDesc,
    description,
    category_id: categoryId,
    vendor_name: product.vendor || 'Zalemart',
    image_url: imageUrl,
    price: product.variants[0]?.price || null,
    currency: 'ZAR',
    status: existing?.id ? undefined : 'draft',
    product_type: 'dropshipping',
    supplier_id: supplierId,
    supplier_handle: product.handle,
    supplier_sku: product.variants[0]?.sku || null,
    supplier_cost: supplierCost,
    supplier_url: `${ZALEMART_BASE_URL}/${product.handle}`,
    markup_percentage: markupPct,
    selling_price: sellingPrice,
    stock_status: stockStatus,
    quantity_available: product.totalStock,
    options: product.options.length > 0 ? product.options : undefined,
    sync_enabled: true,
    last_synced_at: new Date().toISOString(),
  };
}

function stripHtmlSimple(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'sync';
    const selectedHandles: string[] | undefined = body.selectedHandles;
    const defaultMarkupPct = body.markupPercentage || 40;

    const feedText = await fetchFeed();
    let products = parseZalemartCsv(feedText);
    if (products.length === 0) {
      return NextResponse.json({ error: 'No products found in feed' }, { status: 400 });
    }

    if (selectedHandles && selectedHandles.length > 0) {
      products = products.filter((p) => selectedHandles.includes(p.handle));
    }

    const supplierId = await getZalemartSupplierId(supabase);
    const categoryMap = await getCategoryMap(supabase);
    const existingMap = await getExistingProducts(supabase, supplierId);

    const syncLog = await supabase
      .from('supplier_sync_log')
      .insert({
        supplier_id: supplierId,
        sync_type: mode === 'import' ? 'import' : 'sync',
        feed_url: ZALEMART_FEED_URL,
        products_found: products.length,
        variants_total: products.reduce((sum, p) => sum + p.variants.length, 0),
        status: 'running',
      })
      .select('id')
      .single();

    const logId = syncLog.data?.id;

    const result: SyncResult = {
      productsFound: products.length,
      productsCreated: 0,
      productsUpdated: 0,
      productsDeactivated: 0,
      variantsTotal: products.reduce((sum, p) => sum + p.variants.length, 0),
      errors: [],
    };

    // Handle deactivation: products in DB but not in feed
    if (mode === 'sync') {
      const feedHandles = new Set(products.map((p) => p.handle));
      for (const [handle, existing] of existingMap) {
        if (!feedHandles.has(handle)) {
          try {
            await supabase
              .from('products')
              .update({
                stock_status: 'out_of_stock',
                quantity_available: 0,
                last_synced_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
            result.productsDeactivated++;
          } catch (err) {
            result.errors.push(`Deactivate ${handle}: ${err}`);
          }
        }
      }
    }

    // Process each product
    for (const product of products) {
      try {
        const categoryId = mapZalemartTypeToCategoryId(product.productType, categoryMap);
        const existing = existingMap.get(product.handle);
        const row = buildProductRow(product, supplierId, categoryId, existing || null, defaultMarkupPct);

        if (existing) {
          // Update: preserve selling_price if auto_repricing is off
          const updateData: Record<string, unknown> = {
            name: row.name,
            short_description: row.short_description,
            description: row.description,
            category_id: row.category_id,
            vendor_name: row.vendor_name,
            image_url: row.image_url,
            price: row.price,
            supplier_cost: row.supplier_cost,
            supplier_url: row.supplier_url,
            stock_status: row.stock_status,
            quantity_available: row.quantity_available,
            options: row.options,
            last_synced_at: new Date().toISOString(),
          };

          if (existing.auto_repricing) {
            updateData.selling_price = row.selling_price;
            updateData.markup_percentage = row.markup_percentage;
          }

          await supabase.from('products').update(updateData).eq('id', existing.id);
          result.productsUpdated++;
        } else if (mode === 'import') {
          // Only create new in import mode
          const { error } = await supabase.from('products').insert(row);
          if (error) {
            result.errors.push(`${product.handle}: ${error.message}`);
          } else {
            result.productsCreated++;
          }
        }
      } catch (err) {
        result.errors.push(`${product.handle}: ${err}`);
      }
    }

    // Update sync log
    if (logId) {
      await supabase
        .from('supplier_sync_log')
        .update({
          completed_at: new Date().toISOString(),
          status: result.errors.length > 0 ? 'completed' : 'completed',
          products_created: result.productsCreated,
          products_updated: result.productsUpdated,
          products_deactivated: result.productsDeactivated,
          error_message: result.errors.length > 0 ? result.errors.join('\n') : null,
        })
        .eq('id', logId);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[ZalemartSync] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get latest sync logs
    const { data: logs } = await supabase
      .from('supplier_sync_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get supplier
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('*')
      .eq('name', 'Zalemart')
      .single();

    // Count synced products
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', supplier?.id || '')
      .not('supplier_handle', 'is', null);

    const { count: activeProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', supplier?.id || '')
      .not('supplier_handle', 'is', null)
      .neq('stock_status', 'out_of_stock');

    return NextResponse.json({
      supplier,
      logs: logs || [],
      totalProducts: totalProducts || 0,
      activeProducts: activeProducts || 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
