-- Migration 0020: Shipping configuration
-- Site-wide shipping settings (flat rate, per-supplier, per-province)

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage site_settings"
  ON site_settings FOR ALL
  USING (is_admin());

CREATE POLICY "Service role can manage site_settings"
  ON site_settings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed default shipping config (per_product mode uses each product's supplier_shipping_cost)
INSERT INTO site_settings (key, value, description) VALUES
  ('shipping', '{"mode":"per_product","flat_rate":0,"free_shipping_minimum":0,"province_rates":{}}'::jsonb, 'Shipping configuration')
ON CONFLICT (key) DO NOTHING;

DROP TRIGGER IF EXISTS site_settings_updated_at ON site_settings;
CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
