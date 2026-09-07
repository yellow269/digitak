'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, Package, Truck, CheckCircle, XCircle, Clock,
  AlertTriangle, RefreshCw, Search, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate } from '@/lib/format';
import { ORDER_STATUSES } from '@/lib/constants';
import type { Order, OrderItem, OrderStatus } from '@/lib/types';

type SupplierFulfillment = {
  id: string;
  order_id: string;
  order_number: number;
  supplier_id: string;
  supplier_name: string;
  product_name: string;
  product_image: string | null;
  supplier_handle: string | null;
  supplier_sku: string | null;
  variant_sku: string | null;
  selected_options: Record<string, { name: string; hex?: string }> | null;
  quantity: number;
  supplier_cost: number | null;
  selling_price: number | null;
  customer_name: string;
  customer_email: string;
  status: string;
  supplier_order_id: string | null;
  submitted_at: string | null;
  error_message: string | null;
  error_at: string | null;
  notes: string | null;
  created_at: string;
};

const COURIERS = [
  'The Courier Guy', 'Fastway', 'DHL', 'Aramex', 'Bob Go',
  'Kerry Logistics', 'Pargo', 'Pep Store', 'Arashi Connect',
  'Internet Express', '_own courier_',
];

const STATUS_ICONS: Record<string, typeof Package> = {
  pending_payment: Clock,
  paid: CheckCircle,
  supplier_processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
  refunded: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  supplier_processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-orange-100 text-orange-800',
};

const FULFILLMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  sent_to_supplier: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
};

function getStatusBadge(status: OrderStatus | string) {
  return <Badge className={STATUS_COLORS[status] || 'bg-slate-100 text-slate-800'}>{ORDER_STATUSES.find((s) => s.value === status)?.label || status}</Badge>;
}

