import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  const supabase = await createServerSupabaseClient();

  const [
    totalClicksRes,
    clicksTodayRes,
    clicksMonthRes,
    recentClicksRes,
    topProductsRes,
  ] = await Promise.all([
    supabase.from('affiliate_clicks').select('id', { count: 'exact', head: true }),
    supabase.from('affiliate_clicks').select('id', { count: 'exact', head: true }).gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase.from('affiliate_clicks').select('id', { count: 'exact', head: true }).gte('created_at', new Date(new Date(new Date().getFullYear(), new Date().getMonth(), 1)).toISOString()),
    supabase.from('affiliate_clicks').select('created_at, device_type, referrer').order('created_at', { ascending: false }).limit(20),
    supabase.from('affiliate_clicks').select('product_id, products!inner(name, slug)').limit(1000),
  ]);

  // Check for errors
  const errors = [totalClicksRes, clicksTodayRes, clicksMonthRes, recentClicksRes, topProductsRes]
    .filter(r => r.error)
    .map(r => r.error!.message);
  if (errors.length > 0) {
    console.error('[AdminAnalytics] Query errors:', errors);
  }

  // Clicks by day (last 14 days)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const { data: dailyData, error: dailyError } = await supabase
    .from('affiliate_clicks')
    .select('created_at')
    .gte('created_at', fourteenDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  if (dailyError) {
    console.error('[AdminAnalytics] Daily data error:', dailyError.message);
  }

  const byDay: Record<string, number> = {};
  (dailyData || []).forEach((row: { created_at: string }) => {
    const d = new Date(row.created_at);
    const key = d.toISOString().slice(0, 10);
    byDay[key] = (byDay[key] || 0) + 1;
  });
  const dayLabels = Object.entries(byDay).map(([date, count]) => ({ date, count }));

  // Top products
  const clickRows = (topProductsRes.data as unknown as { product_id: string; products: { name: string; slug: string } }[]) || [];
  const productCounts: Record<string, { name: string; slug: string; count: number }> = {};
  clickRows.forEach((row) => {
    if (!row.product_id) return;
    const key = row.product_id;
    if (!productCounts[key]) productCounts[key] = { name: row.products?.name || 'Unknown', slug: row.products?.slug || '', count: 0 };
    productCounts[key].count++;
  });
  const topProducts = Object.values(productCounts).sort((a, b) => b.count - a.count).slice(0, 10);

  // Device breakdown
  const deviceCounts: Record<string, number> = {};
  (recentClicksRes.data || []).forEach((row: { device_type: string | null }) => {
    const d = row.device_type || 'unknown';
    deviceCounts[d] = (deviceCounts[d] || 0) + 1;
  });

  const maxDay = Math.max(...dayLabels.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">Affiliate click tracking and traffic insights</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5">
          <p className="text-3xl font-bold text-slate-900">{totalClicksRes.count || 0}</p>
          <p className="text-sm text-slate-500">Total Clicks</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-3xl font-bold text-slate-900">{clicksTodayRes.count || 0}</p>
          <p className="text-sm text-slate-500">Clicks Today</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-3xl font-bold text-slate-900">{clicksMonthRes.count || 0}</p>
          <p className="text-sm text-slate-500">Clicks This Month</p>
        </CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Clicks by day chart */}
        <Card>
          <CardHeader><CardTitle>Clicks (Last 14 Days)</CardTitle></CardHeader>
          <CardContent>
            {dayLabels.length === 0 ? (
              <p className="text-sm text-slate-500">No clicks in this period.</p>
            ) : (
              <div className="space-y-2">
                {dayLabels.map((d) => (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs text-slate-500">{formatDate(d.date)}</span>
                    <div className="h-6 flex-1 overflow-hidden rounded bg-slate-100">
                      <div
                        className="h-full rounded bg-sky-500 transition-all"
                        style={{ width: `${(d.count / maxDay) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-medium text-slate-700">{d.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device breakdown */}
        <Card>
          <CardHeader><CardTitle>Device Breakdown (Recent 20)</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(deviceCounts).length === 0 ? (
              <p className="text-sm text-slate-500">No data yet.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(deviceCounts).map(([device, count]) => (
                  <div key={device} className="flex items-center justify-between">
                    <span className="text-sm capitalize text-slate-700">{device}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top products */}
      <Card>
        <CardHeader><CardTitle>Top Products by Clicks</CardTitle></CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-500">No clicks recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {topProducts.map((p, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">{i + 1}</span>
                    <span className="font-medium text-slate-900">{p.name}</span>
                  </span>
                  <Badge variant="secondary">{p.count} clicks</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Recent clicks */}
      <Card>
        <CardHeader><CardTitle>Recent Clicks</CardTitle></CardHeader>
        <CardContent>
          {(!recentClicksRes.data || recentClicksRes.data.length === 0) ? (
            <p className="text-sm text-slate-500">No clicks yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Time</th>
                    <th className="px-2 py-2">Device</th>
                    <th className="px-2 py-2">Referrer</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentClicksRes.data.map((click: { created_at: string; device_type: string | null; referrer: string | null }, idx: number) => (
                    <tr key={idx}>
                      <td className="px-2 py-2 text-slate-500">{formatDate(click.created_at)}</td>
                      <td className="px-2 py-3 capitalize text-slate-600">{click.device_type || '—'}</td>
                      <td className="px-2 py-2 truncate text-slate-500 max-w-xs">{click.referrer || 'Direct'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400">
        Note: DigitalVault SA does not display affiliate revenue. Revenue data would require an official API integration with the affiliate network.
      </p>
    </div>
  );
}
