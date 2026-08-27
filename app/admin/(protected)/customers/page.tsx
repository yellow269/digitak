'use client';

import { useState, useEffect } from 'react';
import { Users, Loader2, Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate } from '@/lib/format';
import type { Order } from '@/lib/types';

type Customer = {
  name: string;
  email: string;
  phone: string | null;
  city: string;
  province: string;
  order_count: number;
  total_spent: number;
  last_order: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    const supabase = createClient();
    const { data: orders } = await supabase
      .from('orders')
      .select('customer_name, customer_email, customer_phone, shipping_city, shipping_province, total, created_at')
      .order('created_at', { ascending: false });

    if (!orders) { setLoading(false); return; }

    const customerMap = new Map<string, Customer>();
    (orders as any[]).forEach((order) => {
      const key = order.customer_email;
      if (customerMap.has(key)) {
        const existing = customerMap.get(key)!;
        existing.order_count++;
        existing.total_spent += order.total || 0;
        if (order.created_at > existing.last_order) {
          existing.last_order = order.created_at;
        }
      } else {
        customerMap.set(key, {
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone,
          city: order.shipping_city,
          province: order.shipping_province,
          order_count: 1,
          total_spent: order.total || 0,
          last_order: order.created_at,
        });
      }
    });

    setCustomers(Array.from(customerMap.values()).sort((a, b) => b.total_spent - a.total_spent));
    setLoading(false);
  }

  const filtered = search
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.city.toLowerCase().includes(search.toLowerCase())
      )
    : customers;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">{customers.length} unique customers</p>
        </div>
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500">{search ? 'No customers match your search.' : 'No customers yet.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((customer) => (
            <Card key={customer.email}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{customer.name}</span>
                    <Badge variant="secondary">{customer.order_count} orders</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {customer.email}</span>
                    {customer.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {customer.phone}</span>}
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {customer.city}, {customer.province}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{formatPrice(customer.total_spent, 'ZAR')}</p>
                  <p className="text-xs text-slate-400">Last: {formatDate(customer.last_order)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
