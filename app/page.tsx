import Link from 'next/link';
import { ArrowRight, Search, Sparkles, TrendingUp, Clock, ShieldCheck, Star, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/product-card';
import { NewsletterForm } from '@/components/newsletter-form';
import { createPublicSupabaseClient } from '@/lib/supabase/server';
import { AFFILIATE_DISCLOSURE_SHORT, SITE_NAME } from '@/lib/constants';
import { PUBLIC_PRODUCT_COLUMNS } from '@/lib/queries';
import type { Product, Category } from '@/lib/types';

export const revalidate = 3600;

async function getHomeData() {
  const supabase = createPublicSupabaseClient();
  const [featured, trending, recent, categories, popularCats] = await Promise.all([
    supabase
      .from('products')
      .select(PUBLIC_PRODUCT_COLUMNS)
      .eq('status', 'published')
      .eq('featured', true)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('products')
      .select(PUBLIC_PRODUCT_COLUMNS)
      .eq('status', 'published')
      .order('rating', { ascending: false })
      .limit(4),
    supabase
      .from('products')
      .select(PUBLIC_PRODUCT_COLUMNS)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(4),
    supabase.from('categories').select('*').order('sort_order', { ascending: true }).limit(14),
    supabase
      .from('products')
      .select('category:categories!inner(id,name,slug)')
      .eq('status', 'published')
      .limit(100),
  ]);

  // Count products per category for "popular categories"
  const catCounts: Record<string, number> = {};
  (popularCats.data as unknown as { category: Category }[])?.forEach((row) => {
    if (row.category) {
      catCounts[row.category.id] = (catCounts[row.category.id] || 0) + 1;
    }
  });
  const popularCategories = (categories.data as Category[])
    ?.map((c) => ({ ...c, count: catCounts[c.id] || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    featured: (featured.data as unknown as Product[]) || [],
    trending: (trending.data as unknown as Product[]) || [],
    recent: (recent.data as unknown as Product[]) || [],
    categories: (categories.data as unknown as Category[]) || [],
    popularCategories,
  };
}

export default async function HomePage() {
  const { featured, trending, recent, categories, popularCategories } = await getHomeData();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-white to-white">
        <div className="absolute inset-0 bg-grid-slate-100 [background-image:linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="container relative mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4 gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Curated digital products for South Africa
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Discover Digital Products That Can Help You{' '}
              <span className="bg-gradient-to-r from-sky-600 to-cyan-500 bg-clip-text text-transparent">
                Work Smarter
              </span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 sm:text-xl">
              Explore software, AI tools, business resources, courses, ebooks and more.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="gap-1">
                <Link href="/products">
                  Explore Products
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/blog">Read the Blog</Link>
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="mx-auto mt-10 max-w-2xl">
            <form action="/search" className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                placeholder="Search for AI tools, courses, software..."
                className="h-14 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-24 text-base shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                aria-label="Search products"
                maxLength={100}
              />
              <Button type="submit" className="absolute right-2 top-2 h-10">
                Search
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="container mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Featured Products</h2>
              <p className="text-sm text-slate-500">Hand-picked products worth your attention</p>
            </div>
            <Button asChild variant="ghost" className="gap-1">
              <Link href="/products?filter=featured">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Popular categories */}
      {popularCategories && popularCategories.length > 0 && (
        <section className="bg-slate-50 py-12">
          <div className="container mx-auto max-w-7xl px-4">
            <h2 className="mb-6 text-2xl font-bold text-slate-900">Popular Categories</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {popularCategories.map((cat) => (
                <Link key={cat.id} href={`/category/${cat.slug}`}>
                  <Card className="h-full transition-all hover:shadow-md hover:border-sky-300">
                    <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-slate-900 line-clamp-2">{cat.name}</p>
                      <p className="text-xs text-slate-500">{cat.count} products</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trending products */}
      {trending.length > 0 && (
        <section className="container mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-sky-600" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Trending Products</h2>
                <p className="text-sm text-slate-500">Top-rated by our community</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trending.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Recently added */}
      {recent.length > 0 && (
        <section className="bg-slate-50 py-12">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-sky-600" />
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Recently Added</h2>
                  <p className="text-sm text-slate-500">The latest additions to our catalogue</p>
                </div>
              </div>
              <Button asChild variant="ghost" className="gap-1">
                <Link href="/products?sort=newest">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {recent.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why DigitalVault SA */}
      <section className="container mx-auto max-w-7xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">Why {SITE_NAME}?</h2>
          <p className="mt-2 text-slate-500">We help you find digital products worth your time and money.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: 'Vetted & Transparent',
              desc: 'Every product is reviewed before listing. We clearly disclose all affiliate relationships.',
            },
            {
              icon: Star,
              title: 'Quality First',
              desc: 'We focus on products with strong ratings and genuine value — no filler, no fluff.',
            },
            {
              icon: Eye,
              title: 'Always Honest',
              desc: 'No fake reviews or inflated claims. What you see is what you get.',
            },
          ].map((f) => (
            <Card key={f.title}>
              <CardContent className="p-6">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Affiliate disclosure */}
      <section className="bg-amber-50 border-y border-amber-100">
        <div className="container mx-auto max-w-7xl px-4 py-6">
          <p className="text-center text-sm text-amber-800">
            <strong>Affiliate Disclosure:</strong> {AFFILIATE_DISCLOSURE_SHORT}{' '}
            <Link href="/affiliate-disclosure" className="underline hover:text-amber-900">
              Learn more
            </Link>
          </p>
        </div>
      </section>

      {/* Newsletter + CTA */}
      <section className="container mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="bg-slate-900 text-white">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold">Stay in the loop</h2>
              <p className="mt-2 text-slate-300">
                Get notified about new digital products, tools and resources. No spam, ever.
              </p>
              <div className="mt-6">
                <NewsletterForm />
              </div>
            </CardContent>
          </Card>

          <Card className="border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50">
            <CardContent className="flex h-full flex-col items-center justify-center p-8 text-center">
              <h2 className="text-2xl font-bold text-slate-900">Ready to explore?</h2>
              <p className="mt-2 text-slate-600">
                Browse our full catalogue of digital products, tools and resources.
              </p>
              <Button asChild size="lg" className="mt-6 gap-1">
                <Link href="/products">
                  Browse all products
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
