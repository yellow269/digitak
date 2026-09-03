-- 0010: Add colours jsonb column to products + selected_colour to order_items + seed

-- Add colours column (array of { name: string, hex: string } objects)
ALTER TABLE products ADD COLUMN IF NOT EXISTS colours jsonb DEFAULT '[]'::jsonb;

-- Add selected_colour to order_items for recording customer's colour choice
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_colour jsonb;

-- Seed colours for the Smart Fit Active Smartwatch
UPDATE products
SET colours = '[
  {"name": "Black", "hex": "#000000"},
  {"name": "Silver", "hex": "#C0C0C0"},
  {"name": "Blue", "hex": "#2563EB"},
  {"name": "Pink", "hex": "#EC4899"},
  {"name": "Purple", "hex": "#9333EA"},
  {"name": "Green", "hex": "#16A34A"},
  {"name": "Gold", "hex": "#D4AF37"}
]'::jsonb
WHERE name ILIKE '%smart fit%active%smartwatch%'
   OR slug ILIKE '%smart-fit%active%smartwatch%';
