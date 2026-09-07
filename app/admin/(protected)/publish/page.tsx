'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Loader2, Search, ChevronLeft, ChevronRight, Check, X,
  Eye, EyeOff, Package, ArrowUpDown, ImageOff, AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { ProductOption, VariantStock } from '@/lib/types';

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  price: number | null;
  selling_price: number | null;
  supplier_cost: number | null;
  stock_status: string;
  quantity_available: number;
  status: string;
  options: ProductOption[] | null;
  variant_stock: VariantStock | null;
  supplier_handle: string | null;
  category_id: string | null;
  category: { name: string } | null;
};

type Stats = {
  total: number;
  draft: number;
  published: number;
  outOfStock: number;
};

type SortField = 'name' | 'price' | 'stock' | 'status' | 'created_at';
type SortOrder = 'asc' | 'desc';

function formatPrice(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `R${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function stockBadge(status: string, qty: number) {
  if (status === 'out_of_stock') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Out of stock</span>;
  }
  if (status === 'low_stock' || qty <= 5) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Low ({qty})</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">In stock ({qty})</span>;
}

function variantCount(options: ProductOption[] | null, variantStock: VariantStock | null): string {
  if (!options || options.length === 0) return 'No options';
  const totalVariants = Object.keys(variantStock || {}).length;
  if (totalVariants === 0) return `${options.length} option${options.length > 1 ? 's' : ''}, 0 variants`;
  return `${options.length} option${options.length > 1 ? 's' : ''}, ${totalVariants} variant${totalVariants > 1 ? 's' : ''}`;
}

export default function PublishPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, draft: 0, published: 0, outOfStock: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  // Filters
  const [stockFilter, setStockFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hasImage, setHasImage] = useState('');
  const [hasVariants, setHasVariants] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState<SortField>('created_at');
  const [order, setOrder] = useState<SortOrder>('desc');

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (stockFilter) params.set('stock', stockFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (hasImage) params.set('hasImage', hasImage);
    if (hasVariants) params.set('hasVariants', hasVariants);
    if (search) params.set('search', search);
    params.set('sort', sort);
    params.set('order', order);

    try {
      const res = await fetch(`/api/admin/publish?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setStats(data.stats || { total: 0, draft: 0, published: 0, outOfStock: 0 });
    } catch {
      setProducts([]);
    }
    setLoading(false);
  }, [page, stockFilter, statusFilter, hasImage, hasVariants, search, sort, order]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [stockFilter, statusFilter, hasImage, hasVariants, search, sort, order]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  }

  function toggleSort(field: SortField) {
    if (sort === field) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setOrder('asc');
    }
  }

  async function handleBulkAction(action: 'publish' | 'unpublish') {
    if (selected.size === 0) return;
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, productIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      setMessage({ type: 'success', text: data.message });
      setSelected(new Set());
      fetchProducts();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed' });
    }
    setActionLoading(false);
  }

  async function handleTogglePublish(product: ProductRow) {
    const action = product.status === 'published' ? 'unpublish' : 'publish';

    // Don't allow publishing out-of-stock products
    if (action === 'publish' && product.stock_status === 'out_of_stock') {
      setMessage({ type: 'error', text: 'Cannot publish out-of-stock products.' });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, productIds: [product.id] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      fetchProducts();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed' });
    }
    setActionLoading(false);
  }

  const allSelected = products.length > 0 && selected.size === products.length;
  const someSelected = selected.size > 0 && selected.size < products.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Review & Publish</h1>
        <p className="text-sm text-slate-500">Review imported Zalemart products and publish them to your store.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <button
          onClick={() => { setStatusFilter(statusFilter === '' ? '' : ''); setStockFilter(''); }}
          className={`rounded-lg border p-4 text-left transition-colors ${statusFilter === '' && stockFilter === '' ? 'border-sky-300 bg-sky-50' : 'hover:bg-slate-50'}`}
        >
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs text-slate-500">Total Products</p>
        </button>
        <button
          onClick={() => { setStatusFilter(statusFilter === 'draft' ? '' : 'draft'); }}
          className={`rounded-lg border p-4 text-left transition-colors ${statusFilter === 'draft' ? 'border-amber-300 bg-amber-50' : 'hover:bg-slate-50'}`}
        >
          <p className="text-2xl font-bold text-amber-600">{stats.draft}</p>
          <p className="text-xs text-slate-500">Drafts</p>
        </button>
        <button
          onClick={() => { setStatusFilter(statusFilter === 'published' ? '' : 'published'); }}
          className={`rounded-lg border p-4 text-left transition-colors ${statusFilter === 'published' ? 'border-green-300 bg-green-50' : 'hover:bg-slate-50'}`}
        >
          <p className="text-2xl font-bold text-green-600">{stats.published}</p>
          <p className="text-xs text-slate-500">Published</p>
        </button>
        <button
          onClick={() => { setStockFilter(stockFilter === 'out_of_stock' ? '' : 'out_of_stock'); }}
          className={`rounded-lg border p-4 text-left transition-colors ${stockFilter === 'out_of_stock' ? 'border-red-300 bg-red-50' : 'hover:bg-slate-50'}`}
        >
          <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
          <p className="text-xs text-slate-500">Out of Stock</p>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </form>

        <select
          value={hasImage}
          onChange={(e) => setHasImage(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
        >
          <option value="">All images</option>
          <option value="true">Has image</option>
          <option value="false">Missing image</option>
        </select>

        <select
          value={hasVariants}
          onChange={(e) => setHasVariants(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
        >
          <option value="">All variants</option>
          <option value="true">Has variants</option>
          <option value="false">No variants</option>
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortField)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
        >
          <option value="created_at">Newest first</option>
          <option value="name">Name</option>
          <option value="price">Price</option>
          <option value="stock">Stock</option>
          <option value="status">Status</option>
        </select>

        {(stockFilter || statusFilter || hasImage || hasVariants || search) && (
          <button
            onClick={() => {
              setStockFilter(''); setStatusFilter(''); setHasImage('');
              setHasVariants(''); setSearch(''); setSearchInput('');
            }}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-md p-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
          <span className="text-sm font-medium text-sky-900">{selected.size} selected</span>
          <button
            disabled={actionLoading}
            onClick={() => handleBulkAction('publish')}
            className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            Publish
          </button>
          <button
            disabled={actionLoading}
            onClick={() => handleBulkAction('unpublish')}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
            Unpublish
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border bg-white py-16 text-center">
          <Package className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-sm text-slate-500">No products match your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                </th>
                <th className="w-14 px-2 py-3">Image</th>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-slate-900">
                    Product <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort('price')} className="inline-flex items-center gap-1 hover:text-slate-900">
                    Price <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort('stock')} className="inline-flex items-center gap-1 hover:text-slate-900">
                    Stock <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">Variants</th>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 hover:text-slate-900">
                    Status <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="w-20 px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product) => {
                const optCount = Array.isArray(product.options) ? product.options.length : 0;
                const vsCount = product.variant_stock ? Object.keys(product.variant_stock).length : 0;
                const isOOS = product.stock_status === 'out_of_stock';
                return (
                  <tr key={product.id} className={`hover:bg-slate-50 ${selected.has(product.id) ? 'bg-sky-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      {product.image_url ? (
                        <div className="relative h-10 w-10 overflow-hidden rounded-md border bg-slate-100">
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-slate-100">
                          <ImageOff className="h-4 w-4 text-slate-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="font-medium text-slate-900 hover:text-sky-600 line-clamp-1"
                          title={product.name}
                        >
                          {product.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-400 truncate">
                          {product.category?.name || 'Uncategorized'}
                          {product.supplier_handle ? ` · ${product.supplier_handle}` : ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{formatPrice(product.selling_price)}</div>
                      {product.supplier_cost ? (
                        <div className="text-xs text-slate-400">Cost: {formatPrice(product.supplier_cost)}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {stockBadge(product.stock_status, product.quantity_available)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {optCount === 0 ? (
                        <span className="text-slate-400">No options</span>
                      ) : (
                        <span>
                          {optCount} type{optCount > 1 ? 's' : ''}
                          {vsCount > 0 && <span className="text-slate-400"> · {vsCount} var</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {product.status === 'published' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          <Eye className="h-3 w-3" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          <EyeOff className="h-3 w-3" /> Draft
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isOOS && product.status !== 'published' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600" title="Out of stock — cannot publish">
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleTogglePublish(product)}
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                            product.status === 'published'
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'bg-sky-600 text-white hover:bg-sky-700'
                          }`}
                        >
                          {product.status === 'published' ? (
                            <><X className="h-3 w-3" /> Unpublish</>
                          ) : (
                            <><Check className="h-3 w-3" /> Publish</>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
