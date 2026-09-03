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
    affiliate_url: product.affiliate_url || '',
    price: product.price !== null ? String(product.price) : '',
    sale_price: product.sale_price !== null ? String(product.sale_price) : '',
    currency: product.currency,
    rating: String(product.rating),
    review_count: String(product.review_count),
    featured: product.featured,
    status: product.status,
    seo_title: product.seo_title || '',
    seo_description: product.seo_description || '',
    product_type: product.product_type || 'affiliate',
    supplier_id: product.supplier_id || '',
    supplier_sku: product.supplier_sku || '',
    supplier_cost: product.supplier_cost !== null ? String(product.supplier_cost) : '',
    supplier_shipping_cost: product.supplier_shipping_cost !== null ? String(product.supplier_shipping_cost) : '',
    markup_percentage: product.markup_percentage !== null ? String(product.markup_percentage) : '40',
    markup_amount: product.markup_amount !== null ? String(product.markup_amount) : '',
    selling_price: product.selling_price !== null ? String(product.selling_price) : '',
    stock_status: product.stock_status || 'in_stock',
    shipping_estimate: product.shipping_estimate || '',
    supplier_url: product.supplier_url || '',
    supplier_notes: product.supplier_notes || '',
    quantity_available: String(product.quantity_available ?? 0),
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
