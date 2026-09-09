'use server';

import { revalidatePath } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Revalidate product pages after any mutation.
 * Calls revalidatePath for the product listing and individual product pages.
 */
export async function revalidateProduct(slug?: string) {
  revalidatePath('/products');
  if (slug) {
    revalidatePath(`/products/${slug}`);
  }
  revalidatePath('/category', 'layout');
  revalidatePath('/admin/products');
}

/**
 * Server action: save (create/update) a product and revalidate.
 */
export async function saveProduct(productId: string | null, payload: Record<string, unknown>, slug: string) {
  const supabase = createServiceRoleClient();
  let result;

  if (productId) {
    result = await supabase.from('products').update(payload).eq('id', productId);
  } else {
    result = await supabase.from('products').insert(payload);
  }

  if (result.error) {
    return { error: result.error.message };
  }

  revalidateProduct(slug);
  return { error: null };
}

/**
 * Server action: delete a product and revalidate.
 */
export async function deleteProduct(productId: string, slug: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('products').delete().eq('id', productId);

  if (error) {
    return { error: error.message };
  }

  revalidateProduct(slug);
  return { error: null };
}

/**
 * Server action: insert a product (import) and revalidate.
 */
export async function importProduct(payload: Record<string, unknown>, slug: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('products').insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidateProduct(slug);
  return { error: null };
}
