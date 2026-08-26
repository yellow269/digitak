import Link from 'next/link';
import { Package, MousePointerClick, TrendingUp, FileText, ArrowRight, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();

  const [
    productsRes,
    activeProductsRes,
    clicksRes,
    clicksTodayRes,
    clicksMonthRes,
    topProductsRes,
    recentMessagesRes,
  ] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('affiliate_clicks').select('id', { count: 'exact', head: true }),
    supabase
      .from('affiliate_clicks')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase
      .from('affiliate_clicks')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date(new Date().getFullYear(), new Date().getMonth(), 1)).toISOString()),
    supabase
      .from('affiliate_clicks')
      .select('product_id, products!inner(name, slug)')
      .limit(500),
    supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(5),
  ]);

  const clickRows = (topProductsRes.data as unknown as { product_id: string; products: { name: string; slug: string } }[]) || [];
  const productCounts: Record<string, { name: string; slug: string; count: number }> = {};
  clickRows.forEach((row) => {
    if (!row.product_id) return;
    const key = row.product_id;
    if (!productCounts[key]) {
      productCounts[key] = { name: row.products?.name || 'Unknown', slug: row.products?.slug || '', count: 0 };
    }
    productCounts[key].count++;
  });
  const topProducts = Object.values(productCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  const stats = [
    { label: 'Total Products', value: productsRes.count || 0, icon: Package, color: 'text-sky-600 bg-sky-100' },
    { label: 'Active Products', value: activeProductsRes.count || 0, icon: Eye, color: 'text-green-600 bg-green-100' },
    { label: 'Total Clicks', value: clicksRes.count || 0, icon: MousePointerClick, color: 'text-amber-600 bg-amber-100' },
    { label: 'Clicks Today', value: clicksTodayRes.count || 0, icon: TrendingUp, color: 'text-purple-600 bg-purple-100' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of your storefront</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Top Products by Clicks
              <Link href="/admin/analytics" className="text-sm font-normal text-sky-600 hover:text-sky-700">
                View analytics
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-slate-500">No clicks recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {topProducts.map((p, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                        {i + 1}
                      </span>
                      <Link href={`/products/${p.slug}`} className="font-medium text-slate-900 hover:text-sky-700">
                        {p.name}
                      </Link>
                    </span>
                    <Badge variant="secondary">{p.count} clicks</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Messages
              <Link href="/admin/messages" className="text-sm font-normal text-sky-600 hover:text-sky-700">
                View all
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!recentMessagesRes.data || recentMessagesRes.data.length === 0) ? (
              <p className="text-sm text-slate-500">No messages yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentMessagesRes.data.map((msg: { id: string; name: string; subject: string | null; message: string; created_at: string }) => (
                  <li key={msg.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{msg.name}</p>
                      <p className="truncate text-xs text-slate-500">{msg.subject || msg.message}</p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{formatDate(msg.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
          <Button asChild className="gap-1">
            <Link href="/admin/products/new">
              <Package className="h-4 w-4" />
              Add Product
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-1">
            <Link href="/admin/blog/new">
              <FileText className="h-4 w-4" />
              Write Article
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-1">
            <Link href="/admin/analytics">
              <TrendingUp className="h-4 w-4" />
              View Analytics
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
