import Link from 'next/link';
import { Package, MousePointerClick, TrendingUp, FileText, ArrowRight, Eye, ShoppingCart, DollarSign, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatDate, formatPrice } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();

  const [
    productsRes,
    activeProductsRes,
    clicksRes,
    ordersRes,
    paidOrdersRes,
    revenueRes,
    recentMessagesRes,
  ] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('affiliate_clicks').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('*').eq('payment_status', 'paid').order('created_at', { ascending: false }).limit(5),
    supabase.from('orders').select('total, payment_fee').eq('payment_status', 'paid'),
    supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(5),
  ]);

  const totalRevenue = (revenueRes.data || []).reduce((sum: number, o: any) => sum + (o.total || 0), 0);
  const totalFees = (revenueRes.data || []).reduce((sum: number, o: any) => sum + (o.payment_fee || 0), 0);

  const stats = [
    { label: 'Total Products', value: productsRes.count || 0, icon: Package, color: 'text-sky-600 bg-sky-100' },
    { label: 'Published', value: activeProductsRes.count || 0, icon: Eye, color: 'text-green-600 bg-green-100' },
    { label: 'Total Orders', value: ordersRes.count || 0, icon: ShoppingCart, color: 'text-purple-600 bg-purple-100' },
    { label: 'Revenue', value: formatPrice(totalRevenue, 'ZAR'), icon: DollarSign, color: 'text-amber-600 bg-amber-100' },
    { label: 'Affiliate Clicks', value: clicksRes.count || 0, icon: MousePointerClick, color: 'text-blue-600 bg-blue-100' },
    { label: 'Payment Fees', value: formatPrice(totalFees, 'ZAR'), icon: TrendingUp, color: 'text-red-600 bg-red-100' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of your Everything Store</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        {/* Recent Paid Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Orders
              <Link href="/admin/orders" className="text-sm font-normal text-sky-600 hover:text-sky-700">
                View all
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!paidOrdersRes.data || paidOrdersRes.data.length === 0) ? (
              <p className="text-sm text-slate-500">No paid orders yet.</p>
            ) : (
              <ul className="space-y-3">
                {paidOrdersRes.data.map((order: any) => (
                  <li key={order.id} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-900">#{order.order_number}</span>
                      <span className="ml-2 text-sm text-slate-500">{order.customer_name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatPrice(order.total, 'ZAR')}</p>
                      <p className="text-xs text-slate-400">{formatDate(order.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Messages */}
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
              <Link href="/admin/suppliers">
                <Truck className="h-4 w-4" />
                Manage Suppliers
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-1">
              <Link href="/admin/orders">
                <ShoppingCart className="h-4 w-4" />
                View Orders
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-1">
              <Link href="/admin/profit">
                <DollarSign className="h-4 w-4" />
                Profit Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-1">
              <Link href="/admin/marketplace">
                <Package className="h-4 w-4" />
                Supplier Marketplace
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
