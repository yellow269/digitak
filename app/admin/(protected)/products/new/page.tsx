import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProductForm } from '@/components/admin/product-form';
import type { Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
  const categories = (data as Category[]) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add Product</h1>
        <p className="text-sm text-slate-500">Add a new affiliate product to your catalogue</p>
      </div>
      <ProductForm categories={categories} />
    </div>
  );
}
