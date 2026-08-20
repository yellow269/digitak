'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SlidersHorizontal, Search, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product, Category } from '@/lib/types';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

const PRICE_RANGES = [
  { value: 'all', label: 'All prices', min: 0, max: Infinity },
  { value: '0-100', label: 'R0 – R100', min: 0, max: 100 },
  { value: '100-500', label: 'R100 – R500', min: 100, max: 500 },
  { value: '500-1000', label: 'R500 – R1000', min: 500, max: 1000 },
  { value: '1000+', label: 'R1000+', min: 1000, max: Infinity },
];

export function ProductsBrowser({
  initialProducts,
  categories,
}: {
  initialProducts: Product[];
  categories: Category[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'all';
  const priceRange = searchParams.get('price') || 'all';
  const sort = searchParams.get('sort') || 'featured';

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (val && val !== 'all') params.set(key, val);
        else params.delete(key);
      });
      router.push(`/products?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Reset to first page when filters change
  useEffect(() => {
    setProducts(initialProducts);
    setPage(1);
    setHasMore(initialProducts.length >= 12);
  }, [initialProducts, q, category, priceRange, sort]);

  async function loadMore() {
    setLoading(true);
    const nextPage = page + 1;
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category !== 'all') params.set('category', category);
    if (priceRange !== 'all') params.set('price', priceRange);
    params.set('sort', sort);
    params.set('page', String(nextPage));

    const res = await fetch(`/api/products?${params.toString()}`);
    const data = await res.json();
    if (data.products?.length) {
      setProducts((prev) => [...prev, ...data.products]);
      setHasMore(data.products.length >= 12);
    } else {
      setHasMore(false);
    }
    setPage(nextPage);
    setLoading(false);
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">All Products</h1>
        <p className="text-slate-500">Browse our full catalogue of digital products</p>
      </div>

      {/* Search + sort bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          action="/products"
          className="relative flex-1"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search products..."
            className="pl-9"
            aria-label="Search products"
          />
        </form>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-1 lg:hidden">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] overflow-y-auto">
              <div className="pt-6">
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="absolute right-4 top-4">
                    <X className="h-4 w-4" />
                  </Button>
                </SheetClose>
                <FilterPanel
                  categories={categories}
                  category={category}
                  priceRange={priceRange}
                  onCategoryChange={(v) => updateParams({ category: v })}
                  onPriceChange={(v) => updateParams({ price: v })}
                />
              </div>
            </SheetContent>
          </Sheet>

          <Select value={sort} onValueChange={(v) => updateParams({ sort: v })}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Desktop sidebar filters */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <FilterPanel
            categories={categories}
            category={category}
            priceRange={priceRange}
            onCategoryChange={(v) => updateParams({ category: v })}
            onPriceChange={(v) => updateParams({ price: v })}
          />
        </aside>

        {/* Product grid */}
        <div className="flex-1">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg font-medium text-slate-600">No products found</p>
              <p className="text-sm text-slate-500">Try adjusting your filters or search terms.</p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/products">Clear filters</Link>
              </Button>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-500">
                Showing {products.length} product{products.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <Button onClick={loadMore} disabled={loading} variant="outline" className="gap-1">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load more'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterPanel({
  categories,
  category,
  priceRange,
  onCategoryChange,
  onPriceChange,
}: {
  categories: Category[];
  category: string;
  priceRange: string;
  onCategoryChange: (v: string) => void;
  onPriceChange: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Category</h3>
        <div className="space-y-1">
          <button
            onClick={() => onCategoryChange('all')}
            className={`block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
              category === 'all' ? 'bg-sky-50 text-sky-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.slug)}
              className={`block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                category === cat.slug ? 'bg-sky-50 text-sky-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Price range</h3>
        <div className="space-y-1">
          {PRICE_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => onPriceChange(range.value)}
              className={`block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                priceRange === range.value ? 'bg-sky-50 text-sky-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProductsGridSkeleton() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <Skeleton className="mb-6 h-10 w-48" />
      <div className="mb-6 flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="flex gap-6">
        <Skeleton className="hidden h-96 w-64 lg:block" />
        <div className="flex-1">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
