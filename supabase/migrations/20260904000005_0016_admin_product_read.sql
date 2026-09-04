-- Migration 0016: Admin product read access
-- Adds admin SELECT policy so admins can see draft/pending products in the admin panel.

-- Without this, the only SELECT policy (products_public_read) restricts
-- both anon AND authenticated to status = 'published'. Admins can't see
-- drafts, which blocks visibility of newly imported products.

DROP POLICY IF EXISTS "products_admin_read" ON products;
CREATE POLICY "products_admin_read" ON products FOR SELECT
  TO authenticated USING (is_admin());
