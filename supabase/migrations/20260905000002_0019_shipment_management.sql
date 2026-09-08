-- Migration 0019: Shipment management
-- Separate shipments per order, with per-shipment tracking and status

-- ============================================================
-- 1. SHIPMENTS
-- One order can have multiple shipments (grouped by supplier).
-- ============================================================
CREATE TABLE IF NOT EXISTS shipments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),

  -- Tracking
  courier TEXT,
  tracking_number TEXT,
  tracking_url TEXT,

  -- Costs
  shipping_cost NUMERIC(12,2) DEFAULT 0,

  -- Supplier reference
  supplier_order_id TEXT,
  supplier_shipment_id TEXT,

  -- Timestamps
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate shipments for the same order+supplier
  UNIQUE(order_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_supplier ON shipments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shipments"
  ON shipments FOR ALL
  USING (is_admin());

CREATE POLICY "Service role can manage shipments"
  ON shipments FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. SHIPMENT ITEMS
-- Links shipments to order items (many-to-many).
-- ============================================================
CREATE TABLE IF NOT EXISTS shipment_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(shipment_id, order_item_id)
);

CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment ON shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_order_item ON shipment_items(order_item_id);

ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shipment_items"
  ON shipment_items FOR ALL
  USING (is_admin());

CREATE POLICY "Service role can manage shipment_items"
  ON shipment_items FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. updated_at trigger for shipments
-- ============================================================
DROP TRIGGER IF EXISTS shipments_updated_at ON shipments;
CREATE TRIGGER shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
