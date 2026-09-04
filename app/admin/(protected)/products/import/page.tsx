'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Upload, X, Plus, ArrowLeft, ArrowRight, Star,
  Globe, Image as ImageIcon, DollarSign, Tag, Package,
  CheckCircle2, AlertTriangle, ChevronUp, ChevronDown, Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { slugify, formatPrice } from '@/lib/format';
import { PRODUCT_TYPES, STOCK_STATUSES } from '@/lib/constants';
import type { Category, Supplier, ProductType, StockStatus, ProductOption, ProductOptionValue } from '@/lib/types';
import type { ImportedProduct } from '@/app/api/import-product/route';

type FormData = {
  name: string;
  slug: string;
  short_description: string;
  description: string;
  category_id: string;
  image_url: string;
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
  seo_title: string;
  seo_description: string;
  options: ProductOption[];
};

const EMPTY_FORM: FormData = {
  name: '',
  slug: '',
  short_description: '',
  description: '',
  category_id: '',
  image_url: '',
  product_type: 'dropshipping',
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
  seo_title: '',
  seo_description: '',
  options: [],
};

export default function ImportProductPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [images, setImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [newImageUrl, setNewImageUrl] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierWebsite, setNewSupplierWebsite] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [priceOverride, setPriceOverride] = useState(false);

  const [newOptionType, setNewOptionType] = useState('Size');
  const [newOptionValue, setNewOptionValue] = useState('');
  const [newOptionHex, setNewOptionHex] = useState('#000000');

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const [catRes, supRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('suppliers').select('*').eq('active', true).order('name'),
      ]);
      setCategories((catRes.data as Category[]) || []);
      setSuppliers((supRes.data as Supplier[]) || []);
    }
    loadData();
  }, []);

  function updateForm<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const calculatedSellingPrice = (() => {
    if (priceOverride && form.selling_price) return parseFloat(form.selling_price) || 0;
    const cost = parseFloat(form.supplier_cost) || 0;
    const shipping = parseFloat(form.supplier_shipping_cost) || 0;
    const markupPct = parseFloat(form.markup_percentage) || 0;
    const markupAmt = parseFloat(form.markup_amount) || 0;
    const base = cost + shipping;
    return base + (base * markupPct / 100) + markupAmt;
  })();

  async function handleImport() {
    if (!url.trim()) return;
    setImporting(true);
    setImportError('');
    setImportWarnings([]);

    try {
      const res = await fetch('/api/import-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();

      if (!data.success) {
        setImportError(data.error || 'Import failed');
        setImporting(false);
        return;
      }

      const product: ImportedProduct = data.data;
      const catId = findCategoryId(product.category_suggestion);

      setForm({
        ...EMPTY_FORM,
        name: product.name,
        slug: slugify(product.name),
        short_description: product.short_description,
        description: product.description,
        category_id: catId,
        image_url: product.images[0] || '',
        supplier_cost: product.price ? String(product.price) : '',
        supplier_url: url.trim(),
        seo_title: product.seo_title || product.name,
        seo_description: product.seo_description || product.short_description,
        options: product.options,
      });
      setImages(product.images);
      setPrimaryImageIndex(0);
      setPriceOverride(false);

      const matchedSupplier = suppliers.find((s) => {
        if (!s.website) return false;
        try {
          const sDomain = new URL(s.website).hostname.replace(/^www\./, '');
          const uDomain = new URL(url.trim()).hostname.replace(/^www\./, '');
          return sDomain === uDomain;
        } catch {
          return false;
        }
      });
      if (matchedSupplier) {
        updateForm('supplier_id', matchedSupplier.id);
      }

      if (data.warnings && data.warnings.length > 0) {
        setImportWarnings(data.warnings);
      }
    } catch {
      setImportError('Failed to import. Please try again or enter details manually.');
    } finally {
      setImporting(false);
    }
  }

  function findCategoryId(categoryName: string | null): string {
    if (!categoryName) return '';
    const normalised = categoryName.toLowerCase().trim();
    const match = categories.find((c) => c.name.toLowerCase().trim() === normalised);
    if (match) return match.id;
    const partial = categories.find((c) => normalised.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(normalised));
    return partial?.id || '';
  }

  function setPrimaryImage(index: number) {
    setPrimaryImageIndex(index);
    updateForm('image_url', images[index] || '');
  }

  function removeImage(index: number) {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    if (primaryImageIndex >= newImages.length) {
      const newPrimary = Math.max(0, newImages.length - 1);
      setPrimaryImageIndex(newPrimary);
      updateForm('image_url', newImages[newPrimary] || '');
    } else if (index < primaryImageIndex) {
      setPrimaryImageIndex(primaryImageIndex - 1);
    }
  }

  function moveImage(index: number, direction: 'up' | 'down') {
    const newImages = [...images];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newImages.length) return;
    [newImages[index], newImages[swapIndex]] = [newImages[swapIndex], newImages[index]];
    setImages(newImages);
    if (primaryImageIndex === index) setPrimaryImageIndex(swapIndex);
    else if (primaryImageIndex === swapIndex) setPrimaryImageIndex(index);
  }

  function addImageUrl() {
    const u = newImageUrl.trim();
    if (!u || images.includes(u)) return;
    setImages([...images, u]);
    setNewImageUrl('');
  }

  function addOptionValue() {
    const val = newOptionValue.trim();
    if (!val) return;
    const existing = form.options.find((o) => o.type === newOptionType);
    if (existing) {
      if (existing.values.some((v) => v.name.toLowerCase() === val.toLowerCase())) return;
      updateForm('options', form.options.map((o) =>
        o.type === newOptionType
          ? { ...o, values: [...o.values, { name: val, hex: newOptionType === 'Colour' ? newOptionHex : undefined }] }
          : o
      ));
    } else {
      updateForm('options', [...form.options, {
        type: newOptionType,
        values: [{ name: val, hex: newOptionType === 'Colour' ? newOptionHex : undefined }],
      }]);
    }
    setNewOptionValue('');
  }

  function removeOptionValue(type: string, vi: number) {
    updateForm('options', form.options
      .map((o) => o.type === type ? { ...o, values: o.values.filter((_, i) => i !== vi) } : o)
      .filter((o) => o.values.length > 0)
    );
  }

  function removeOptionType(type: string) {
    updateForm('options', form.options.filter((o) => o.type !== type));
  }

  async function createSupplier() {
    const name = newSupplierName.trim();
    if (!name) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('suppliers').insert({
      name,
      website: newSupplierWebsite.trim() || null,
      active: true,
    }).select().single();
    if (error || !data) return;
    setSuppliers([...suppliers, data as Supplier]);
    updateForm('supplier_id', data.id);
    setShowNewSupplier(false);
    setNewSupplierName('');
    setNewSupplierWebsite('');
  }

  async function handleSave(status: 'draft' | 'published') {
    if (!form.name || !form.slug) {
      setSaveError('Product name is required.');
      return;
    }
    if (!priceOverride && calculatedSellingPrice <= 0 && form.product_type === 'dropshipping') {
      setSaveError('Selling price must be greater than 0. Set supplier cost or override the price.');
      return;
    }

    setSaving(true);
    setSaveError('');

    const supabase = createClient();
    const slug = slugify(form.slug);
    const { data: existing } = await supabase.from('products').select('id').eq('slug', slug).maybeSingle();
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    const payload = {
      name: form.name,
      slug: finalSlug,
      short_description: form.short_description || null,
      description: form.description || null,
      category_id: form.category_id || null,
      image_url: form.image_url || null,
      product_type: form.product_type,
      status,
      featured: false,
      currency: 'ZAR',
      rating: 0,
      review_count: 0,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
      supplier_id: form.supplier_id || null,
      supplier_sku: form.supplier_sku || null,
      supplier_cost: form.supplier_cost ? parseFloat(form.supplier_cost) : null,
      supplier_shipping_cost: form.supplier_shipping_cost ? parseFloat(form.supplier_shipping_cost) : null,
      markup_percentage: form.markup_percentage ? parseFloat(form.markup_percentage) : null,
      markup_amount: form.markup_amount ? parseFloat(form.markup_amount) : null,
      selling_price: priceOverride ? (parseFloat(form.selling_price) || null) : (calculatedSellingPrice || null),
      estimated_profit: calculatedSellingPrice - (parseFloat(form.supplier_cost) || 0),
      stock_status: form.stock_status,
      shipping_estimate: form.shipping_estimate || null,
      supplier_url: form.supplier_url || null,
      supplier_notes: form.supplier_notes || null,
      quantity_available: 0,
      colours: [],
      options: form.options.length > 0 ? form.options : [],
    };

    const { error } = await supabase.from('products').insert(payload);
    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    router.push('/admin/products');
    router.refresh();
  }

  const hasData = form.name !== '';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Import Product</h1>
          <p className="text-sm text-slate-500">Paste a product URL to automatically extract details</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Product URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://supplier-website.com/product/example"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleImport(); } }}
              disabled={importing}
              className="flex-1"
            />
            <Button onClick={handleImport} disabled={importing || !url.trim()} className="gap-2 min-w-[140px]">
              {importing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
              ) : (
                <><Upload className="h-4 w-4" /> Import Product</>
              )}
            </Button>
          </div>
          {importError && (
            <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-600 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              {importError}
            </div>
          )}
          {importWarnings.length > 0 && (
            <div className="mt-3 space-y-1">
              {importWarnings.map((w, i) => (
                <div key={i} className="rounded-md bg-amber-50 p-2 text-xs text-amber-700 flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  {w}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {hasData && (
        <>
          {saveError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{saveError}</div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Images ({images.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {images.map((img, i) => (
                    <div
                      key={i}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        i === primaryImageIndex ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => setPrimaryImageIndex(i)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={`Product ${i + 1}`} className="w-full h-32 object-cover" />
                      {i === primaryImageIndex && (
                        <div className="absolute top-1 left-1">
                          <Badge className="bg-blue-500 hover:bg-blue-500 text-[10px] px-1.5 py-0">Primary</Badge>
                        </div>
                      )}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                          className="rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveImage(i, 'up'); }}
                          disabled={i === 0}
                          className="rounded-full bg-white/90 p-0.5 text-slate-700 hover:bg-white disabled:opacity-30"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveImage(i, 'down'); }}
                          disabled={i === images.length - 1}
                          className="rounded-full bg-white/90 p-0.5 text-slate-700 hover:bg-white disabled:opacity-30"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setPrimaryImage(i); }}
                          className="rounded-full bg-white/90 p-0.5 text-slate-700 hover:bg-white"
                          title="Set as primary"
                        >
                          <Star className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No images found. Add an image URL below.</p>
              )}

              <div className="flex gap-2">
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Add image URL..."
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl(); } }}
                />
                <Button type="button" variant="outline" onClick={addImageUrl} className="gap-1 shrink-0">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Product Name *</Label>
                  <Input value={form.name} onChange={(e) => { updateForm('name', e.target.value); updateForm('slug', slugify(e.target.value)); }} required />
                </div>
                <div>
                  <Label>Slug *</Label>
                  <Input value={form.slug} onChange={(e) => updateForm('slug', e.target.value)} required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Product Type</Label>
                  <Select value={form.product_type} onValueChange={(v) => updateForm('product_type', v as ProductType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category_id || 'none'} onValueChange={(v) => updateForm('category_id', v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Short Description</Label>
                <Textarea value={form.short_description} onChange={(e) => updateForm('short_description', e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Full Description</Label>
                <Textarea value={form.description} onChange={(e) => updateForm('description', e.target.value)} rows={6} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Supplier Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Supplier</Label>
                  <div className="flex gap-2">
                    <Select value={form.supplier_id || 'none'} onValueChange={(v) => updateForm('supplier_id', v === 'none' ? '' : v)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No supplier</SelectItem>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={() => setShowNewSupplier(!showNewSupplier)} title="Add new supplier">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Supplier SKU</Label>
                  <Input value={form.supplier_sku} onChange={(e) => updateForm('supplier_sku', e.target.value)} />
                </div>
              </div>
              {showNewSupplier && (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 space-y-2">
                  <p className="text-sm font-medium text-slate-700">Create New Supplier</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Supplier name" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
                    <Input placeholder="Website (optional)" value={newSupplierWebsite} onChange={(e) => setNewSupplierWebsite(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={createSupplier} disabled={!newSupplierName.trim()}>Create & Select</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewSupplier(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              <div>
                <Label>Supplier Product URL</Label>
                <Input value={form.supplier_url} onChange={(e) => updateForm('supplier_url', e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <Label>Supplier Notes</Label>
                <Textarea value={form.supplier_notes} onChange={(e) => updateForm('supplier_notes', e.target.value)} rows={2} placeholder="Fulfillment instructions..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>Supplier Cost (R)</Label>
                  <Input type="number" step="0.01" value={form.supplier_cost} onChange={(e) => updateForm('supplier_cost', e.target.value)} />
                </div>
                <div>
                  <Label>Shipping Cost (R)</Label>
                  <Input type="number" step="0.01" value={form.supplier_shipping_cost} onChange={(e) => updateForm('supplier_shipping_cost', e.target.value)} />
                </div>
                <div>
                  <Label>Markup %</Label>
                  <Input type="number" step="1" value={form.markup_percentage} onChange={(e) => updateForm('markup_percentage', e.target.value)} />
                </div>
                <div>
                  <Label>Markup Amount (R)</Label>
                  <Input type="number" step="0.01" value={form.markup_amount} onChange={(e) => updateForm('markup_amount', e.target.value)} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch id="price_override" checked={priceOverride} onCheckedChange={setPriceOverride} />
                <Label htmlFor="price_override">Override selling price manually</Label>
              </div>

              {priceOverride && (
                <div className="max-w-xs">
                  <Label>Selling Price (R) *</Label>
                  <Input type="number" step="0.01" value={form.selling_price} onChange={(e) => updateForm('selling_price', e.target.value)} required />
                </div>
              )}

              <div className="rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4">
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
                    <p className="font-bold text-lg text-green-700">{formatPrice(calculatedSellingPrice - (parseFloat(form.supplier_cost) || 0), 'ZAR')}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Stock Status</Label>
                  <Select value={form.stock_status} onValueChange={(v) => updateForm('stock_status', v as StockStatus)}>
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
                  <Input value={form.shipping_estimate} onChange={(e) => updateForm('shipping_estimate', e.target.value)} placeholder="e.g. 5-10 business days" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.options.length > 0 && (
                <div className="space-y-3">
                  {form.options.map((opt) => (
                    <div key={opt.type} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-700">{opt.type} ({opt.values.length} values)</span>
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
                      {['Colour', 'Size', 'Weight', 'Material', 'Style', 'Storage', 'Capacity', 'Model', 'Length'].map((t) => (
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
                    placeholder={`Add ${newOptionType} value...`}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOptionValue(); } }}
                  />
                </div>
                {newOptionType === 'Colour' && (
                  <div className="w-20">
                    <Label>Hex</Label>
                    <input type="color" value={newOptionHex} onChange={(e) => setNewOptionHex(e.target.value)} className="h-10 w-full cursor-pointer rounded-md border border-slate-200" />
                  </div>
                )}
                <Button type="button" variant="outline" onClick={addOptionValue} className="gap-1 shrink-0">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>SEO Title</Label>
                <Input value={form.seo_title} onChange={(e) => updateForm('seo_title', e.target.value)} />
              </div>
              <div>
                <Label>SEO Description</Label>
                <Textarea value={form.seo_description} onChange={(e) => updateForm('seo_description', e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={() => handleSave('draft')} disabled={saving} variant="outline" className="gap-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
              Save Draft
            </Button>
            <Button onClick={() => handleSave('published')} disabled={saving} className="gap-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save &amp; Publish
            </Button>
            <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
          </div>
        </>
      )}
    </div>
  );
}
