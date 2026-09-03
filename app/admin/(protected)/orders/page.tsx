'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, Loader2, Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate } from '@/lib/format';
import { ORDER_STATUSES } from '@/lib/constants';
import type { Order, OrderItem, OrderStatus } from '@/lib/types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function fetchOrders() {
    setLoading(true);
    const supabase = createClient();
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    const { data } = await query;
    setOrders((data as Order[]) || []);
    setLoading(false);
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    setUpdating(true);
    const supabase = createClient();
    await supabase.from('orders').update({ status }).eq('id', orderId);
    setUpdating(false);
    fetchOrders();
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder!, status });
    }
  }

  async function updateTrackingNumber(orderId: string, tracking: string) {
    const supabase = createClient();
    await supabase.from('orders').update({ tracking_number: tracking }).eq('id', orderId);
    fetchOrders();
  }

  function getStatusBadge(status: OrderStatus) {
    const colors: Record<string, string> = {
      pending_payment: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-blue-100 text-blue-800',
      supplier_processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-orange-100 text-orange-800',
    };
    const label = ORDER_STATUSES.find((s) => s.value === status)?.label || status;
    return <Badge className={colors[status] || ''}>{label}</Badge>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500">Manage customer orders and fulfillment</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500">No orders found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedOrder(order)}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <Package className="h-5 w-5 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">#{order.order_number}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-sm text-slate-500 truncate">{order.customer_name} - {order.customer_email}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{formatPrice(order.total, 'ZAR')}</p>
                  <p className="text-xs text-slate-400">{formatDate(order.created_at)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Order #{selectedOrder.order_number}
                  {getStatusBadge(selectedOrder.status)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Customer Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Customer</h3>
                    <p className="font-medium">{selectedOrder.customer_name}</p>
                    <p className="text-sm text-slate-600">{selectedOrder.customer_email}</p>
                    {selectedOrder.customer_phone && (
                      <p className="text-sm text-slate-600">{selectedOrder.customer_phone}</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Shipping Address</h3>
                    <p className="text-sm">{selectedOrder.shipping_address}</p>
                    <p className="text-sm">{selectedOrder.shipping_city}, {selectedOrder.shipping_province} {selectedOrder.shipping_postal_code}</p>
                    <p className="text-sm">{selectedOrder.shipping_country}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Items</h3>
                  <OrderItemsList orderId={selectedOrder.id} />
                </div>

                {/* Financials */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm text-slate-500">Subtotal</p>
                    <p className="font-semibold">{formatPrice(selectedOrder.subtotal, 'ZAR')}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm text-slate-500">Shipping</p>
                    <p className="font-semibold">{formatPrice(selectedOrder.shipping_total, 'ZAR')}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-sm text-blue-600">Total</p>
                    <p className="font-bold text-lg">{formatPrice(selectedOrder.total, 'ZAR')}</p>
                  </div>
                </div>

                {/* Status Update */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Update Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {ORDER_STATUSES.map((s) => (
                      <Button
                        key={s.value}
                        size="sm"
                        variant={selectedOrder.status === s.value ? 'default' : 'outline'}
                        onClick={() => updateOrderStatus(selectedOrder.id, s.value as OrderStatus)}
                        disabled={updating}
                      >
                        {s.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Tracking */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Tracking Number</h3>
                  <div className="flex gap-2">
                    <Input
                      defaultValue={selectedOrder.tracking_number || ''}
                      placeholder="Enter tracking number"
                      onBlur={(e) => updateTrackingNumber(selectedOrder.id, e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderItemsList({ orderId }: { orderId: string }) {
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      setItems((data as OrderItem[]) || []);
    }
    load();
  }, [orderId]);

  if (items.length === 0) return <p className="text-sm text-slate-500">Loading items...</p>;

  return (
    <div className="divide-y rounded-lg border">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 p-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-100">
            {item.product_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                <Package className="h-5 w-5" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{item.product_name}</p>
            {item.selected_colour && (
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border border-slate-300"
                  style={{ backgroundColor: item.selected_colour.hex }}
                />
                <span className="text-xs text-slate-500">{item.selected_colour.name}</span>
              </div>
            )}
            <p className="text-xs text-slate-500">Qty: {item.quantity} x {formatPrice(item.unit_price, 'ZAR')}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{formatPrice(item.total_price, 'ZAR')}</p>
            {item.estimated_profit && (
              <p className="text-xs text-green-600">Profit: {formatPrice(item.estimated_profit, 'ZAR')}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
