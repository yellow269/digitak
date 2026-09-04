import Link from 'next/link';
import { ArrowRight, Search, Sparkles, TrendingUp, Clock, ShieldCheck, Star, Truck, CreditCard, RefreshCw, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/product-card';
import { NewsletterForm } from '@/components/newsletter-form';
import { createPublicSupabaseClient } from '@/lib/supabase/server';
import { SITE_NAME } from '@/lib/constants';
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
    supabase.from('categories').select('*').is('parent_id', null).order('sort_order', { ascending: true }).limit(16),
    supabase
      .from('products')
      .select('category:categories!inner(id,name,slug)')
      .eq('status', 'published')
      .limit(100),
  ]);

  const catCounts: Record<string, number> = {};
  (popularCats.data as unknown as { category: Category }[])?.forEach((row) => {
    if (row.category) {
      catCounts[row.category.id] = (catCounts[row.category.id] || 0) + 1;
    }
  });
  const popularCategories = (categories.data as Category[])
    ?.map((c) => ({ ...c, count: catCounts[c.id] || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

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
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-grid-white/5 [background-image:linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-sky-500/20 to-transparent rounded-full blur-3xl" />
        <div className="container relative mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4 gap-1 bg-white/10 text-white border-white/20">
              <Sparkles className="h-3.5 w-3.5" />
              Welcome to {SITE_NAME}
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Everything You Need,{' '}
              <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
                All in One Place
              </span>
            </h1>
            <p className="mt-6 text-lg text-slate-300 sm:text-xl">
              Shop from thousands of products with fast delivery, secure payments and great prices.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="gap-1 bg-sky-500 hover:bg-sky-600 text-white">
                <Link href="/products">
                  Start Shopping
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
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
                placeholder="Search for products, brands, categories..."
                className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-24 text-base shadow-lg focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                aria-label="Search products"
                maxLength={100}
              />
              <Button type="submit" className="absolute right-2 top-2 h-10">
                Search
              </Button>
            </form>
          </div>

          {/* Trust badges */}
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: Truck, label: 'Free Shipping', sub: 'On orders over R500' },
              { icon: CreditCard, label: 'Secure Payment', sub: 'PayFast encrypted' },
              { icon: RefreshCw, label: 'Easy Returns', sub: '30-day policy' },
              { icon: ShieldCheck, label: 'Buyer Protection', sub: '100% secure' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1 text-center">
                <item.icon className="h-5 w-5 text-sky-400" />
                <p className="text-xs font-medium text-white">{item.label}</p>
                <p className="text-[10px] text-slate-400">{item.sub}</p>
              </div>
            ))}
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
            <h2 className="mb-6 text-2xl font-bold text-slate-900">Shop by Category</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {popularCategories.map((cat) => (
                <Link key={cat.id} href={`/category/${cat.slug}`}>
                  <Card className="h-full transition-all hover:shadow-md hover:border-sky-300 group">
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600 group-hover:bg-sky-200 transition-colors">
                        <Package className="h-6 w-6" />
                      </div>
                      <p className="font-medium text-slate-900">{cat.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{cat.count} products</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Best Sellers */}
      {trending.length > 0 && (
        <section className="container mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-sky-600" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Best Sellers</h2>
                <p className="text-sm text-slate-500">Top-rated by our customers</p>
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

      {/* Deals / Recently Added */}
      {recent.length > 0 && (
        <section className="bg-slate-50 py-12">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-6 w-6 text-sky-600" />
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">New Arrivals</h2>
                  <p className="text-sm text-slate-500">The latest additions to our store</p>
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

      {/* Why Shop With Us */}
      <section className="container mx-auto max-w-7xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">Why Shop With Us?</h2>
          <p className="mt-2 text-slate-500">We make online shopping easy, safe and affordable.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-4">
          {[
            {
              icon: Truck,
              title: 'Fast Delivery',
              desc: 'Direct from supplier to your door. No middlemen, no delays.',
            },
            {
              icon: ShieldCheck,
              title: 'Secure Payments',
              desc: 'Pay securely with PayFast. Your data is always protected.',
            },
            {
              icon: Star,
              title: 'Quality Products',
              desc: 'Every product is vetted before listing. Quality you can trust.',
            },
            {
              icon: CreditCard,
              title: 'Best Prices',
              desc: 'Competitive pricing with transparent costs. No hidden fees.',
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

      {/* Newsletter + CTA */}
      <section className="bg-slate-900 py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="text-white">
              <h2 className="text-2xl font-bold">Stay in the loop</h2>
              <p className="mt-2 text-slate-300">
                Get notified about new products, deals and exclusive offers. No spam, ever.
              </p>
              <div className="mt-6">
                <NewsletterForm />
              </div>
            </div>

            <div className="flex flex-col items-center justify-center text-center text-white">
              <h2 className="text-2xl font-bold">Ready to shop?</h2>
              <p className="mt-2 text-slate-300">
                Browse our full catalogue and find exactly what you need.
              </p>
              <Button asChild size="lg" className="mt-6 gap-1 bg-sky-500 hover:bg-sky-600">
                <Link href="/products">
                  Browse all products
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
