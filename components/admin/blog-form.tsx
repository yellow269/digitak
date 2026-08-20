'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Trash2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/format';
import { BLOG_CATEGORIES } from '@/lib/constants';

type BlogFormData = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  category: string;
  author: string;
  tags: string[];
  seo_title: string;
  seo_description: string;
  published: boolean;
};

const EMPTY: BlogFormData = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  featured_image: '',
  category: '',
  author: '',
  tags: [],
  seo_title: '',
  seo_description: '',
  published: false,
};

export function BlogForm({
  postId,
  initialData,
}: {
  postId?: string;
  initialData?: Partial<BlogFormData>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<BlogFormData>({ ...EMPTY, ...initialData });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (initialData) setForm({ ...EMPTY, ...initialData });
  }, [initialData]);

  function update<K extends keyof BlogFormData>(key: K, value: BlogFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    update('tags', [...form.tags, t]);
    setTagInput('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!form.title || !form.slug || !form.content) {
      setError('Title, slug and content are required.');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const payload = {
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt || null,
      content: form.content,
      featured_image: form.featured_image || null,
      category: form.category || null,
      author: form.author || null,
      tags: form.tags,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
      published: form.published,
      published_at: form.published ? new Date().toISOString() : null,
    };

    let result;
    if (postId) {
      result = await supabase.from('blog_posts').update(payload).eq('id', postId);
    } else {
      result = await supabase.from('blog_posts').insert(payload);
    }

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.push('/admin/blog');
    router.refresh();
  }

  async function handleDelete() {
    if (!postId) return;
    if (!confirm('Delete this article? This cannot be undone.')) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from('blog_posts').delete().eq('id', postId);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push('/admin/blog');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <Card>
        <CardHeader><CardTitle>Article Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={form.title} onChange={(e) => { update('title', e.target.value); if (!postId) update('slug', slugify(e.target.value)); }} required />
            </div>
            <div>
              <Label htmlFor="slug">Slug *</Label>
              <Input id="slug" value={form.slug} onChange={(e) => update('slug', e.target.value)} required />
            </div>
          </div>
          <div>
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea id="excerpt" value={form.excerpt} onChange={(e) => update('excerpt', e.target.value)} rows={2} />
          </div>
          <div>
            <Label htmlFor="content">Content (Markdown) *</Label>
            <Textarea id="content" value={form.content} onChange={(e) => update('content', e.target.value)} rows={12} required />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Organization</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={form.category || 'none'} onValueChange={(v) => update('category', v === 'none' ? '' : v)}>
                <SelectTrigger id="category"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {BLOG_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="author">Author</Label>
              <Input id="author" value={form.author} onChange={(e) => update('author', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="Add tag and press Enter" />
              <Button type="button" variant="outline" onClick={addTag} className="gap-1"><Plus className="h-4 w-4" />Add</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.tags.map((t, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs">
                    {t}
                    <button type="button" onClick={() => update('tags', form.tags.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Image &amp; SEO</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="featured_image">Featured Image URL</Label>
            <Input id="featured_image" type="url" value={form.featured_image} onChange={(e) => update('featured_image', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="seo_title">SEO Title</Label>
            <Input id="seo_title" value={form.seo_title} onChange={(e) => update('seo_title', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="seo_description">SEO Description</Label>
            <Textarea id="seo_description" value={form.seo_description} onChange={(e) => update('seo_description', e.target.value)} rows={2} />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="published" checked={form.published} onCheckedChange={(v) => update('published', v)} />
            <Label htmlFor="published">Published</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading} className="gap-1">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><Save className="h-4 w-4" />{postId ? 'Update Article' : 'Create Article'}</>}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        {postId && <Button type="button" variant="destructive" onClick={handleDelete} className="gap-1 ml-auto"><Trash2 className="h-4 w-4" />Delete</Button>}
      </div>
    </form>
  );
}
