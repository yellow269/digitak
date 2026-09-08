'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { SOUTH_AFRICAN_PROVINCES } from '@/lib/constants';
import type { ShippingConfig } from '@/lib/shipping';

const DEFAULT_CONFIG: ShippingConfig = {
  mode: 'flat_rate',
  flat_rate: 0,
  free_shipping_minimum: 0,
  supplier_rates: {},
  province_rates: {},
  exclude_free_shipping_products: false,
};

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shipping, setShipping] = useState<ShippingConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'shipping')
        .single();
      if (data?.value) {
        setShipping({ ...DEFAULT_CONFIG, ...(data.value as Partial<ShippingConfig>) });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function saveShipping() {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    await supabase
      .from('site_settings')
      .upsert({ key: 'shipping', value: shipping }, { onConflict: 'key' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function updateProvinceRate(province: string, rate: number) {
    setShipping((prev) => ({
      ...prev,
      province_rates: { ...prev.province_rates, [province]: rate },
    }));
  }

  function removeProvinceRate(province: string) {
    setShipping((prev) => {
      const rates = { ...prev.province_rates };
      delete rates[province];
      return { ...prev, province_rates: rates };
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Store configuration and payment settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Store Name</Label>
              <Input defaultValue="Everything Store" disabled />
            </div>
            <div>
              <Label>Currency</Label>
              <Input defaultValue="ZAR" disabled />
            </div>
          </div>
          <div>
            <Label>Store URL</Label>
            <Input defaultValue="https://digitalvaultsa.co.za" disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PayFast Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            PayFast payment gateway is configured via environment variables.
            Contact your developer to update these settings.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Merchant ID</Label>
              <Input type="password" value="***configured***" disabled />
            </div>
            <div>
              <Label>Merchant Key</Label>
              <Input type="password" value="***configured***" disabled />
            </div>
          </div>
          <div>
            <Label>Environment</Label>
            <Input value={process.env.PAYFAST_SANDBOX === 'true' ? 'Sandbox (Testing)' : 'Production'} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Fee Calculation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            PayFast charges: <strong>3.5% + R2.00</strong> per transaction (minimum R5.00).
            These fees are automatically calculated and tracked in the profit dashboard.
          </p>
        </CardContent>
      </Card>

      {/* Shipping Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipping Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : (
            <>
              {/* Shipping Mode */}
              <div>
                <Label>Shipping Mode</Label>
                <Select
                  value={shipping.mode}
                  onValueChange={(v) => setShipping((prev) => ({ ...prev, mode: v as ShippingConfig['mode'] }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat_rate">Flat Rate (same fee for all orders)</SelectItem>
                    <SelectItem value="per_province">Per Province (different rates by province)</SelectItem>
                    <SelectItem value="per_supplier">Per Supplier (rates set on each product)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-slate-400">
                  {shipping.mode === 'flat_rate' && 'A single shipping fee applies to all orders.'}
                  {shipping.mode === 'per_province' && 'Set different shipping rates for each province below.'}
                  {shipping.mode === 'per_supplier' && 'Shipping is calculated from each product\'s supplier_shipping_cost field.'}
                </p>
              </div>

              {/* Flat Rate */}
              {shipping.mode === 'flat_rate' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Flat Rate (ZAR)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={shipping.flat_rate}
                      onChange={(e) => setShipping((prev) => ({ ...prev, flat_rate: Number(e.target.value) }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Free Shipping Minimum (ZAR)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={shipping.free_shipping_minimum}
                      onChange={(e) => setShipping((prev) => ({ ...prev, free_shipping_minimum: Number(e.target.value) }))}
                      placeholder="0 = disabled"
                      className="mt-1"
                    />
                    <p className="mt-1 text-xs text-slate-400">Orders above this amount get free shipping. Set to 0 to disable.</p>
                  </div>
                </div>
              )}

              {/* Per Province */}
              {shipping.mode === 'per_province' && (
                <div className="space-y-3">
                  <Label>Province Shipping Rates (ZAR)</Label>
                  {SOUTH_AFRICAN_PROVINCES.map((province) => (
                    <div key={province} className="flex items-center gap-3">
                      <span className="w-40 text-sm text-slate-700">{province}</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={shipping.province_rates[province] ?? ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val > 0) {
                            updateProvinceRate(province, val);
                          } else {
                            removeProvinceRate(province);
                          }
                        }}
                        placeholder="0 = free"
                        className="w-32"
                      />
                    </div>
                  ))}
                  <div className="grid gap-4 sm:grid-cols-2 mt-4">
                    <div>
                      <Label>Fallback Flat Rate (ZAR)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={shipping.flat_rate}
                        onChange={(e) => setShipping((prev) => ({ ...prev, flat_rate: Number(e.target.value) }))}
                        className="mt-1"
                      />
                      <p className="mt-1 text-xs text-slate-400">Used when province rate is not set.</p>
                    </div>
                    <div>
                      <Label>Free Shipping Minimum (ZAR)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={shipping.free_shipping_minimum}
                        onChange={(e) => setShipping((prev) => ({ ...prev, free_shipping_minimum: Number(e.target.value) }))}
                        placeholder="0 = disabled"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Per Supplier info */}
              {shipping.mode === 'per_supplier' && (
                <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                  <p>Shipping rates are set per product via the <strong>supplier_shipping_cost</strong> field on each product.</p>
                  <p className="mt-1">Edit each product in Admin → Products to set its shipping cost.</p>
                </div>
              )}

              {/* Save */}
              <div className="flex items-center gap-3">
                <Button onClick={saveShipping} disabled={saving} className="gap-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Shipping Settings
                </Button>
                {saved && <span className="text-sm text-green-600">Saved!</span>}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
