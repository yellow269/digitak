import { NextRequest, NextResponse } from 'next/server';
import { createPublicSupabaseClient } from '@/lib/supabase/server';
import { PUBLIC_PRODUCT_COLUMNS } from '@/lib/queries';
import type { Product } from '@/lib/types';

const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  '0-100': { min: 0, max: 100 },
  '100-500': { min: 100, max: 500 },
  '500-1000': { min: 500, max: 1000 },
  '1000+': { min: 1000, max: Infinity },
};

const SORT_MAP: Record<string, { column: string; ascending: boolean }> = {
  featured: { column: 'featured', ascending: false },
  popular: { column: 'rating', ascending: false },
  newest: { column: 'created_at', ascending: false },
  rating: { column: 'rating', ascending: false },
  'price-asc': { column: 'price', ascending: true },
  'price-desc': { column: 'price', ascending: false },
};

function sanitizeSearchInput(input: string): string {
  // Remove PostgREST filter operators to prevent injection
  let clean = input.replace(/[().*,!@#%^&=|\\<>]/g, '');
  clean = clean.trim();
  // Enforce length limits
  if (clean.length > 100) clean = clean.substring(0, 100);
  return clean;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawQ = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'all';
  const price = searchParams.get('price') || 'all';
  const sort = searchParams.get('sort') || 'featured';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const perPage = 12;

  // Sanitize search query
  const q = sanitizeSearchInput(rawQ);
  if (rawQ && q.length === 0) {
    return NextResponse.json({ products: [], error: 'Invalid search query' }, { status: 400 });
  }

  const supabase = createPublicSupabaseClient();
  let query = supabase
    .from('products')
    .select(PUBLIC_PRODUCT_COLUMNS)
    .eq('status', 'published');

  if (q && q.length >= 1) {
    query = query.or(`name.ilike.%${q}%,short_description.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (category !== 'all') {
    // Validate category is a simple slug, not an injection attempt
    const cleanCategory = category.replace(/[^a-z0-9-]/g, '').substring(0, 100);
    query = query.eq('category.slug', cleanCategory);
  }
  if (price !== 'all' && PRICE_RANGES[price]) {
    const { min, max } = PRICE_RANGES[price];
    query = query.gte('price', min);
    if (max !== Infinity) query = query.lt('price', max);
  }

  const sortCfg = SORT_MAP[sort] || SORT_MAP.featured;
  query = query.order(sortCfg.column, { ascending: sortCfg.ascending });

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, error } = await query.range(from, to);

  if (error) {
    console.error('[ProductsAPI] Query error:', error.message);
    return NextResponse.json({ products: [], error: 'Failed to fetch products' }, { status: 500 });
  }
  return NextResponse.json({ products: (data as unknown as Product[]) || [] });
}
