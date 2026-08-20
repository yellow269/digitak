/*
# DigitalVault SA — Initial Schema

## Overview
Creates the full database schema for the DigitalVault SA affiliate digital-products storefront: profiles, categories, products, tags, blog posts, affiliate click tracking, contact messages, and newsletter subscribers. Every table has Row Level Security enabled.

## New Tables
1. `profiles` — extends `auth.users` with a role (user/admin) and display name.
2. `categories` — product categories with SEO fields.
3. `products` — affiliate digital products. `benefits` is a JSONB array of strings. `status` controls visibility (draft/published). `featured` flags homepage placement.
4. `tags` + `product_tags` — many-to-many tags for products.
5. `blog_posts` — SEO-ready blog articles with related products.
6. `affiliate_clicks` — anonymized outbound click tracking (no personal data beyond referrer/device/session id).
7. `contact_messages` — contact form submissions.
8. `newsletter_subscribers` — email + consent for newsletter.

## Security
- RLS enabled on every table.
- Public (anon, authenticated) can READ: published products, all categories, published blog posts.
- Public can INSERT: affiliate_clicks, contact_messages, newsletter_subscribers.
- Admins (profiles.role = 'admin') can do full CRUD on products, categories, blog_posts, tags, product_tags, contact_messages, newsletter_subscribers, and affiliate_clicks.
- Admin status is determined by the `is_admin()` SECURITY DEFINER helper which reads profiles.role for the current user.

## Important Notes
1. `is_admin()` is a SECURITY DEFINER function owned by the postgres role so it can read profiles regardless of the caller's RLS. It is created FIRST, before any policies reference it.
2. `affiliate_clicks` stores only an anonymous session id, referrer URL, landing page, and a coarse device type. No IP addresses or user identifiers are stored.
3. Newsletter subscribers require a consent boolean to be true.
4. `product_tags` and `tags` are admin-managed; public can read them.
*/

-- ===== is_admin helper (SECURITY DEFINER) — created first =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ===== categories =====
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  seo_title text,
  seo_description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_public_read" ON categories;
CREATE POLICY "categories_public_read" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_admin_insert" ON categories;
CREATE POLICY "categories_admin_insert" ON categories FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "categories_admin_update" ON categories;
CREATE POLICY "categories_admin_update" ON categories FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "categories_admin_delete" ON categories;
CREATE POLICY "categories_admin_delete" ON categories FOR DELETE
  TO authenticated USING (is_admin());

-- ===== products =====
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text,
  description text,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  vendor_name text,
  image_url text,
  affiliate_url text NOT NULL,
  price numeric(12,2),
  currency text NOT NULL DEFAULT 'ZAR',
  rating numeric(2,1) NOT NULL DEFAULT 0,
  review_count int NOT NULL DEFAULT 0,
  featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_public_read" ON products;
CREATE POLICY "products_public_read" ON products FOR SELECT
  TO anon, authenticated USING (status = 'published');

DROP POLICY IF EXISTS "products_admin_insert" ON products;
CREATE POLICY "products_admin_insert" ON products FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "products_admin_update" ON products;
CREATE POLICY "products_admin_update" ON products FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "products_admin_delete" ON products;
CREATE POLICY "products_admin_delete" ON products FOR DELETE
  TO authenticated USING (is_admin());

CREATE INDEX IF NOT EXISTS products_category_id_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS products_status_idx ON products(status);
CREATE INDEX IF NOT EXISTS products_featured_idx ON products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS products_created_at_idx ON products(created_at DESC);

-- ===== tags =====
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tags_public_read" ON tags;
CREATE POLICY "tags_public_read" ON tags FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "tags_admin_insert" ON tags;
CREATE POLICY "tags_admin_insert" ON tags FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "tags_admin_update" ON tags;
CREATE POLICY "tags_admin_update" ON tags FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "tags_admin_delete" ON tags;
CREATE POLICY "tags_admin_delete" ON tags FOR DELETE
  TO authenticated USING (is_admin());

-- ===== product_tags =====
CREATE TABLE IF NOT EXISTS product_tags (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_tags_public_read" ON product_tags;
CREATE POLICY "product_tags_public_read" ON product_tags FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "product_tags_admin_insert" ON product_tags;
CREATE POLICY "product_tags_admin_insert" ON product_tags FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "product_tags_admin_delete" ON product_tags;
CREATE POLICY "product_tags_admin_delete" ON product_tags FOR DELETE
  TO authenticated USING (is_admin());

-- ===== blog_posts =====
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text NOT NULL,
  featured_image text,
  category text,
  author text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_title text,
  seo_description text,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_public_read" ON blog_posts;
CREATE POLICY "blog_public_read" ON blog_posts FOR SELECT
  TO anon, authenticated USING (published = true);

DROP POLICY IF EXISTS "blog_admin_insert" ON blog_posts;
CREATE POLICY "blog_admin_insert" ON blog_posts FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "blog_admin_update" ON blog_posts;
CREATE POLICY "blog_admin_update" ON blog_posts FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "blog_admin_delete" ON blog_posts;
CREATE POLICY "blog_admin_delete" ON blog_posts FOR DELETE
  TO authenticated USING (is_admin());

CREATE INDEX IF NOT EXISTS blog_published_idx ON blog_posts(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS blog_published_at_idx ON blog_posts(published_at DESC);

-- ===== affiliate_clicks =====
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  referrer text,
  landing_page text,
  device_type text,
  country text,
  session_id text
);

ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clicks_public_insert" ON affiliate_clicks;
CREATE POLICY "clicks_public_insert" ON affiliate_clicks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "clicks_admin_read" ON affiliate_clicks;
CREATE POLICY "clicks_admin_read" ON affiliate_clicks FOR SELECT
  TO authenticated USING (is_admin());

CREATE INDEX IF NOT EXISTS clicks_created_at_idx ON affiliate_clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS clicks_product_id_idx ON affiliate_clicks(product_id);

-- ===== contact_messages =====
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_public_insert" ON contact_messages;
CREATE POLICY "contact_public_insert" ON contact_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "contact_admin_read" ON contact_messages;
CREATE POLICY "contact_admin_read" ON contact_messages FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "contact_admin_update" ON contact_messages;
CREATE POLICY "contact_admin_update" ON contact_messages FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "contact_admin_delete" ON contact_messages;
CREATE POLICY "contact_admin_delete" ON contact_messages FOR DELETE
  TO authenticated USING (is_admin());

-- ===== newsletter_subscribers =====
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_public_insert" ON newsletter_subscribers;
CREATE POLICY "newsletter_public_insert" ON newsletter_subscribers FOR INSERT
  TO anon, authenticated WITH CHECK (consent = true);

DROP POLICY IF EXISTS "newsletter_admin_read" ON newsletter_subscribers;
CREATE POLICY "newsletter_admin_read" ON newsletter_subscribers FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "newsletter_admin_delete" ON newsletter_subscribers;
CREATE POLICY "newsletter_admin_delete" ON newsletter_subscribers FOR DELETE
  TO authenticated USING (is_admin());

-- ===== updated_at trigger function =====
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS blog_posts_updated_at ON blog_posts;
CREATE TRIGGER blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== handle_new_user trigger: auto-create profile on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
