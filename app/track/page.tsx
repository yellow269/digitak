'use client';

import { useState } from 'react';
import { Package, Search, Truck, ExternalLink, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate } from '@/lib/format';
import type { Order, OrderItem } from '@/lib/types';
import type { OrderStatus } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  supplier_processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export default function TrackOrderPage() {
  const [email, setEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setOrders([]);

    if (!email.trim() && !orderNumber.trim()) {
      setError('Please enter your email address or order number.');
      return;
    }

    setLoading(true);
    setSearched(true);
    const supabase = createClient();

    let query = supabase.from('orders').select('*');

    if (orderNumber.trim()) {
      query = query.eq('order_number', parseInt(orderNumber.trim(), 10));
    } else {
      query = query.ilike('customer_email', email.trim());
    }

    const { data, error: queryErr } = await query.order('created_at', { ascending: false });

    if (queryErr) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    setOrders((data as Order[]) || []);
    setLoading(false);
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900">Track Your Order</h1>
        <p className="mt-2 text-slate-500">Enter your email or order number to view order status and tracking details.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <Label htmlFor="order_number">Or Order Number</Label>
                <Input
                  id="order_number"
                  type="number"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g. 123"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full gap-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Find Order
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {searched && !loading && (
        <div className="mt-6 space-y-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-500">No orders found. Please check your details and try again.</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <OrderTrackingCard key={order.id} order={order} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function OrderTrackingCard({ order }: { order: Order }) {
  const hasTracking = !!order.tracking_number;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Order #{order.order_number}</span>
          <Badge className={
            order.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' :
            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
            order.status === 'paid' ? 'bg-blue-100 text-blue-800' :
            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-slate-100 text-slate-800'
          }>
            {STATUS_LABELS[order.status] || order.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order summary */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500">Date</p>
            <p className="font-medium">{formatDate(order.created_at)}</p>
          </div>
          <div>
            <p className="text-slate-500">Total</p>
            <p className="font-medium">{formatPrice(order.total, 'ZAR')}</p>
          </div>
        </div>

        {/* Tracking info */}
        {hasTracking ? (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-indigo-800">
              <Truck className="h-4 w-4" />
              Shipping Details
            </div>
            {order.courier_name && (
              <div className="text-sm">
                <span className="text-indigo-600">Courier:</span>{' '}
                <span className="font-medium">{order.courier_name}</span>
              </div>
            )}
            <div className="text-sm">
              <span className="text-indigo-600">Tracking Number:</span>{' '}
              <span className="font-mono font-medium">{order.tracking_number}</span>
            </div>
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900 underline"
              >
                Track Order
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock className="h-4 w-4" />
              Tracking information will be available once your order ships.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
