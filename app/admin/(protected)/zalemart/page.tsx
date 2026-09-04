'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Download, Search, CheckCircle2, AlertTriangle,
  Package, Clock, ArrowUpDown, Loader2, ExternalLink, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate } from '@/lib/format';

type SyncResult = {
  productsFound: number;
  productsCreated: number;
  productsUpdated: number;
  productsDeactivated: number;
  variantsTotal: number;
  errors: string[];
};

type PreviewProduct = {
  handle: string;
  title: string;
  productType: string;
  variantCount: number;
  totalStock: number;
  minCost: number;
  imageUrl: string | null;
  alreadyImported: boolean;
  options: string;
};

type SyncLog = {
  id: string;
  sync_type: string;
  products_found: number;
  products_created: number;
  products_updated: number;
  products_deactivated: number;
  variants_total: number;
  status: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

export default function ZalemartPage() {
  const [activeTab, setActiveTab] = useState<'preview' | 'sync' | 'history'>('preview');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{ total: number; products: PreviewProduct[] } | null>(null);
  const [previewOffset, setPreviewOffset] = useState(0);
  const [previewSearch, setPreviewSearch] = useState('');
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [stats, setStats] = useState({ totalProducts: 0, activeProducts: 0 });
  const [selectedHandles, setSelectedHandles] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const loadPreview = useCallback(async (offset = 0, search = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ offset: String(offset), limit: '20' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/zalemart/preview?${params}`);
      const data = await res.json();
      if (res.ok) setPreviewData(data);
    } catch (err) {
      console.error('Preview load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/zalemart/sync', { method: 'GET' });
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
        setStats({ totalProducts: data.totalProducts || 0, activeProducts: data.activeProducts || 0 });
      }
    } catch (err) {
      console.error('Status load failed:', err);
    }
  }, []);

  useEffect(() => {
    loadPreview(0, previewSearch);
    loadStatus();
  }, [loadPreview, loadStatus]);

  useEffect(() => {
    if (previewData && selectAll) {
      const newSet = new Set(previewData.products.filter((p) => !p.alreadyImported).map((p) => p.handle));
      setSelectedHandles(newSet);
    }
  }, [selectAll, previewData]);

  async function runSync(mode: 'import' | 'sync', handles?: string[]) {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/zalemart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          selectedHandles: handles,
          markupPercentage: 40,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(data);
        loadStatus();
      } else {
        setSyncResult({
          productsFound: 0,
          productsCreated: 0,
          productsUpdated: 0,
          productsDeactivated: 0,
          variantsTotal: 0,
          errors: [data.error || 'Unknown error'],
        });
      }
    } catch (err) {
      setSyncResult({
        productsFound: 0,
        productsCreated: 0,
        productsUpdated: 0,
        productsDeactivated: 0,
        variantsTotal: 0,
        errors: [err instanceof Error ? err.message : 'Network error'],
      });
    } finally {
      setSyncing(false);
    }
  }

  function toggleHandle(handle: string) {
    setSelectedHandles((prev) => {
      const next = new Set(prev);
      if (next.has(handle)) next.delete(handle);
      else next.add(handle);
      return next;
    });
  }

  const totalPages = previewData ? Math.ceil(previewData.total / 20) : 0;
  const currentPage = previewData ? Math.floor(previewOffset / 20) + 1 : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Zalemart Supplier Sync</h1>
        <p className="text-sm text-slate-500">
          Import and sync products from Zalemart&apos;s official Google Sheet product feed.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-slate-500">Products in DB</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.activeProducts}</div>
            <p className="text-xs text-slate-500">Active (in stock)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{previewData?.total || '...'}</div>
            <p className="text-xs text-slate-500">Available in feed</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { key: 'preview' as const, label: 'Feed Preview', icon: Package },
          { key: 'sync' as const, label: 'Sync', icon: RefreshCw },
          { key: 'history' as const, label: 'Sync History', icon: Clock },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* PREVIEW TAB */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search products..."
                value={previewSearch}
                onChange={(e) => {
                  setPreviewSearch(e.target.value);
                  setPreviewOffset(0);
                  loadPreview(0, e.target.value);
                }}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPreview(previewOffset, previewSearch)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => setSelectAll(e.target.checked)}
                  className="rounded"
                />
                Select all new
              </label>
              {selectedHandles.size > 0 && (
                <Button
                  size="sm"
                  onClick={() => runSync('import', Array.from(selectedHandles))}
                  disabled={syncing}
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Import {selectedHandles.size} selected
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : previewData?.products ? (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 w-8"></th>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2 text-center">Variants</th>
                      <th className="px-3 py-2 text-center">Stock</th>
                      <th className="px-3 py-2 text-right">Cost</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewData.products.map((p) => (
                      <tr key={p.handle} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          {!p.alreadyImported && (
                            <input
                              type="checkbox"
                              checked={selectedHandles.has(p.handle)}
                              onChange={() => toggleHandle(p.handle)}
                              className="rounded"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {p.imageUrl && (
                              <img
                                src={p.imageUrl}
                                alt=""
                                className="h-10 w-10 rounded object-cover"
                              />
                            )}
                            <div>
                              <div className="font-medium line-clamp-1">{p.title}</div>
                              <div className="text-xs text-slate-400">{p.handle}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">{p.productType || '—'}</td>
                        <td className="px-3 py-2 text-center">
                          <Badge variant="outline">{p.variantCount}</Badge>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={
                              p.totalStock === 0
                                ? 'text-red-600'
                                : p.totalStock <= 5
                                  ? 'text-amber-600'
                                  : 'text-green-600'
                            }
                          >
                            {p.totalStock}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs">
                          {p.minCost > 0 ? formatPrice(p.minCost, 'ZAR') : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {p.alreadyImported ? (
                            <Badge className="bg-green-100 text-green-800">Imported</Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800">New</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <a
                            href={`https://www.zalemart.co.za/products/${p.handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Showing {previewOffset + 1}–{Math.min(previewOffset + 20, previewData.total)} of{' '}
                    {previewData.total}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={previewOffset === 0}
                      onClick={() => {
                        const newOffset = Math.max(0, previewOffset - 20);
                        setPreviewOffset(newOffset);
                        loadPreview(newOffset, previewSearch);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={previewOffset + 20 >= previewData.total}
                      onClick={() => {
                        const newOffset = previewOffset + 20;
                        setPreviewOffset(newOffset);
                        loadPreview(newOffset, previewSearch);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center py-12 text-slate-500">No data</p>
          )}
        </div>
      )}

      {/* SYNC TAB */}
      {activeTab === 'sync' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Sync</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Sync will update stock levels, prices, and availability for all existing Zalemart products.
                New products in the feed will NOT be created during a sync — only during an import.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => runSync('sync')} disabled={syncing} className="gap-2">
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sync Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => runSync('import')}
                  disabled={syncing}
                  className="gap-2"
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Import All New Products
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sync result */}
          {syncResult && (
            <Card
              className={
                syncResult.errors.length > 0
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-green-300 bg-green-50'
              }
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  {syncResult.errors.length > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <h3 className="font-semibold">
                      {syncResult.errors.length > 0 ? 'Sync completed with errors' : 'Sync complete'}
                    </h3>
                    <div className="text-sm space-y-0.5">
                      <p>Products found in feed: {syncResult.productsFound}</p>
                      <p>Variants total: {syncResult.variantsTotal}</p>
                      <p className="text-green-700">Created: {syncResult.productsCreated}</p>
                      <p className="text-blue-700">Updated: {syncResult.productsUpdated}</p>
                      <p className="text-amber-700">Deactivated: {syncResult.productsDeactivated}</p>
                    </div>
                    {syncResult.errors.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-y-auto rounded bg-white p-2 text-xs font-mono">
                        {syncResult.errors.map((e, i) => (
                          <div key={i} className="text-red-600">{e}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {logs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                No sync history yet.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-center">Found</th>
                    <th className="px-4 py-3 text-center">Created</th>
                    <th className="px-4 py-3 text-center">Updated</th>
                    <th className="px-4 py-3 text-center">Deactivated</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-xs">
                        {new Date(log.created_at).toLocaleString('en-ZA')}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={log.sync_type === 'import' ? 'default' : 'secondary'}>
                          {log.sync_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-center">{log.products_found}</td>
                      <td className="px-4 py-2 text-center text-green-600">{log.products_created}</td>
                      <td className="px-4 py-2 text-center text-blue-600">{log.products_updated}</td>
                      <td className="px-4 py-2 text-center text-amber-600">{log.products_deactivated}</td>
                      <td className="px-4 py-2">
                        <Badge
                          className={
                            log.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : log.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-xs text-red-600 max-w-[200px] truncate">
                        {log.error_message || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
