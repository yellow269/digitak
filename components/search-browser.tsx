'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ArrowLeft, PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductCard } from '@/components/product-card';
import type { Product } from '@/lib/types';

export function SearchBrowser({ initialProducts, query }: { initialProducts: Product[]; query: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [searchValue, setSearchValue] = useState(query);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchValue.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-2 gap-1">
        <a href="/">
          <ArrowLeft className="h-4 w-4" />
          Home
        </a>
      </Button>
      <h1 className="text-3xl font-bold text-slate-900">Search</h1>
      <p className="text-slate-500">Find digital products across our entire catalogue</p>

      <form onSubmit={handleSearch} className="relative mt-6 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search products, categories, vendors..."
          className="h-12 pl-11 text-base"
          aria-label="Search products"
        />
        <Button type="submit" className="absolute right-2 top-2 h-8">
          Search
        </Button>
      </form>

      {query && (
        <p className="mt-4 text-sm text-slate-500">
          {initialProducts.length > 0
            ? `${initialProducts.length} result${initialProducts.length !== 1 ? 's' : ''} for "${query}"`
            : `No results for "${query}"`}
        </p>
      )}

      {!query && (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <PackageSearch className="h-12 w-12 text-slate-300" />
          <p className="mt-4 text-lg font-medium text-slate-600">Start searching</p>
          <p className="text-sm text-slate-500">Enter a keyword above to find digital products.</p>
        </div>
      )}

      {query && initialProducts.length === 0 && (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <PackageSearch className="h-12 w-12 text-slate-300" />
          <p className="mt-4 text-lg font-medium text-slate-600">No results found</p>
          <p className="text-sm text-slate-500">Try a different keyword or browse all products.</p>
          <Button asChild className="mt-4" variant="outline">
            <a href="/products">Browse all products</a>
          </Button>
        </div>
      )}

      {initialProducts.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {initialProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
