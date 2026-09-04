-- Migration 0015: Zalemart Supplier Sync
-- Adds sync tracking columns, supplier_handle dedup, sync log table, and seeds Zalemart supplier.

-- 1. Add sync columns to products
DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_handle TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS auto_repricing BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. Unique index for dedup: supplier_id + supplier_handle (only when supplier_id is set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_supplier_handle_unique
  ON products (supplier_id, supplier_handle)
  WHERE supplier_id IS NOT NULL AND supplier_handle IS NOT NULL;

-- Index for sync queries
CREATE INDEX IF NOT EXISTS idx_products_supplier_handle ON products(supplier_handle) WHERE supplier_handle IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_sync_enabled ON products(sync_enabled) WHERE sync_enabled = true;
CREATE INDEX IF NOT EXISTS idx_products_last_synced ON products(last_synced_at) WHERE last_synced_at IS NOT NULL;

-- 3. Seed Zalemart supplier (idempotent)
INSERT INTO suppliers (name, website, contact_email, product_url, notes, active)
VALUES (
  'Zalemart',
  'https://www.zalemart.co.za',
  'whole@zalemart.co.za',
  'https://www.zalemart.co.za',
  'Dropshipping supplier. Official feed: Google Sheet CSV. Products auto-imported via sync.',
  true
)
ON CONFLICT DO NOTHING;

-- 4. Supplier sync log table
CREATE TABLE IF NOT EXISTS supplier_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('import', 'sync')),
  feed_url TEXT,
  products_found INTEGER DEFAULT 0,
  products_created INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_deactivated INTEGER DEFAULT 0,
  variants_total INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE supplier_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage supplier_sync_log"
  ON supplier_sync_log FOR ALL
  USING (is_admin());

CREATE POLICY "No public supplier_sync_log access"
  ON supplier_sync_log FOR SELECT
  USING (false);

CREATE INDEX IF NOT EXISTS idx_supplier_sync_log_supplier ON supplier_sync_log(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_sync_log_status ON supplier_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_supplier_sync_log_created ON supplier_sync_log(created_at DESC);
