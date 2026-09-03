-- 0009: Add supplier_notes to products + seed Perfect Dealz supplier

-- Add supplier_notes column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_notes text;

-- Seed Perfect Dealz as the first supplier
INSERT INTO suppliers (name, website, notes, active)
VALUES (
  'Perfect Dealz',
  'https://www.perfectdealz.co.za',
  'First supplier — South African dropshipping supplier specializing in electronics, gadgets, and general merchandise.',
  true
)
ON CONFLICT DO NOTHING;
