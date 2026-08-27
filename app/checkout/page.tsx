'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCart } from '@/hooks/use-cart';
import { formatPrice } from '@/lib/format';
import { SOUTH_AFRICAN_PROVINCES } from '@/lib/constants';
import type { CheckoutFormData } from '@/lib/types';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart, itemCount } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CheckoutFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'South Africa',
  });

  function update<K extends keyof CheckoutFormData>(key: K, value: CheckoutFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (cart.items.length === 0) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Your cart is empty</h1>
          <p className="text-slate-500">Add some products before checking out.</p>
          <Button asChild>
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!form.name || !form.email || !form.address || !form.city || !form.province || !form.postal_code) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            slug: item.slug,
            image_url: item.image_url,
            price: item.sale_price && item.sale_price < item.price ? item.sale_price : item.price,
            quantity: item.quantity,
            product_type: item.product_type,
            supplier_shipping_cost: item.supplier_shipping_cost || 0,
          })),
          customer: form,
          subtotal: cart.subtotal,
          shipping: cart.shipping,
          total: cart.total,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to process checkout.');
        setLoading(false);
        return;
      }

      // Redirect to PayFast
      if (data.payfast_url) {
        clearCart();
        window.location.href = data.payfast_url;
      } else if (data.redirect) {
        clearCart();
        router.push(data.redirect);
      }
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Checkout</h1>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Shipping Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="+27..."
                  />
                </div>
                <div>
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    required
                    placeholder="123 Main Street, Apt 4B"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => update('city', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="province">Province *</Label>
                    <Select value={form.province} onValueChange={(v) => update('province', v)}>
                      <SelectTrigger id="province">
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOUTH_AFRICAN_PROVINCES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="postal_code">Postal Code *</Label>
                    <Input
                      id="postal_code"
                      value={form.postal_code}
                      onChange={(e) => update('postal_code', e.target.value)}
                      required
                      placeholder="2000"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select value={form.country} onValueChange={(v) => update('country', v)}>
                    <SelectTrigger id="country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="South Africa">South Africa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-60 overflow-y-auto divide-y">
                  {cart.items.map((item) => {
                    const price = item.sale_price && item.sale_price < item.price ? item.sale_price : item.price;
                    return (
                      <div key={item.productId} className="flex justify-between py-2 text-sm">
                        <span className="text-slate-600 line-clamp-1">
                          {item.name} x{item.quantity}
                        </span>
                        <span className="font-medium">{formatPrice(price * item.quantity, 'ZAR')}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span>{formatPrice(cart.subtotal, 'ZAR')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Shipping</span>
                    <span>{formatPrice(cart.shipping, 'ZAR')}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total</span>
                    <span className="text-lg font-bold">{formatPrice(cart.total, 'ZAR')}</span>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Pay with PayFast
                      <ShieldCheck className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <p className="text-xs text-slate-500 text-center">
                  Secure payment powered by PayFast
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      <div className="mt-8">
        <Button asChild variant="ghost" className="gap-1">
          <Link href="/cart">
            <ArrowLeft className="h-4 w-4" />
            Back to cart
          </Link>
        </Button>
      </div>
    </div>
  );
}
