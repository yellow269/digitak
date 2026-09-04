'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Trash2, Plus, Pencil, X, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/format';
import type { Category } from '@/lib/types';

function buildTree(categories: Category[]): Category[] {
  const parents = categories.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  return parents;
}

function getChildren(categories: Category[], parentId: string): Category[] {
  return categories.filter((c) => c.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order);
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [list, setList] = useState(categories);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showFormParentId, setShowFormParentId] = useState<string | null>(null);

  function startNew(parentId?: string) {
    setEditing(null);
    setShowFormParentId(parentId || null);
    setShowForm(true);
  }

  function startEdit(cat: Category) {
    setEditing(cat);
    setShowFormParentId(cat.parent_id || null);
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
    setShowFormParentId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? Products in it will keep their data but lose the category link. Subcategories will also be deleted.')) return;
    const supabase = createClient();
    await supabase.from('categories').delete().eq('id', id);
    setList((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
    router.refresh();
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const parents = buildTree(list);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500">{list.length} categories ({parents.length} top-level)</p>
        </div>
        <Button onClick={() => startNew()} className="gap-1">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {showForm && (
        <CategoryForm
          key={editing?.id || 'new'}
          initial={editing}
          parentId={showFormParentId}
          categories={list}
          onSaved={onSaved}
          onCancel={() => { setShowForm(false); setEditing(null); setShowFormParentId(null); }}
        />
      )}

      <div className="space-y-1">
        {parents.map((parent) => {
          const children = getChildren(list, parent.id);
          const isExpanded = expanded.has(parent.id);
          return (
            <div key={parent.id}>
              <div className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-50 group">
                {children.length > 0 ? (
                  <button onClick={() => toggleExpand(parent.id)} className="text-slate-400 hover:text-slate-600">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                ) : (
                  <span className="w-4" />
                )}
                <span className="font-medium text-slate-900 flex-1">{parent.name}</span>
                <span className="text-xs text-slate-400 mr-2">{parent.slug}</span>
                {children.length > 0 && (
                  <span className="text-xs text-slate-400 mr-2">{children.length} sub</span>
                )}
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => startNew(parent.id)} title="Add subcategory">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => startEdit(parent)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => handleDelete(parent.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </div>
              {isExpanded && children.length > 0 && (
                <div className="ml-6 space-y-0.5">
                  {children.map((child) => (
                    <div key={child.id} className="flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-slate-50 group">
                      <span className="w-4" />
                      <span className="text-sm text-slate-700 flex-1">{child.name}</span>
                      <span className="text-xs text-slate-400 mr-2">{child.slug}</span>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => startEdit(child)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => handleDelete(child.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryForm({
  initial,
  parentId,
  categories,
  onSaved,
  onCancel,
}: {
  initial: Category | null;
  parentId: string | null;
  categories: Category[];
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
  const [catParentId, setCatParentId] = useState(initial?.parent_id || parentId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parents = categories.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);

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
      parent_id: catParentId || null,
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
              <Input id="cat-slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} required />
            </div>
          </div>
          <div>
            <Label htmlFor="cat-parent">Parent Category</Label>
            <Select value={catParentId || 'none'} onValueChange={(v) => setCatParentId(v === 'none' ? '' : v)}>
              <SelectTrigger id="cat-parent"><SelectValue placeholder="None (top-level)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (top-level)</SelectItem>
                {parents.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
