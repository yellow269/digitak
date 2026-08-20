import type { MetadataRoute } from 'next';
import { createPublicSupabaseClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicSupabaseClient();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/search`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/affiliate-disclosure`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  const [products, categories, posts] = await Promise.all([
    supabase.from('products').select('slug, updated_at').eq('status', 'published'),
    supabase.from('categories').select('slug, created_at'),
    supabase.from('blog_posts').select('slug, updated_at').eq('published', true),
  ]);

  const productPages: MetadataRoute.Sitemap = ((products.data as { slug: string; updated_at: string }[]) || []).map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const categoryPages: MetadataRoute.Sitemap = ((categories.data as { slug: string; created_at: string }[]) || []).map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    lastModified: new Date(c.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const blogPages: MetadataRoute.Sitemap = ((posts.data as { slug: string; updated_at: string }[]) || []).map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...productPages, ...categoryPages, ...blogPages];
}
