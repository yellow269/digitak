'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Trash2, Star, Plus, X, Calculator, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { slugify, formatPrice } from '@/lib/format';
import { PRODUCT_TYPES, STOCK_STATUSES } from '@/lib/constants';
import type { Category, Supplier, ProductType, StockStatus, ColourOption, ProductOption, ProductOptionValue } from '@/lib/types';
import { CategorySelect } from '@/components/admin/category-select';

type ProductFormData = {
  name: string;
  slug: string;
  short_description: string;
  description: string;
  benefits: string[];
  category_id: string;
  vendor_name: string;
  image_url: string;
  affiliate_url: string;
  price: string;
  sale_price: string;
  currency: string;
  rating: string;
  review_count: string;
  featured: boolean;
  status: string;
  seo_title: string;
  seo_description: string;
  product_type: ProductType;
  supplier_id: string;
  supplier_sku: string;
  supplier_cost: string;
  supplier_shipping_cost: string;
  markup_percentage: string;
  markup_amount: string;
  selling_price: string;
  stock_status: StockStatus;
  shipping_estimate: string;
  supplier_url: string;
  supplier_notes: string;
  quantity_available: string;
  colours: ColourOption[];
  options: ProductOption[];
};

const EMPTY: ProductFormData = {
  name: '',
  slug: '',
  short_description: '',
  description: '',
  benefits: [],
  category_id: '',
  vendor_name: '',
  image_url: '',
  affiliate_url: '',
  price: '',
  sale_price: '',
  currency: 'ZAR',
  rating: '0',
  review_count: '0',
  featured: false,
  status: 'draft',
  seo_title: '',
  seo_description: '',
  product_type: 'affiliate',
  supplier_id: '',
  supplier_sku: '',
  supplier_cost: '',
  supplier_shipping_cost: '',
  markup_percentage: '40',
  markup_amount: '',
  selling_price: '',
  stock_status: 'in_stock',
  shipping_estimate: '',
  supplier_url: '',
  supplier_notes: '',
  quantity_available: '0',
  colours: [],
  options: [],
};

