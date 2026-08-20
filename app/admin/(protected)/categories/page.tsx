import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CategoryManager } from '@/components/admin/category-manager';
import type { Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
  const categories = (data as Category[]) || [];
  return <CategoryManager categories={categories} />;
}
