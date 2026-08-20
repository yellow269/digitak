'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Trash2, Plus, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/format';
import type { Category } from '@/lib/types';

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [list, setList] = useState(categories);

  function startNew() {
    setEditing(null);
    setShowForm(true);
  }

  function startEdit(cat: Category) {
    setEditing(cat);
    setShowForm(true);
  }

  function onSaved(updated: Category, isNew: boolean) {
    if (isNew) {
      setList((prev) => [...prev, updated]);
    } else {
      setList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    }
    setShowForm(false);
    setEditing(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? Products in it will keep their data but lose the category link.')) return;
    const supabase = createClient();
    await supabase.from('categories').delete().eq('id', id);
    setList((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500">{list.length} categories</p>
        </div>
        <Button onClick={startNew} className="gap-1">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {showForm && (
        <CategoryForm
          key={editing?.id || 'new'}
          initial={editing}
          onSaved={onSaved}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Sort Order</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.map((cat) => (
              <tr key={cat.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{cat.name}</td>
                <td className="px-4 py-3 text-slate-600">{cat.slug}</td>
                <td className="px-4 py-3 text-slate-600">{cat.sort_order}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: Category | null;
  onSaved: (cat: Category, isNew: boolean) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [slug, setSlug] = useState(initial?.slug || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [imageUrl, setImageUrl] = useState(initial?.image_url || '');
  const [seoTitle, setSeoTitle] = useState(initial?.seo_title || '');
  const [seoDescription, setSeoDescription] = useState(initial?.seo_description || '');
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!name || !slug) {
      setError('Name and slug are required.');
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const payload = {
      name,
      slug,
      description: description || null,
      image_url: imageUrl || null,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
      sort_order: parseInt(sortOrder, 10) || 0,
    };
    let result;
    if (initial) {
      result = await supabase.from('categories').update(payload).eq('id', initial.id).select().single();
    } else {
      result = await supabase.from('categories').insert(payload).select().single();
    }
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    onSaved(result.data as Category, !initial);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {initial ? 'Edit Category' : 'New Category'}
          <Button variant="ghost" size="icon" onClick={onCancel}><X className="h-4 w-4" /></Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cat-name">Name *</Label>
              <Input id="cat-name" value={name} onChange={(e) => { setName(e.target.value); if (!initial) setSlug(slugify(e.target.value)); }} required />
            </div>
            <div>
              <Label htmlFor="cat-slug">Slug *</Label>
              <Input id="cat-slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
            </div>
          </div>
          <div>
            <Label htmlFor="cat-desc">Description</Label>
            <Textarea id="cat-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cat-image">Image URL</Label>
              <Input id="cat-image" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cat-sort">Sort Order</Label>
              <Input id="cat-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="cat-seo-title">SEO Title</Label>
            <Input id="cat-seo-title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cat-seo-desc">SEO Description</Label>
            <Textarea id="cat-seo-desc" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} />
          </div>
          <Button type="submit" disabled={loading} className="gap-1">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><Save className="h-4 w-4" />Save Category</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
