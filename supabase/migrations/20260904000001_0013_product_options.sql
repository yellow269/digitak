-- Migration 0013: Flexible product options/variants system
-- Adds `options` JSONB to products (replaces colours-only approach)
-- Adds `selected_options` JSONB to order_items
-- Migrates existing colours data into the new options structure

-- ============================================================
-- 1. Add `options` column to products
-- Structure: [{ type: "Colour", values: [{ name, hex? }] }, { type: "Size", values: [{ name }] }]
-- ============================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS options jsonb DEFAULT '[]'::jsonb;

-- ============================================================
-- 2. Add `selected_options` column to order_items
-- Structure: { "Colour": { name, hex? }, "Size": { name } }
-- ============================================================
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_options jsonb;

-- ============================================================
-- 3. Migrate existing colours data into options format
-- ============================================================
DO $$
DECLARE
  rec RECORD;
  opts jsonb;
BEGIN
  FOR rec IN
    SELECT id, colours
    FROM products
    WHERE colours IS NOT NULL
      AND colours != '[]'::jsonb
      AND (options IS NULL OR options = '[]'::jsonb)
  LOOP
    -- Convert colours array into the options format
    opts := jsonb_build_array(
      jsonb_build_object(
        'type', 'Colour',
        'values', rec.colours
      )
    );

    UPDATE products SET options = opts, updated_at = now() WHERE id = rec.id;
    RAISE NOTICE 'Migrated colours to options for product %', rec.id;
  END LOOP;
END $$;

-- ============================================================
-- 4. Migrate existing selected_colour data to selected_options
-- ============================================================
DO $$
DECLARE
  rec RECORD;
  opts jsonb;
BEGIN
  FOR rec IN
    SELECT id, selected_colour
    FROM order_items
    WHERE selected_colour IS NOT NULL
      AND (selected_options IS NULL)
  LOOP
    IF rec.selected_colour ? 'name' THEN
      opts := jsonb_build_object(
        'Colour',
        jsonb_build_object(
          'name', rec.selected_colour->>'name',
          'hex', rec.selected_colour->>'hex'
        )
      );
      UPDATE order_items SET selected_options = opts WHERE id = rec.id;
      RAISE NOTICE 'Migrated selected_colour to selected_options for order_item %', rec.id;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 5. Seed options for the Smart Fit Active Smartwatch
-- (converts existing colours array to options format if not already done)
-- ============================================================
UPDATE products
SET options = '[
  {
    "type": "Colour",
    "values": [
      {"name": "Black", "hex": "#000000"},
      {"name": "Silver", "hex": "#C0C0C0"},
      {"name": "Blue", "hex": "#2563EB"},
      {"name": "Pink", "hex": "#EC4899"},
      {"name": "Purple", "hex": "#9333EA"},
      {"name": "Green", "hex": "#16A34A"},
      {"name": "Gold", "hex": "#D4AF37"}
    ]
  }
]'::jsonb,
updated_at = now()
WHERE slug = 'smart-fit-active-smartwatch'
   OR name ILIKE '%smart fit%active%smartwatch%';
