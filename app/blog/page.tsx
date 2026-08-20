import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createPublicSupabaseClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';
import type { BlogPost } from '@/lib/types';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Blog — Digital Products, AI Tools & Online Business',
  description: 'Guides, reviews and tutorials on AI tools, online business, software, marketing and digital products.',
  alternates: { canonical: '/blog' },
};

export default async function BlogPage() {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[BlogPage] Error fetching posts:', error.message);
  }

  const posts = (data as BlogPost[]) || [];
  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Blog</h1>
        <p className="text-slate-500">Guides, reviews and tutorials on digital products and online business</p>
      </div>

      {featured && (
        <Link href={`/blog/${featured.slug}`} className="mb-10 block">
          <Card className="overflow-hidden transition-all hover:shadow-lg">
            <div className="grid gap-0 md:grid-cols-2">
              <div className="relative aspect-video md:aspect-auto">
                {featured.featured_image && (
                  <Image
                    src={featured.featured_image}
                    alt={featured.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                )}
              </div>
              <CardContent className="flex flex-col justify-center p-6">
                <Badge className="mb-2 w-fit">{featured.category}</Badge>
                <h2 className="text-2xl font-bold text-slate-900">{featured.title}</h2>
                {featured.excerpt && <p className="mt-2 text-slate-600">{featured.excerpt}</p>}
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="h-4 w-4" />
                  {formatDate(featured.published_at || featured.created_at)}
                </div>
              </CardContent>
            </div>
          </Card>
        </Link>
      )}

      {rest.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`}>
              <Card className="h-full overflow-hidden transition-all hover:shadow-md">
                {post.featured_image && (
                  <div className="relative aspect-video">
                    <Image
                      src={post.featured_image}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-5">
                  {post.category && <Badge variant="secondary" className="mb-2">{post.category}</Badge>}
                  <h3 className="font-semibold text-slate-900 line-clamp-2">{post.title}</h3>
                  {post.excerpt && <p className="mt-1 text-sm text-slate-500 line-clamp-2">{post.excerpt}</p>}
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="h-3 w-3" />
                    {formatDate(post.published_at || post.created_at)}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-medium text-slate-600">No articles yet</p>
          <p className="text-sm text-slate-500">Check back soon for new content.</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/products">Browse products</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