export function ProductForm({
  productId,
  categories,
  initialData,
}: {
  productId?: string;
  categories: Category[];
  initialData?: Partial<ProductFormData>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormData>({ ...EMPTY, ...initialData });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [benefitInput, setBenefitInput] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [priceOverride, setPriceOverride] = useState(false);
  const [newColourName, setNewColourName] = useState('');
  const [newColourHex, setNewColourHex] = useState('#000000');
  const [newOptionType, setNewOptionType] = useState('Size');
  const [newOptionValue, setNewOptionValue] = useState('');
  const [newOptionHex, setNewOptionHex] = useState('#000000');

  useEffect(() => {
    if (initialData) {
      setForm({ ...EMPTY, ...initialData });
      if (initialData.selling_price) setPriceOverride(true);
    }
  }, [initialData]);

  useEffect(() => {
    async function loadSuppliers() {
      const supabase = createClient();
      const { data } = await supabase.from('suppliers').select('*').eq('active', true).order('name');
      setSuppliers((data as Supplier[]) || []);
    }
    loadSuppliers();
  }, []);

  function update<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Live profit calculation
  const calculatedSellingPrice = (() => {
    if (priceOverride && form.selling_price) return parseFloat(form.selling_price) || 0;
    const cost = parseFloat(form.supplier_cost) || 0;
    const shipping = parseFloat(form.supplier_shipping_cost) || 0;
    const markupPct = parseFloat(form.markup_percentage) || 0;
    const markupAmt = parseFloat(form.markup_amount) || 0;
    const base = cost + shipping;
    return base + (base * markupPct / 100) + markupAmt;
  })();

  const calculatedProfit = (() => {
    const cost = parseFloat(form.supplier_cost) || 0;
    const shipping = parseFloat(form.supplier_shipping_cost) || 0;
    const markupPct = parseFloat(form.markup_percentage) || 0;
    const markupAmt = parseFloat(form.markup_amount) || 0;
    const base = cost + shipping;
    return (base * markupPct / 100) + markupAmt;
  })();

  function addBenefit() {
    const b = benefitInput.trim();
    if (!b) return;
    update('benefits', [...form.benefits, b]);
    setBenefitInput('');
  }

  function removeBenefit(i: number) {
    update('benefits', form.benefits.filter((_, idx) => idx !== i));
  }

  function addColour() {
    const name = newColourName.trim();
    if (!name) return;
    if (form.colours.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    update('colours', [...form.colours, { name, hex: newColourHex }]);
    setNewColourName('');
    setNewColourHex('#000000');
  }

  function removeColour(i: number) {
    update('colours', form.colours.filter((_, idx) => idx !== i));
  }

  function addOptionValue() {
    const val = newOptionValue.trim();
    if (!val) return;
    const existing = form.options.find((o) => o.type === newOptionType);
    if (existing) {
      if (existing.values.some((v) => v.name.toLowerCase() === val.toLowerCase())) return;
      update('options', form.options.map((o) =>
        o.type === newOptionType
          ? { ...o, values: [...o.values, { name: val, hex: newOptionHex }] }
          : o
      ));
    } else {
      update('options', [...form.options, { type: newOptionType, values: [{ name: val, hex: newOptionHex }] }]);
    }
    setNewOptionValue('');
  }

  function removeOptionValue(type: string, valueIndex: number) {
    update('options', form.options
      .map((o) => o.type === type ? { ...o, values: o.values.filter((_, i) => i !== valueIndex) } : o)
      .filter((o) => o.values.length > 0)
    );
  }

  function removeOptionType(type: string) {
    update('options', form.options.filter((o) => o.type !== type));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!form.name || !form.slug) {
      setError('Name and slug are required.');
      setLoading(false);
      return;
    }

    // For affiliate products, affiliate_url is required
    if (form.product_type === 'affiliate' && !form.affiliate_url) {
      setError('Affiliate URL is required for affiliate products.');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const payload = {
      name: form.name,
      slug: slugify(form.slug),
      short_description: form.short_description || null,
      description: form.description || null,
      benefits: form.benefits,
      category_id: form.category_id || null,
      vendor_name: form.vendor_name || null,
      image_url: form.image_url || null,
      affiliate_url: form.affiliate_url || null,
      price: priceOverride ? parseFloat(form.selling_price) || null : form.price ? parseFloat(form.price) : null,
      sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
      currency: form.currency,
      rating: parseFloat(form.rating) || 0,
      review_count: parseInt(form.review_count, 10) || 0,
      featured: form.featured,
      status: form.status,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
      product_type: form.product_type,
      supplier_id: form.supplier_id || null,
      supplier_sku: form.supplier_sku || null,
      supplier_cost: form.supplier_cost ? parseFloat(form.supplier_cost) : null,
      supplier_shipping_cost: form.supplier_shipping_cost ? parseFloat(form.supplier_shipping_cost) : null,
      markup_percentage: form.markup_percentage ? parseFloat(form.markup_percentage) : null,
      markup_amount: form.markup_amount ? parseFloat(form.markup_amount) : null,
      selling_price: calculatedSellingPrice || null,
      estimated_profit: calculatedProfit || null,
      stock_status: form.stock_status,
      shipping_estimate: form.shipping_estimate || null,
      supplier_url: form.supplier_url || null,
      supplier_notes: form.supplier_notes || null,
      quantity_available: parseInt(form.quantity_available, 10) || 0,
      colours: form.colours.length > 0 ? form.colours : [],
      options: form.options.length > 0 ? form.options : [],
    };

    let result;
    if (productId) {
      result = await supabase.from('products').update(payload).eq('id', productId);
    } else {
      result = await supabase.from('products').insert(payload);
    }

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.push('/admin/products');
    router.refresh();
  }

  async function handleDelete() {
    if (!productId) return;
    if (!confirm('Are you sure you want to delete this product? This cannot be undone.')) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push('/admin/products');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => {
                  update('name', e.target.value);
                  if (!productId) update('slug', slugify(e.target.value));
                }}
                required
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => update('slug', slugify(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="product_type">Product Type *</Label>
              <Select value={form.product_type} onValueChange={(v) => update('product_type', v as ProductType)}>
                <SelectTrigger id="product_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category_id">Category</Label>
              <CategorySelect
                categories={categories}
                value={form.category_id}
                onChange={(v) => update('category_id', v)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="short_description">Short Description</Label>
            <Textarea
              id="short_description"
              value={form.short_description}
              onChange={(e) => update('short_description', e.target.value)}
              rows={2}
              placeholder="One-line summary shown on cards"
            />
          </div>

          <div>
            <Label htmlFor="description">Full Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={6}
            />
          </div>

          {/* Benefits */}
          <div>
            <Label>Benefits</Label>
            <div className="flex gap-2">
              <Input
                value={benefitInput}
                onChange={(e) => setBenefitInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addBenefit();
                  }
                }}
                placeholder="Add a benefit and press Enter"
              />
              <Button type="button" variant="outline" onClick={addBenefit} className="gap-1">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            {form.benefits.length > 0 && (
              <ul className="mt-2 space-y-1">
                {form.benefits.map((b, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-1.5 text-sm">
                    {b}
                    <button type="button" onClick={() => removeBenefit(i)} className="text-slate-400 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Supplier Information (for dropshipping) */}
      {(form.product_type === 'dropshipping') && (
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Supplier Information
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              <Truck className="h-3 w-3" />
              Dropshipping
            </span>
          </CardTitle>
        </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Supplier</Label>
                <Select value={form.supplier_id || 'none'} onValueChange={(v) => update('supplier_id', v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No supplier</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Supplier SKU</Label>
                <Input value={form.supplier_sku} onChange={(e) => update('supplier_sku', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Supplier Product URL</Label>
              <Input value={form.supplier_url} onChange={(e) => update('supplier_url', e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>Supplier Notes (Fulfillment instructions)</Label>
              <Textarea value={form.supplier_notes} onChange={(e) => update('supplier_notes', e.target.value)} rows={2} placeholder="e.g. Deliver within 3 days, handle with care..." />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing &amp; Rating</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.product_type === 'dropshipping' ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>Supplier Cost (R)</Label>
                  <Input type="number" step="0.01" value={form.supplier_cost} onChange={(e) => update('supplier_cost', e.target.value)} />
                </div>
                <div>
                  <Label>Shipping Cost (R)</Label>
                  <Input type="number" step="0.01" value={form.supplier_shipping_cost} onChange={(e) => update('supplier_shipping_cost', e.target.value)} />
                </div>
                <div>
                  <Label>Markup %</Label>
                  <Input type="number" step="1" value={form.markup_percentage} onChange={(e) => update('markup_percentage', e.target.value)} />
                </div>
                <div>
                  <Label>Markup Amount (R)</Label>
                  <Input type="number" step="0.01" value={form.markup_amount} onChange={(e) => update('markup_amount', e.target.value)} />
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Switch id="price_override" checked={priceOverride} onCheckedChange={setPriceOverride} />
                <Label htmlFor="price_override">Override selling price manually</Label>
              </div>
              
              {priceOverride ? (
                <div>
                  <Label>Selling Price (R) *</Label>
                  <Input type="number" step="0.01" value={form.selling_price} onChange={(e) => update('selling_price', e.target.value)} required />
                </div>
              ) : null}

              {/* Live calculation */}
              <div className="rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Live Profit Calculation</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-green-600">Supplier Cost</p>
                    <p className="font-semibold">{formatPrice(parseFloat(form.supplier_cost) || 0, 'ZAR')}</p>
                  </div>
                  <div>
                    <p className="text-green-600">+ Shipping</p>
                    <p className="font-semibold">{formatPrice(parseFloat(form.supplier_shipping_cost) || 0, 'ZAR')}</p>
                  </div>
                  <div>
                    <p className="text-green-600">Selling Price</p>
                    <p className="font-bold text-lg">{formatPrice(calculatedSellingPrice, 'ZAR')}</p>
                  </div>
                  <div>
                    <p className="text-green-600">Estimated Profit</p>
                    <p className="font-bold text-lg text-green-700">{formatPrice(calculatedProfit, 'ZAR')}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Stock Status</Label>
                  <Select value={form.stock_status} onValueChange={(v) => update('stock_status', v as StockStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STOCK_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Shipping Estimate</Label>
                  <Input value={form.shipping_estimate} onChange={(e) => update('shipping_estimate', e.target.value)} placeholder="e.g. 5-10 business days" />
                </div>
              </div>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => update('price', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="sale_price">Sale Price (optional)</Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  value={form.sale_price}
                  onChange={(e) => update('sale_price', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={form.currency} onValueChange={(v) => update('currency', v)}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZAR">ZAR (R)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rating">Rating (0-5)</Label>
                <Input
                  id="rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={form.rating}
                  onChange={(e) => update('rating', e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="review_count">Review Count</Label>
              <Input
                id="review_count"
                type="number"
                min="0"
                value={form.review_count}
                onChange={(e) => update('review_count', e.target.value)}
              />
            </div>
            <div>
              <Label>Vendor Name</Label>
              <Input value={form.vendor_name} onChange={(e) => update('vendor_name', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Links &amp; Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.product_type === 'affiliate' && (
            <div>
              <Label htmlFor="affiliate_url">Affiliate URL *</Label>
              <Input
                id="affiliate_url"
                type="url"
                value={form.affiliate_url}
                onChange={(e) => update('affiliate_url', e.target.value)}
                required
                placeholder="https://www.digistore24.com/..."
              />
              <p className="mt-1 text-xs text-slate-500">
                This is where the &quot;Get Deal&quot; button will redirect visitors.
              </p>
            </div>
          )}
          <div>
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              type="url"
              value={form.image_url}
              onChange={(e) => update('image_url', e.target.value)}
              placeholder="https://..."
            />
            <p className="mt-1 text-xs text-slate-500">
              Paste a direct image URL. You can also use the upload below.
            </p>
            {form.image_url && (
              <div className="mt-2 h-32 w-full overflow-hidden rounded-md bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image_url} alt="Preview" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
          <ImageUpload
            onUploaded={(url) => update('image_url', url)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            Add variant options for this product (e.g. Colour, Size, Weight, Material, Style).
            Colour options show as swatches; all others show as dropdowns.
          </p>

          {form.options.length > 0 && (
            <div className="space-y-3">
              {form.options.map((opt) => (
                <div key={opt.type} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">{opt.type}</span>
                    <button type="button" onClick={() => removeOptionType(opt.type)} className="text-slate-400 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {opt.values.map((val, vi) => (
                      <div key={vi} className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1">
                        {val.hex && (
                          <span className="inline-block h-3 w-3 rounded-full border border-slate-300" style={{ backgroundColor: val.hex }} />
                        )}
                        <span className="text-xs font-medium text-slate-700">{val.name}</span>
                        <button type="button" onClick={() => removeOptionValue(opt.type, vi)} className="text-slate-400 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="w-36">
              <Label>Type</Label>
              <Select value={newOptionType} onValueChange={setNewOptionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Colour', 'Size', 'Weight', 'Material', 'Style', 'Storage', 'Capacity', 'Model'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Value</Label>
              <Input
                value={newOptionValue}
                onChange={(e) => setNewOptionValue(e.target.value)}
                placeholder={newOptionType === 'Colour' ? 'e.g. Red' : `e.g. ${newOptionType === 'Size' ? 'M' : newOptionType === 'Weight' ? '500g' : 'Value'}`}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOptionValue(); } }}
              />
            </div>
            {newOptionType === 'Colour' && (
              <div className="w-20">
                <Label>Hex</Label>
                <input
                  type="color"
                  value={newOptionHex}
                  onChange={(e) => setNewOptionHex(e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-md border border-slate-200"
                />
              </div>
            )}
            <Button type="button" variant="outline" onClick={addOptionValue} className="gap-1 shrink-0">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status &amp; SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => update('status', v)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3 pb-1">
              <Switch
                id="featured"
                checked={form.featured}
                onCheckedChange={(v) => update('featured', v)}
              />
              <Label htmlFor="featured" className="flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-400" />
                Featured on homepage
              </Label>
            </div>
          </div>
          <div>
            <Label htmlFor="seo_title">SEO Title</Label>
            <Input
              id="seo_title"
              value={form.seo_title}
              onChange={(e) => update('seo_title', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="seo_description">SEO Description</Label>
            <Textarea
              id="seo_description"
              value={form.seo_description}
              onChange={(e) => update('seo_description', e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading} className="gap-1">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {productId ? 'Update Product' : 'Create Product'}
            </>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        {productId && (
          <Button type="button" variant="destructive" onClick={handleDelete} className="gap-1 ml-auto">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function ImageUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG and WebP images are allowed.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File must be ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB or less.`);
      return;
    }

    setUploading(true);
    setError('');
    const supabase = createClient();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
    const fileName = `products/${Date.now()}.${safeExt}`;
    const { error: upErr } = await supabase.storage.from('product-images').upload(fileName, file, {
      upsert: true,
      contentType: file.type,
    });
    if (upErr) {
      setError(upErr.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    onUploaded(data.publicUrl);
    setUploading(false);
  }

  return (
    <div>
      <Label className="mb-1 block">Or upload an image</Label>
      <Input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <p className="mt-1 text-xs text-slate-500">Uploading...</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <p className="mt-1 text-xs text-slate-500">
        JPEG, PNG or WebP. Max {Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB.
        Requires a &quot;product-images&quot; storage bucket in Supabase (public).
      </p>
    </div>
  );
}
