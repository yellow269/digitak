/**
 * Server-only: loads shipping config from the database.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { DEFAULT_SHIPPING_CONFIG, type ShippingConfig } from '@/lib/shipping';

/**
 * Load shipping config from site_settings table.
 * Returns default config if not found or on error.
 */
export async function loadShippingConfig(): Promise<ShippingConfig> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'shipping')
      .single();

    if (error || !data) return DEFAULT_SHIPPING_CONFIG;
    return { ...DEFAULT_SHIPPING_CONFIG, ...(data.value as Partial<ShippingConfig>) };
  } catch {
    return DEFAULT_SHIPPING_CONFIG;
  }
}
