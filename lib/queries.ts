/**
 * Column selection for public-facing product queries.
 * Excludes `affiliate_url` so affiliate URLs are never exposed
 * in client component props or API responses. The affiliate URL
 * is only read server-side in the /go/[slug] redirect handler.
 */
export const PUBLIC_PRODUCT_COLUMNS =
  'id, name, slug, short_description, description, benefits, category_id, vendor_name, image_url, price, currency, rating, review_count, featured, status, seo_title, seo_description, created_at, updated_at, category:categories(*)';
