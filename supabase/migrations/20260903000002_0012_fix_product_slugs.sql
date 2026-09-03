-- Migration 0012: Fix product slugs to be URL-safe
-- Strategy: normalize existing slug values (remove spaces, lowercase, collapse hyphens).
-- Does NOT regenerate from product name — preserves the existing slug wording.
-- Checks for collisions before overwriting; raises an exception if a conflict is found.

-- 1. Explicit fix for Smart Fit Active Smartwatch
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM products WHERE slug = 'Smart Fit Active') THEN
    IF EXISTS (SELECT 1 FROM products WHERE slug = 'smart-fit-active-smartwatch' AND slug NOT IN ('Smart Fit Active')) THEN
      RAISE EXCEPTION 'Slug conflict: smart-fit-active-smartwatch already exists on a different product';
    END IF;

    UPDATE products
    SET slug = 'smart-fit-active-smartwatch', updated_at = now()
    WHERE slug = 'Smart Fit Active';

    RAISE NOTICE 'Fixed slug: "Smart Fit Active" -> "smart-fit-active-smartwatch"';
  END IF;
END $$;

-- 2. Normalize all remaining slugs that contain uppercase letters or spaces
DO $$
DECLARE
  rec RECORD;
  normalized TEXT;
  conflict_id UUID;
BEGIN
  FOR rec IN
    SELECT id, name, slug
    FROM products
    WHERE slug ~ '[A-Z ]'
  LOOP
    -- Normalize the existing slug value (not the product name)
    normalized := lower(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            trim(rec.slug),
            '[^a-z0-9\s-]', '', 'gi'
          ),
          '\s+', '-', 'g'
        ),
        '-+', '-', 'g'
      )
    );

    -- Skip if already correct
    IF normalized = rec.slug THEN
      CONTINUE;
    END IF;

    -- Check for collision
    SELECT id INTO conflict_id
    FROM products
    WHERE slug = normalized
      AND id != rec.id
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'Slug conflict: cannot normalize "%" -> "%" for product "%" (id %) because product % already uses that slug',
        rec.slug, normalized, rec.name, rec.id, conflict_id;
    END IF;

    UPDATE products SET slug = normalized, updated_at = now() WHERE id = rec.id;
    RAISE NOTICE 'Normalized slug: "%" -> "%" (product "%")', rec.slug, normalized, rec.name;
  END LOOP;
END $$;