function getFulfillmentBadge(status: string) {
  return <Badge className={FULFILLMENT_STATUS_COLORS[status] || 'bg-slate-100 text-slate-800'}>{status.replace(/_/g, ' ')}</Badge>;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [fulfillments, setFulfillments] = useState<SupplierFulfillment[]>([]);
  const [loadingFulfillments, setLoadingFulfillments] = useState(false);
  const [retryingFulfillment, setRetryingFulfillment] = useState(false);

  // Tracking state
  const [trackingCourier, setTrackingCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [customCourier, setCustomCourier] = useState('');
  const [savingTracking, setSavingTracking] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedOrder) {
      setTrackingCourier(selectedOrder.courier_name || '');
      setTrackingNumber(selectedOrder.tracking_number || '');
      setTrackingUrl(selectedOrder.tracking_url || '');
      setCustomCourier('');
      loadFulfillments(selectedOrder.id);
    }
  }, [selectedOrder]);

  async function fetchOrders() {
    setLoading(true);
    const supabase = createClient();
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    const { data } = await query;
    let filtered = (data as Order[]) || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_email?.toLowerCase().includes(q) ||
          String(o.order_number).includes(q)
      );
    }
    setOrders(filtered);
    setLoading(false);
  }

  async function loadFulfillments(orderId: string) {
    setLoadingFulfillments(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('supplier_fulfillments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at');
    setFulfillments((data as SupplierFulfillment[]) || []);
    setLoadingFulfillments(false);
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

  async function retryFulfillment() {
    if (!selectedOrder) return;
    setRetryingFulfillment(true);
    try {
      const res = await fetch('/api/admin/orders/retry-fulfillment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: selectedOrder.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Retry failed');
      // Refresh order and fulfillments
      const supabase = createClient();
      const { data: updatedOrder } = await supabase.from('orders').select('*').eq('id', selectedOrder.id).single();
      if (updatedOrder) setSelectedOrder(updatedOrder as Order);
      loadFulfillments(selectedOrder.id);
      fetchOrders();
    } catch (err) {
      console.error('Retry failed:', err);
    }
    setRetryingFulfillment(false);
  }

  async function saveTrackingInfo() {
    if (!selectedOrder) return;
    setSavingTracking(true);
    const supabase = createClient();
    const courier = trackingCourier === '_own courier_' ? customCourier : trackingCourier;
    await supabase.from('orders').update({
      courier_name: courier || null,
      tracking_number: trackingNumber || null,
      tracking_url: trackingUrl || null,
    }).eq('id', selectedOrder.id);
    setSelectedOrder({
      ...selectedOrder,
      courier_name: courier || null,
      tracking_number: trackingNumber || null,
      tracking_url: trackingUrl || null,
    });
    setSavingTracking(false);
  }

  const filteredOrders = orders;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500">{filteredOrders.length} orders</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
              className="w-56 rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none"
            />
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
          {filteredOrders.map((order) => {
            const StatusIcon = STATUS_ICONS[order.status] || Package;
            const hasError = !!order.fulfillment_error;
            return (
              <Card
                key={order.id}
                className={`cursor-pointer transition-shadow hover:shadow-md ${hasError ? 'border-red-200 bg-red-50/30' : ''}`}
                onClick={() => setSelectedOrder(order)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${hasError ? 'bg-red-100' : 'bg-slate-100'}`}>
                    {hasError
                      ? <AlertTriangle className="h-5 w-5 text-red-600" />
                      : <StatusIcon className={`h-5 w-5 ${order.status === 'delivered' ? 'text-green-600' : 'text-slate-600'}`} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900">#{order.order_number}</span>
                      {getStatusBadge(order.status)}
                      {order.payment_status === 'paid' && order.status !== 'paid' && (
                        <Badge className="bg-green-100 text-green-800">Paid</Badge>
                      )}
                      {order.tracking_number && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Truck className="h-3 w-3" /> Tracked
                        </Badge>
                      )}
                      {hasError && (
                        <Badge className="bg-red-100 text-red-800 gap-1">
                          <AlertTriangle className="h-3 w-3" /> Needs Attention
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                      {order.customer_name} — {order.customer_email}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-slate-900">{formatPrice(order.total, 'ZAR')}</p>
                    <p className="text-xs text-slate-400">{formatDate(order.created_at)}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
                  {selectedOrder.payment_status === 'paid' && (
                    <Badge className="bg-green-100 text-green-800">Paid</Badge>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Fulfillment Error Banner */}
                {selectedOrder.fulfillment_error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">Fulfillment Attention Required</p>
                        <p className="mt-1 text-sm text-red-700">{selectedOrder.fulfillment_error}</p>
                        {selectedOrder.fulfillment_error_at && (
                          <p className="mt-1 text-xs text-red-500">{formatDate(selectedOrder.fulfillment_error_at)}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1 border-red-300 text-red-700 hover:bg-red-100"
                        disabled={retryingFulfillment}
                        onClick={(e) => { e.stopPropagation(); retryFulfillment(); }}
                      >
                        {retryingFulfillment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Retry Fulfillment
                      </Button>
                    </div>
                  </div>
                )}

                {/* Status Flow */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Status Flow</h3>
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

                {/* Customer & Shipping */}
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
                <div className="grid gap-4 sm:grid-cols-4">
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
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm text-slate-500">Payment</p>
                    <p className="text-sm font-medium">{selectedOrder.payment_status === 'paid' ? '✓ Paid' : selectedOrder.payment_status}</p>
                    {selectedOrder.paid_at && (
                      <p className="text-xs text-slate-400">{formatDate(selectedOrder.paid_at)}</p>
                    )}
                  </div>
                </div>

                {/* Supplier Fulfillment */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Supplier Fulfillment</h3>
                  {loadingFulfillments ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                    </div>
                  ) : fulfillments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center">
                      <p className="text-sm text-slate-500">No fulfillment records yet.</p>
                      {(selectedOrder.status === 'paid' || selectedOrder.status === 'supplier_processing') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 gap-1"
                          disabled={retryingFulfillment}
                          onClick={(e) => { e.stopPropagation(); retryFulfillment(); }}
                        >
                          {retryingFulfillment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          Create Fulfillment
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {fulfillments.map((f) => (
                        <div key={f.id} className="rounded-lg border bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900">{f.supplier_name}</span>
                                {getFulfillmentBadge(f.status)}
                              </div>
                              <p className="mt-1 text-sm text-slate-600">{f.product_name}</p>
                              {f.variant_sku && <p className="text-xs text-slate-400">SKU: {f.variant_sku}</p>}
                              {f.selected_options && (
                                <p className="text-xs text-slate-400">
                                  {Object.entries(f.selected_options).map(([type, val]) => `${type}: ${val.name}`).join(' · ')}
                                </p>
                              )}
                              <div className="mt-2 flex gap-4 text-xs text-slate-500">
                                <span>Cost: {formatPrice(f.supplier_cost, 'ZAR')}</span>
                                <span>Selling: {formatPrice(f.selling_price, 'ZAR')}</span>
                                <span>Qty: {f.quantity}</span>
                              </div>
                            </div>
                          </div>
                          {f.error_message && (
                            <div className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">
                              {f.error_message}
                            </div>
                          )}
                          {f.supplier_order_id && (
                            <p className="mt-2 text-xs text-slate-400">Supplier Order ID: {f.supplier_order_id}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tracking & Shipping */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
                  <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Shipping & Tracking
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Courier</Label>
                      <Select value={trackingCourier} onValueChange={setTrackingCourier}>
                        <SelectTrigger><SelectValue placeholder="Select courier" /></SelectTrigger>
                        <SelectContent>
                          {COURIERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {trackingCourier === '_own courier_' && (
                      <div>
                        <Label>Courier Name</Label>
                        <Input value={customCourier} onChange={(e) => setCustomCourier(e.target.value)} placeholder="Enter courier name" />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Tracking Number</Label>
                    <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Enter tracking number" />
                  </div>
                  <div>
                    <Label>Tracking URL</Label>
                    <Input type="url" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://..." />
                  </div>
                  <Button size="sm" onClick={saveTrackingInfo} disabled={savingTracking} className="gap-1">
                    {savingTracking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save Tracking Info
                  </Button>
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
      const { data } = await supabase.from('order_items').select('*').eq('order_id', orderId);
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
            {item.selected_options && (
              <p className="text-xs text-slate-500 mt-0.5">
                {Object.entries(item.selected_options).map(([type, val]) => `${type}: ${val.name}`).join(', ')}
              </p>
            )}
            {item.variant_sku && (
              <p className="text-xs text-slate-400">SKU: {item.variant_sku}</p>
            )}
            <p className="text-xs text-slate-500">Qty: {item.quantity} × {formatPrice(item.unit_price, 'ZAR')}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{formatPrice(item.total_price, 'ZAR')}</p>
            {item.supplier_cost != null && (
              <p className="text-xs text-slate-400">Cost: {formatPrice(item.supplier_cost, 'ZAR')}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
