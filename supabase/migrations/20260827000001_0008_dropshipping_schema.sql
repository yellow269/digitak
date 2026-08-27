-- Migration 0008: Dropshipping E-commerce Schema
-- Adds: suppliers, product extensions, orders, order_items, supplier_products
-- Safe to run: uses IF NOT EXISTS, no destructive changes

-- ============================================================
-- 1. SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  product_url TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(active);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage suppliers"
  ON suppliers FOR ALL
  USING (is_admin());

-- No public access to suppliers
CREATE POLICY "No public supplier access"
  ON suppliers FOR SELECT
  USING (false);

-- ============================================================
-- 2. PRODUCT EXTENSIONS (dropshipping fields)
-- ============================================================
-- Add columns to existing products table
DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'affiliate'
    CHECK (product_type IN ('affiliate', 'dropshipping', 'digital', 'manual'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_sku TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_cost NUMERIC(12,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_shipping_cost NUMERIC(12,2) DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS markup_percentage NUMERIC(5,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS markup_amount NUMERIC(12,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS estimated_profit NUMERIC(12,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'in_stock'
    CHECK (stock_status IN ('in_stock', 'out_of_stock', 'low_stock', 'pre_order'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_estimate TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price NUMERIC(12,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_available INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON products(stock_status);

-- ============================================================
-- 3. SUPPLIER PRODUCTS (marketplace area for admin to import)
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  product_url TEXT,
  supplier_sku TEXT,
  supplier_cost NUMERIC(12,2),
  shipping_cost NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  image_url TEXT,
  category TEXT,
  imported BOOLEAN DEFAULT false,
  imported_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  markup_percentage NUMERIC(5,2) DEFAULT 40,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_imported ON supplier_products(imported);

ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage supplier_products"
  ON supplier_products FOR ALL
  USING (is_admin());

CREATE POLICY "No public supplier_products access"
  ON supplier_products FOR SELECT
  USING (false);

-- ============================================================
-- 4. ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number SERIAL UNIQUE,
  
  -- Customer info
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_province TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  shipping_country TEXT DEFAULT 'South Africa',
  
  -- Payment
  payment_status TEXT DEFAULT 'pending_payment'
    CHECK (payment_status IN ('pending_payment', 'paid', 'failed', 'refunded')),
  payment_method TEXT DEFAULT 'payfast',
  payfast_payment_id TEXT,
  
  -- Order status
  status TEXT DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'paid', 'supplier_processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  
  -- Financials
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_fee NUMERIC(12,2) DEFAULT 0,
  
  -- Supplier fulfillment
  tracking_number TEXT,
  supplier_notes TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage orders"
  ON orders FOR ALL
  USING (is_admin());

-- Public can create orders (checkout)
CREATE POLICY "Public can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Public can read own orders by email (for confirmation)
CREATE POLICY "Public can read orders by email"
  ON orders FOR SELECT
  USING (true);

-- ============================================================
-- 5. ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  
  -- Snapshot of product data at time of purchase
  product_name TEXT NOT NULL,
  product_image TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  
  -- Supplier info (snapshot)
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_sku TEXT,
  supplier_cost NUMERIC(12,2),
  supplier_shipping_cost NUMERIC(12,2),
  estimated_profit NUMERIC(12,2),
  
  -- Fulfillment
  fulfillment_status TEXT DEFAULT 'pending'
    CHECK (fulfillment_status IN ('pending', 'sent_to_supplier', 'shipped', 'delivered')),
  supplier_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_supplier ON order_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_order_items_fulfillment ON order_items(fulfillment_status);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage order_items"
  ON order_items FOR ALL
  USING (is_admin());

CREATE POLICY "Public can create order_items"
  ON order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can read order_items"
  ON order_items FOR SELECT
  USING (true);

-- ============================================================
-- 6. Updated_at triggers for new tables
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply to suppliers
DROP TRIGGER IF EXISTS suppliers_updated_at ON suppliers;
CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Apply to supplier_products
DROP TRIGGER IF EXISTS supplier_products_updated_at ON supplier_products;
CREATE TRIGGER supplier_products_updated_at
  BEFORE UPDATE ON supplier_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Apply to orders
DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 7. Profit calculation function
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_selling_price(
  p_supplier_cost NUMERIC,
  p_shipping_cost NUMERIC,
  p_markup_percentage NUMERIC,
  p_markup_amount NUMERIC DEFAULT 0
) RETURNS NUMERIC AS $$
DECLARE
  base_cost NUMERIC;
  markup NUMERIC;
BEGIN
  base_cost := COALESCE(p_supplier_cost, 0) + COALESCE(p_shipping_cost, 0);
  markup := (base_cost * COALESCE(p_markup_percentage, 0) / 100) + COALESCE(p_markup_amount, 0);
  RETURN ROUND(base_cost + markup, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 8. Profit view for admin dashboard
-- ============================================================
CREATE OR REPLACE VIEW admin_profit_summary AS
SELECT
  o.id AS order_id,
  o.order_number,
  o.created_at AS order_date,
  o.payment_status,
  o.status AS order_status,
  o.subtotal,
  o.shipping_total,
  o.total,
  o.payment_fee,
  oi.product_name,
  oi.quantity,
  oi.unit_price,
  oi.total_price,
  oi.supplier_cost,
  oi.supplier_shipping_cost,
  oi.estimated_profit
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.payment_status = 'paid';

-- Revoke execute on new functions from non-admin roles
REVOKE EXECUTE ON FUNCTION calculate_selling_price(NUMERIC, NUMERIC, NUMERIC, NUMERIC) FROM anon, authenticated;
