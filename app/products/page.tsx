import { ProductsBrowser } from '@/components/products-browser';
import { createPublicSupabaseClient } from '@/lib/supabase/server';
import { PUBLIC_PRODUCT_COLUMNS } from '@/lib/queries';
import type { Product, Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const supabase = createPublicSupabaseClient();
  const [productsRes, categoriesRes] = await Promise.all([
    supabase
      .from('products')
      .select(PUBLIC_PRODUCT_COLUMNS)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
  ]);

  if (productsRes.error) {
    console.error('[ProductsPage] Error fetching products:', productsRes.error.message);
  }
  if (categoriesRes.error) {
    console.error('[ProductsPage] Error fetching categories:', categoriesRes.error.message);
  }

  return (
    <ProductsBrowser
      initialProducts={(productsRes.data as unknown as Product[]) || []}
      categories={(categoriesRes.data as unknown as Category[]) || []}
    />
  );
}
