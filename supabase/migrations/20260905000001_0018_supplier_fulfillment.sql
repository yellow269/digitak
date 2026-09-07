-- Migration 0018: Dropshipping automation — supplier fulfillments, notifications, order enhancements
-- Stage 1: Automated order processing after PayFast payment confirmation

-- ============================================================
-- 1. SUPPLIER FULFILLMENTS
-- Tracks each order's fulfillment record with the supplier.
-- One record per order per supplier. Idempotent via unique constraint.
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_fulfillments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  supplier_name TEXT NOT NULL,

  -- Line item reference (may be one record per order or per item)
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  supplier_handle TEXT,
  supplier_sku TEXT,
  variant_sku TEXT,
  selected_options JSONB,
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Pricing snapshot (from order time, not current product)
  supplier_cost NUMERIC(12,2),
  selling_price NUMERIC(12,2),

  -- Customer snapshot
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_province TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  shipping_country TEXT NOT NULL DEFAULT 'South Africa',

  -- Fulfillment status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent_to_supplier', 'confirmed', 'shipped', 'delivered', 'error')),

  -- Stage 2 fields (populated later)
  supplier_order_id TEXT,
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Error handling
  error_message TEXT,
  error_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate fulfillment records for the same order+supplier
  UNIQUE(order_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_fulfillments_order ON supplier_fulfillments(order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_fulfillments_supplier ON supplier_fulfillments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_fulfillments_status ON supplier_fulfillments(status);

ALTER TABLE supplier_fulfillments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage supplier_fulfillments"
  ON supplier_fulfillments FOR ALL
  USING (is_admin());

-- Service role bypasses RLS, but explicit policy for the API routes
CREATE POLICY "Service role can manage fulfillments"
  ON supplier_fulfillments FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. ORDER ENHANCEMENTS
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_error TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_error_at TIMESTAMPTZ;

-- ============================================================
-- 3. ADMIN NOTIFICATIONS
-- For admin-visible notifications (new orders, fulfillment errors, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notifications"
  ON admin_notifications FOR ALL
  USING (is_admin());

-- ============================================================
-- 4. updated_at trigger for supplier_fulfillments
-- ============================================================
DROP TRIGGER IF EXISTS supplier_fulfillments_updated_at ON supplier_fulfillments;
CREATE TRIGGER supplier_fulfillments_updated_at
  BEFORE UPDATE ON supplier_fulfillments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
