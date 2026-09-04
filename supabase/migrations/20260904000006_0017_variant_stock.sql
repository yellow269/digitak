-- Migration 0017: Per-variant stock tracking
-- Adds variant_stock JSONB to products and variant_sku to order_items.
--
-- variant_stock maps option combinations to stock/SKU:
-- {
--   "Colour=Blue:Size=M": { "stock": 5, "sku": "ABC-123-M-BLU" },
--   "Colour=Blue:Size=L": { "stock": 0, "sku": "ABC-123-L-BLU" }
-- }

-- 1. Add variant_stock to products
DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_stock jsonb DEFAULT '{}'::jsonb;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. Add variant_sku to order_items (per-item SKU from the selected variant)
DO $$ BEGIN
  ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_sku text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3. Add variant_sku to cart items is not needed (cart is localStorage)
-- but we track it on products for reference
DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_data jsonb DEFAULT '[]'::jsonb;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
