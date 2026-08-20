/*
# DigitalVault SA — Storage Policies for product-images bucket

## Overview
Adds RLS policies to the storage.objects table for the 'product-images' bucket:
- Public (anon, authenticated) can READ objects in product-images (so images display on the site).
- Only authenticated users who are admins can INSERT (upload) and UPDATE/DELETE objects.

## Security
- Uses the existing is_admin() helper to gate write access.
- Read access is public so product images load for all visitors.
*/

-- Public read access for product-images bucket
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

-- Admin upload access
DROP POLICY IF EXISTS "product_images_admin_insert" ON storage.objects;
CREATE POLICY "product_images_admin_insert" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND is_admin());

-- Admin update access
DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
CREATE POLICY "product_images_admin_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND is_admin())
  WITH CHECK (bucket_id = 'product-images' AND is_admin());

-- Admin delete access
DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;
CREATE POLICY "product_images_admin_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND is_admin());
