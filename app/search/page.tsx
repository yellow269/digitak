import { Suspense } from 'react';
import { SearchBrowser } from '@/components/search-browser';
import { createPublicSupabaseClient } from '@/lib/supabase/server';
import { PUBLIC_PRODUCT_COLUMNS } from '@/lib/queries';
import type { Product } from '@/lib/types';

export const dynamic = 'force-dynamic';

function sanitizeSearchInput(input: string): string {
  let clean = input.replace(/[().*,!@#%^&=|\\<>]/g, '');
  clean = clean.trim();
  if (clean.length > 100) clean = clean.substring(0, 100);
  return clean;
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const rawQ = searchParams.q || '';
  const q = sanitizeSearchInput(rawQ);
  let products: Product[] = [];

  if (q && q.length >= 1) {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select(PUBLIC_PRODUCT_COLUMNS)
      .eq('status', 'published')
      .or(`name.ilike.%${q}%,short_description.ilike.%${q}%,description.ilike.%${q}%,vendor_name.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(24);

    if (error) {
      console.error('[SearchPage] Query error:', error.message);
    }
    products = (data as unknown as Product[]) || [];
  }

  return (
    <Suspense fallback={<div className="container mx-auto max-w-7xl px-4 py-8">Loading...</div>}>
      <SearchBrowser initialProducts={products} query={rawQ} />
    </Suspense>
  );
}
