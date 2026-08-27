/*
# Everything Store — Remove Demo Data

## Overview
Removes all demo products (prefixed with "[Demo]") from the database.
These are fictional placeholder products with example.com affiliate URLs
and fabricated ratings/review counts that should not appear in production.

## Important Notes
1. This migration only removes products with names starting with "[Demo]".
2. Real products added via the admin dashboard are not affected.
3. Blog posts are NOT removed — they are legitimate content.
4. Categories are NOT removed — they are legitimate taxonomy.
5. Run this migration to clean up demo data before going live.
*/

-- Remove demo products (names starting with "[Demo]")
DELETE FROM products WHERE name LIKE '[Demo]%';

-- Remove any affiliate clicks associated with deleted demo products
-- (product_id is ON DELETE SET NULL, so clicks will have NULL product_id)
-- Clean up orphaned click records
DELETE FROM affiliate_clicks WHERE product_id IS NULL;
