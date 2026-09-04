/**
 * Column selection for public-facing product queries.
 * Excludes `affiliate_url`, `supplier_url`, `supplier_cost`,
 * `estimated_profit`, and other admin-only fields.
 */
export const PUBLIC_PRODUCT_COLUMNS =
  'id, name, slug, short_description, description, benefits, category_id, vendor_name, image_url, price, sale_price, currency, rating, review_count, featured, status, product_type, stock_status, shipping_estimate, selling_price, colours, options, created_at, updated_at, category:categories(*)';

/**
 * Column selection for admin product queries.
 * Includes supplier cost, profit, and other admin-only fields.
 */
export const ADMIN_PRODUCT_COLUMNS =
  'id, name, slug, short_description, description, benefits, category_id, vendor_name, image_url, affiliate_url, price, sale_price, currency, rating, review_count, featured, status, product_type, supplier_id, supplier_sku, supplier_cost, supplier_shipping_cost, markup_percentage, markup_amount, selling_price, estimated_profit, stock_status, shipping_estimate, supplier_url, supplier_notes, quantity_available, colours, options, supplier_handle, sync_enabled, auto_repricing, last_synced_at, seo_title, seo_description, created_at, updated_at, category:categories(*), supplier:suppliers(id, name)';

/**
 * Cart-safe product columns — excludes sensitive supplier/affiliate data.
 */
export const CART_PRODUCT_COLUMNS =
  'id, name, slug, image_url, price, sale_price, currency, product_type, stock_status, shipping_estimate, supplier_shipping_cost';
