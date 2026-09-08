'use client';

import { useState, useEffect } from 'react';
import { Package, Search, Truck, ExternalLink, Loader2, Clock, CheckCircle, MessageCircle, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate } from '@/lib/format';
import { WHATSAPP_NUMBER } from '@/lib/constants';
import type { Order, OrderItem, Shipment, ShipmentItem } from '@/lib/types';

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  supplier_processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const SHIPMENT_FLOW = [
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

function getShipmentFlowIndex(status: string): number {
  const idx = SHIPMENT_FLOW.findIndex((s) => s.key === status);
  if (idx >= 0) return idx;
  if (status === 'pending') return -1;
  return -1;
}

type ShipmentWithItems = Shipment & {
  shipment_items?: (ShipmentItem & { order_item?: OrderItem })[];
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
  const [shipments, setShipments] = useState<ShipmentWithItems[]>([]);
  const [loadingShipments, setLoadingShipments] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('shipments')
        .select('*, shipment_items(*, order_item:order_items(*))')
        .eq('order_id', order.id)
        .order('created_at');
      setShipments((data as ShipmentWithItems[]) || []);
      setLoadingShipments(false);
    }
    load();
  }, [order.id]);

  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';
  const hasShipments = shipments.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Order #{order.order_number}</span>
          <Badge className={
            order.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' :
            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
            order.status === 'paid' ? 'bg-blue-100 text-blue-800' :
            order.status === 'supplier_processing' ? 'bg-purple-100 text-purple-800' :
            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            order.status === 'refunded' ? 'bg-orange-100 text-orange-800' :
            'bg-slate-100 text-slate-800'
          }>
            {ORDER_STATUS_LABELS[order.status] || order.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cancelled/Refunded notice */}
        {isCancelled && (
          <div className={`rounded-lg border p-4 text-sm ${
            order.status === 'cancelled' ? 'border-red-200 bg-red-50 text-red-700' : 'border-orange-200 bg-orange-50 text-orange-700'
          }`}>
            This order has been {order.status === 'cancelled' ? 'cancelled' : 'refunded'}.
          </div>
        )}

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

        {/* Shipping info */}
        <div className="text-sm">
          <p className="text-slate-500">Shipping to</p>
          <p className="font-medium">{order.customer_name}</p>
          <p className="text-slate-600">{order.shipping_address}</p>
          <p className="text-slate-600">{order.shipping_city}, {order.shipping_province} {order.shipping_postal_code}</p>
        </div>

        {/* Shipments */}
        {loadingShipments ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading shipment details...
          </div>
        ) : hasShipments ? (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Box className="h-4 w-4" /> Shipments ({shipments.length})
            </h3>
            {shipments.map((shipment, idx) => (
              <ShipmentTrackingCard
                key={shipment.id}
                shipment={shipment}
                index={idx + 1}
                orderNumber={order.order_number}
              />
            ))}
          </div>
        ) : (
          /* Fallback: show old-style tracking from order-level fields */
          <OrderLevelTracking order={order} />
        )}

        {/* WhatsApp support */}
        {WHATSAPP_NUMBER && (
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Everything Store, I need help with order #${order.order_number}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#25D366] bg-[#25D366]/5 px-4 py-2.5 text-sm font-medium text-[#25D366] transition-colors hover:bg-[#25D366]/10"
          >
            <MessageCircle className="h-4 w-4" />
            Need help? Chat on WhatsApp
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function ShipmentTrackingCard({
  shipment,
  index,
  orderNumber,
}: {
  shipment: ShipmentWithItems;
  index: number;
  orderNumber: number;
}) {
  const items = shipment.shipment_items || [];
  const flowIdx = getShipmentFlowIndex(shipment.status);
  const hasTracking = !!shipment.tracking_number;
  const isCancelled = shipment.status === 'cancelled';

  return (
    <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box className="h-4 w-4 text-slate-500" />
          <span className="font-medium text-slate-900">Shipment #{index}</span>
          {shipment.supplier_name && (
            <span className="text-sm text-slate-500">· {shipment.supplier_name}</span>
          )}
        </div>
        <Badge className={
          shipment.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' :
          shipment.status === 'delivered' ? 'bg-green-100 text-green-800' :
          shipment.status === 'processing' ? 'bg-purple-100 text-purple-800' :
          shipment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
          'bg-slate-100 text-slate-800'
        }>
          {SHIPMENT_STATUS_LABELS[shipment.status] || shipment.status}
        </Badge>
      </div>

      {/* Items */}
      {items.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">Products:</p>
          {items.map((si) => {
            const item = si.order_item;
            if (!item) return null;
            return (
              <div key={si.id} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="truncate">{item.product_name}</span>
                {item.selected_options && (
                  <span className="text-xs text-slate-400">
                    ({Object.values(item.selected_options).map((v) => v.name).join(', ')})
                  </span>
                )}
                <span className="text-xs text-slate-400">× {si.quantity}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress tracker */}
      {!isCancelled && (
        <div className="px-1">
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-200" />
            <div
              className="absolute left-0 top-4 h-0.5 bg-green-500 transition-all"
              style={{ width: flowIdx >= 0 ? `${(flowIdx / (SHIPMENT_FLOW.length - 1)) * 100}%` : '0%' }}
            />
            {SHIPMENT_FLOW.map((step, i) => {
              const isReached = i <= flowIdx;
              const isCurrent = i === flowIdx;
              const Icon = step.icon;
              return (
                <div key={step.key} className="relative flex flex-col items-center z-10">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                    isReached
                      ? isCurrent
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-green-500 bg-green-50 text-green-600'
                      : 'border-slate-300 bg-white text-slate-400'
                  }`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className={`mt-1.5 text-xs text-center max-w-[60px] ${
                    isReached ? 'font-medium text-slate-900' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tracking info */}
      {hasTracking ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-800">
            <Truck className="h-4 w-4" />
            Shipping Details
          </div>
          {shipment.courier && (
            <div className="text-sm">
              <span className="text-indigo-600">Courier:</span>{' '}
              <span className="font-medium">{shipment.courier}</span>
            </div>
          )}
          <div className="text-sm">
            <span className="text-indigo-600">Tracking Number:</span>{' '}
            <span className="font-mono font-medium">{shipment.tracking_number}</span>
          </div>
          {shipment.tracking_url && (
            <a
              href={shipment.tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900 underline"
            >
              Track Shipment
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" />
            Tracking information will be available once this shipment ships.
          </div>
        </div>
      )}

      {/* WhatsApp for this shipment */}
      {WHATSAPP_NUMBER && (
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Everything Store, I need help with order #${orderNumber}, shipment #${index}.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#25D366]/30 bg-[#25D366]/5 px-3 py-2 text-xs font-medium text-[#25D366] transition-colors hover:bg-[#25D366]/10"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Need help with this shipment? Chat on WhatsApp
        </a>
      )}
    </div>
  );
}

function OrderLevelTracking({ order }: { order: Order }) {
  const hasTracking = !!order.tracking_number;

  return hasTracking ? (
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
  );
}
