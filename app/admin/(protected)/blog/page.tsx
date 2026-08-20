import Link from 'next/link';
import { Plus, Pencil, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';
import type { BlogPost } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });

  if (error) {
    console.error('[AdminBlog] Fetch error:', error.message);
  }

  const posts = (data as BlogPost[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Blog</h1>
          <p className="text-sm text-slate-500">{posts.length} articles</p>
        </div>
        <Button asChild className="gap-1">
          <Link href="/admin/blog/new"><Plus className="h-4 w-4" />Write Article</Link>
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-slate-500">No articles yet.</p>
          <Button asChild className="mt-4"><Link href="/admin/blog/new">Write your first article</Link></Button>
        </CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.title}</td>
                  <td className="px-4 py-3 text-slate-600">{p.category || '—'}</td>
                  <td className="px-4 py-3"><Badge variant={p.published ? 'default' : 'secondary'}>{p.published ? 'Published' : 'Draft'}</Badge></td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {p.published && <Button asChild variant="ghost" size="icon"><Link href={`/blog/${p.slug}`} target="_blank"><ExternalLink className="h-4 w-4" /></Link></Button>}
                      <Button asChild variant="ghost" size="icon"><Link href={`/admin/blog/${p.id}`}><Pencil className="h-4 w-4" /></Link></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
