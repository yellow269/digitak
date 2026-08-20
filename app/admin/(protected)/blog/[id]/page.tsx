import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BlogForm } from '@/components/admin/blog-form';
import type { BlogPost } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EditBlogPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from('blog_posts').select('*').eq('id', params.id).maybeSingle();
  const post = data as BlogPost | null;
  if (!post) notFound();

  const initialData = {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || '',
    content: post.content,
    featured_image: post.featured_image || '',
    category: post.category || '',
    author: post.author || '',
    tags: Array.isArray(post.tags) ? post.tags : [],
    seo_title: post.seo_title || '',
    seo_description: post.seo_description || '',
    published: post.published,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Article</h1>
        <p className="text-sm text-slate-500">{post.title}</p>
      </div>
      <BlogForm postId={post.id} initialData={initialData} />
    </div>
  );
}
