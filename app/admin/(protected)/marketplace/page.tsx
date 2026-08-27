'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Package, Loader2, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/format';
import type { Supplier, SupplierProduct } from '@/lib/types';

export default function MarketplacePage() {
  const router = useRouter();
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    supplier_id: '',
    product_name: '',
    product_url: '',
    supplier_sku: '',
    supplier_cost: '',
    shipping_cost: '',
    description: '',
    image_url: '',
    category: '',
    markup_percentage: '40',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const supabase = createClient();
    const [productsRes, suppliersRes] = await Promise.all([
      supabase.from('supplier_products').select('*, supplier:suppliers(name)').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').eq('active', true).order('name'),
    ]);
    setProducts((productsRes.data as SupplierProduct[]) || []);
    setSuppliers((suppliersRes.data as Supplier[]) || []);
    setLoading(false);
  }

  async function handleAddProduct() {
    setSaving(true);
    setError('');
    const supabase = createClient();

    if (!form.supplier_id || !form.product_name) {
      setError('Supplier and product name are required.');
      setSaving(false);
      return;
    }

    const { error: err } = await supabase.from('supplier_products').insert({
      supplier_id: form.supplier_id,
      product_name: form.product_name,
      product_url: form.product_url || null,
      supplier_sku: form.supplier_sku || null,
      supplier_cost: form.supplier_cost ? parseFloat(form.supplier_cost) : null,
      shipping_cost: form.shipping_cost ? parseFloat(form.shipping_cost) : null,
      description: form.description || null,
      image_url: form.image_url || null,
      category: form.category || null,
      markup_percentage: form.markup_percentage ? parseFloat(form.markup_percentage) : 40,
      notes: form.notes || null,
    });

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    setDialogOpen(false);
    setSaving(false);
    fetchData();
  }

  async function handleImportToStore(product: SupplierProduct) {
    const supabase = createClient();
    
    // Calculate selling price
    const baseCost = (product.supplier_cost || 0) + (product.shipping_cost || 0);
    const markup = baseCost * (product.markup_percentage || 40) / 100;
    const sellingPrice = baseCost + markup;
    const estimatedProfit = markup;

    // Create product in main products table
    const slug = product.product_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const { data: newProduct, error: productErr } = await supabase
      .from('products')
      .insert({
        name: product.product_name,
        slug: `${slug}-${Date.now()}`,
        short_description: product.description?.substring(0, 200) || null,
        description: product.description,
        product_type: 'dropshipping',
        supplier_id: product.supplier_id,
        supplier_sku: product.supplier_sku,
        supplier_cost: product.supplier_cost,
        supplier_shipping_cost: product.shipping_cost || 0,
        markup_percentage: product.markup_percentage,
        selling_price: sellingPrice,
        estimated_profit: estimatedProfit,
        stock_status: 'in_stock',
        supplier_url: product.product_url,
        image_url: product.image_url,
        price: sellingPrice,
        currency: 'ZAR',
        status: 'draft',
      })
      .select('id')
      .single();

    if (productErr) {
      alert('Failed to import: ' + productErr.message);
      return;
    }

    // Mark as imported
    await supabase
      .from('supplier_products')
      .update({ imported: true, imported_product_id: newProduct.id })
      .eq('id', product.id);

    fetchData();
  }

  const unimported = products.filter((p) => !p.imported);
  const imported = products.filter((p) => p.imported);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supplier Marketplace</h1>
          <p className="text-sm text-slate-500">Add supplier products and import them to your store</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setForm({ supplier_id: '', product_name: '', product_url: '', supplier_sku: '', supplier_cost: '', shipping_cost: '', description: '', image_url: '', category: '', markup_percentage: '40', notes: '' });
              setError('');
            }} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Supplier Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Supplier Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Supplier *</Label>
                  <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Product Name *</Label>
                  <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Supplier SKU</Label>
                  <Input value={form.supplier_sku} onChange={(e) => setForm({ ...form, supplier_sku: e.target.value })} />
                </div>
                <div>
                  <Label>Supplier URL</Label>
                  <Input value={form.product_url} onChange={(e) => setForm({ ...form, product_url: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Supplier Cost (R)</Label>
                  <Input type="number" step="0.01" value={form.supplier_cost} onChange={(e) => setForm({ ...form, supplier_cost: e.target.value })} />
                </div>
                <div>
                  <Label>Shipping Cost (R)</Label>
                  <Input type="number" step="0.01" value={form.shipping_cost} onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })} />
                </div>
                <div>
                  <Label>Markup %</Label>
                  <Input type="number" step="1" value={form.markup_percentage} onChange={(e) => setForm({ ...form, markup_percentage: e.target.value })} />
                </div>
              </div>
              {form.supplier_cost && form.markup_percentage && (
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-sm text-green-700">
                    Selling Price: <strong>{formatPrice(
                      (parseFloat(form.supplier_cost) || 0) + (parseFloat(form.shipping_cost) || 0) + ((parseFloat(form.supplier_cost) || 0) + (parseFloat(form.shipping_cost) || 0)) * (parseFloat(form.markup_percentage) || 0) / 100,
                      'ZAR'
                    )}</strong>
                    {' '} | Profit: <strong>{formatPrice(
                      ((parseFloat(form.supplier_cost) || 0) + (parseFloat(form.shipping_cost) || 0)) * (parseFloat(form.markup_percentage) || 0) / 100,
                      'ZAR'
                    )}</strong>
                  </p>
                </div>
              )}
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddProduct} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Add Product
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {unimported.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Ready to Import ({unimported.length})</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {unimported.map((product) => (
                  <SupplierProductCard
                    key={product.id}
                    product={product}
                    onImport={() => handleImportToStore(product)}
                  />
                ))}
              </div>
            </div>
          )}

          {imported.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Imported ({imported.length})</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {imported.map((product) => (
                  <SupplierProductCard
                    key={product.id}
                    product={product}
                    onImport={() => {}}
                    imported
                  />
                ))}
              </div>
            </div>
          )}

          {products.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-500">No supplier products yet. Add products from your suppliers to get started.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function SupplierProductCard({ product, onImport, imported }: { product: SupplierProduct; onImport: () => void; imported?: boolean }) {
  const baseCost = (product.supplier_cost || 0) + (product.shipping_cost || 0);
  const sellingPrice = baseCost + baseCost * (product.markup_percentage || 0) / 100;
  const profit = baseCost * (product.markup_percentage || 0) / 100;

  return (
    <Card className={imported ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        {product.image_url && (
          <div className="mb-3 h-32 overflow-hidden rounded-md bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.image_url} alt={product.product_name} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-slate-900 line-clamp-1">{product.product_name}</h3>
          {imported ? (
            <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> Imported</Badge>
          ) : null}
        </div>
        {product.supplier_sku && <p className="text-xs text-slate-500">SKU: {product.supplier_sku}</p>}
        <div className="mt-2 space-y-1 text-sm">
          {product.supplier_cost && <p>Cost: {formatPrice(product.supplier_cost, 'ZAR')}</p>}
          {product.shipping_cost && <p>Shipping: {formatPrice(product.shipping_cost, 'ZAR')}</p>}
          <p>Selling: <strong>{formatPrice(sellingPrice, 'ZAR')}</strong></p>
          <p className="text-green-600">Est. Profit: {formatPrice(profit, 'ZAR')}</p>
        </div>
        {!imported && (
          <Button onClick={onImport} className="w-full mt-3 gap-1" size="sm">
            <Package className="h-3 w-3" />
            Import to Store
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
