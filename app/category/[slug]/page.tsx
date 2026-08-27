import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPublicSupabaseClient } from '@/lib/supabase/server';
import { ProductsBrowser } from '@/components/products-browser';
import { PUBLIC_PRODUCT_COLUMNS } from '@/lib/queries';
import type { Product, Category } from '@/lib/types';

export const revalidate = 3600;

async function getCategory(slug: string): Promise<Category | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from('categories').select('*').eq('slug', slug).maybeSingle();
  if (error) {
    console.error('[CategoryPage] Error fetching category:', error.message);
    return null;
  }
  return data as Category | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: 'Category not found' };
  const title = category.seo_title || `${category.name} | Everything Store`;
  const description = category.seo_description || category.description || '';
  return {
    title,
    description,
    openGraph: { title, description, images: category.image_url ? [{ url: category.image_url }] : [] },
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const supabase = createPublicSupabaseClient();
  const [productsRes, categoriesRes] = await Promise.all([
    supabase
      .from('products')
      .select(PUBLIC_PRODUCT_COLUMNS)
      .eq('status', 'published')
      .eq('category_id', category.id)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
  ]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
              { '@type': 'ListItem', position: 2, name: category.name, item: `/category/${category.slug}` },
            ],
          }),
        }}
      />

      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-2 gap-1">
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
            All products
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-slate-900">{category.name}</h1>
        {category.description && (
          <p className="mt-2 max-w-2xl text-slate-600">{category.description}</p>
        )}
      </div>

      <ProductsBrowser
        initialProducts={(productsRes.data as unknown as Product[]) || []}
        categories={(categoriesRes.data as unknown as Category[]) || []}
      />
    </div>
  );
}
