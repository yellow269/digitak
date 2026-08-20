import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProductForm } from '@/components/admin/product-form';
import type { Category, Product } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const [productRes, categoriesRes] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).maybeSingle(),
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
  ]);

  const product = productRes.data as Product | null;
  if (!product) notFound();
  const categories = (categoriesRes.data as Category[]) || [];

  const initialData = {
    name: product.name,
    slug: product.slug,
    short_description: product.short_description || '',
    description: product.description || '',
    benefits: Array.isArray(product.benefits) ? product.benefits : [],
    category_id: product.category_id || '',
    vendor_name: product.vendor_name || '',
    image_url: product.image_url || '',
    affiliate_url: product.affiliate_url,
    price: product.price !== null ? String(product.price) : '',
    currency: product.currency,
    rating: String(product.rating),
    review_count: String(product.review_count),
    featured: product.featured,
    status: product.status,
    seo_title: product.seo_title || '',
    seo_description: product.seo_description || '',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Product</h1>
        <p className="text-sm text-slate-500">{product.name}</p>
      </div>
      <ProductForm productId={product.id} categories={categories} initialData={initialData} />
    </div>
  );
}
