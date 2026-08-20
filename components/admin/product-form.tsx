'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Trash2, Star, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/format';
import type { Category } from '@/lib/types';

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
  currency: string;
  rating: string;
  review_count: string;
  featured: boolean;
  status: string;
  seo_title: string;
  seo_description: string;
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
  currency: 'ZAR',
  rating: '0',
  review_count: '0',
  featured: false,
  status: 'draft',
  seo_title: '',
  seo_description: '',
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

  useEffect(() => {
    if (initialData) {
      setForm({ ...EMPTY, ...initialData });
    }
  }, [initialData]);

  function update<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addBenefit() {
    const b = benefitInput.trim();
    if (!b) return;
    update('benefits', [...form.benefits, b]);
    setBenefitInput('');
  }

  function removeBenefit(i: number) {
    update('benefits', form.benefits.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!form.name || !form.slug || !form.affiliate_url) {
      setError('Name, slug and affiliate URL are required.');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const payload = {
      name: form.name,
      slug: form.slug,
      short_description: form.short_description || null,
      description: form.description || null,
      benefits: form.benefits,
      category_id: form.category_id || null,
      vendor_name: form.vendor_name || null,
      image_url: form.image_url || null,
      affiliate_url: form.affiliate_url,
      price: form.price ? parseFloat(form.price) : null,
      currency: form.currency,
      rating: parseFloat(form.rating) || 0,
      review_count: parseInt(form.review_count, 10) || 0,
      featured: form.featured,
      status: form.status,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
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
                onChange={(e) => update('slug', e.target.value)}
                required
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

      <Card>
        <CardHeader>
          <CardTitle>Categorization &amp; Vendor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="category_id">Category</Label>
              <Select
                value={form.category_id || 'none'}
                onValueChange={(v) => update('category_id', v === 'none' ? '' : v)}
              >
                <SelectTrigger id="category_id">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="vendor_name">Vendor Name</Label>
              <Input
                id="vendor_name"
                value={form.vendor_name}
                onChange={(e) => update('vendor_name', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing &amp; Rating</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Links &amp; Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              This is where the &quot;View Offer&quot; button will redirect visitors.
            </p>
          </div>
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
