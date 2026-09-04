import Link from 'next/link';
import { Plus, Pencil, ExternalLink, Upload, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatPrice, formatDate } from '@/lib/format';
import type { Product } from '@/lib/types';

export const dynamic = 'force-dynamic';

const TYPE_BADGES: Record<string, string> = {
  affiliate: 'bg-blue-100 text-blue-800',
  dropshipping: 'bg-green-100 text-green-800',
  digital: 'bg-purple-100 text-purple-800',
  manual: 'bg-orange-100 text-orange-800',
};

export default async function AdminProductsPage() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[AdminProducts] Fetch error:', error.message);
  }

  const products = (data as unknown as Product[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">{products.length} total products</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-1">
            <Link href="/admin/products/import">
              <Upload className="h-4 w-4" />
              Import Product
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-1">
            <Link href="/admin/zalemart">
              <RefreshCw className="h-4 w-4" />
              Zalemart Sync
            </Link>
          </Button>
          <Button asChild className="gap-1">
            <Link href="/admin/products/new">
              <Plus className="h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-slate-500">No products yet.</p>
            <Button asChild className="mt-4">
              <Link href="/admin/products/new">Add your first product</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.featured && <Badge className="bg-amber-500 hover:bg-amber-500">Featured</Badge>}
                      <span className="font-medium text-slate-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={TYPE_BADGES[p.product_type || 'affiliate'] || ''}>
                      {p.product_type || 'affiliate'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.category?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{formatPrice(p.selling_price || p.price, p.currency)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.status === 'published' ? 'default' : 'secondary'}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/products/${p.slug}`} target="_blank">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/admin/products/${p.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
