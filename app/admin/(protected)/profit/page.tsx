'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Package, Truck, CreditCard, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate } from '@/lib/format';
import type { Order } from '@/lib/types';

type ProfitData = {
  total_sales: number;
  product_costs: number;
  shipping_costs: number;
  payment_fees: number;
  estimated_profit: number;
  profit_margin: number;
  order_count: number;
};

export default function ProfitPage() {
  const [data, setData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchProfitData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function fetchProfitData() {
    setLoading(true);
    const supabase = createClient();

    let dateFilter = '';
    const now = new Date();
    if (period === 'today') {
      dateFilter = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    } else if (period === '7days') {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (period === '30days') {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (period === 'month') {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    // Fetch paid orders
    let ordersQuery = supabase
      .from('orders')
      .select('*')
      .eq('payment_status', 'paid');

    if (dateFilter) {
      ordersQuery = ordersQuery.gte('created_at', dateFilter);
    }

    const { data: orders } = await ordersQuery;

    // Fetch order items for profit calculation
    const orderIds = (orders || []).map((o: Order) => o.id);
    
    let itemsQuery = supabase
      .from('order_items')
      .select('*');

    if (orderIds.length > 0) {
      itemsQuery = itemsQuery.in('order_id', orderIds);
    } else {
      // No orders = no items
      itemsQuery = itemsQuery.eq('order_id', '00000000-0000-0000-0000-000000000000');
    }

    const { data: items } = await itemsQuery;

    const totalSales = (orders || []).reduce((sum: number, o: Order) => sum + (o.total || 0), 0);
    const productCosts = (items || []).reduce((sum: number, i: any) => sum + (i.supplier_cost || 0) * i.quantity, 0);
    const shippingCosts = (items || []).reduce((sum: number, i: any) => sum + (i.supplier_shipping_cost || 0) * i.quantity, 0);
    const paymentFees = (orders || []).reduce((sum: number, o: Order) => sum + (o.payment_fee || 0), 0);
    const estimatedProfit = (items || []).reduce((sum: number, i: any) => sum + (i.estimated_profit || 0) * i.quantity, 0);
    const profitMargin = totalSales > 0 ? (estimatedProfit / totalSales) * 100 : 0;

    setData({
      total_sales: totalSales,
      product_costs: productCosts,
      shipping_costs: shippingCosts,
      payment_fees: paymentFees,
      estimated_profit: estimatedProfit,
      profit_margin: profitMargin,
      order_count: (orders || []).length,
    });

    setRecentOrders((orders || []).slice(0, 10));
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profit Dashboard</h1>
          <p className="text-sm text-slate-500">Track your sales, costs and profits</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{formatPrice(data.total_sales, 'ZAR')}</p>
                    <p className="text-sm text-slate-500">Total Sales</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{formatPrice(data.product_costs, 'ZAR')}</p>
                    <p className="text-sm text-slate-500">Product Costs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{formatPrice(data.shipping_costs, 'ZAR')}</p>
                    <p className="text-sm text-slate-500">Shipping Costs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{formatPrice(data.payment_fees, 'ZAR')}</p>
                    <p className="text-sm text-slate-500">Payment Fees</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-green-500 text-white">
                    <TrendingUp className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-900">{formatPrice(data.estimated_profit, 'ZAR')}</p>
                    <p className="text-sm text-green-700">Estimated Profit ({data.profit_margin.toFixed(1)}% margin)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Orders</span>
                    <span className="font-semibold">{data.order_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Avg Order Value</span>
                    <span className="font-semibold">{formatPrice(data.order_count > 0 ? data.total_sales / data.order_count : 0, 'ZAR')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Cost Ratio</span>
                    <span className="font-semibold">{data.total_sales > 0 ? ((data.product_costs + data.shipping_costs + data.payment_fees) / data.total_sales * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          {recentOrders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Paid Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-3">
                      <div>
                        <span className="font-medium text-slate-900">#{order.order_number}</span>
                        <span className="ml-2 text-sm text-slate-500">{order.customer_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatPrice(order.total, 'ZAR')}</p>
                        <p className="text-xs text-slate-400">{formatDate(order.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
