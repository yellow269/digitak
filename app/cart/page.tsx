'use client';

import Link from 'next/link';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCart } from '@/hooks/use-cart';
import { formatPrice } from '@/lib/format';

export default function CartPage() {
  const { cart, removeItem, updateQuantity, itemCount } = useCart();

  if (cart.items.length === 0) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <ShoppingBag className="h-20 w-20 text-slate-300" />
          <h1 className="text-2xl font-bold text-slate-900">Your cart is empty</h1>
          <p className="text-slate-500">Looks like you haven&apos;t added anything yet.</p>
          <Button asChild size="lg">
            <Link href="/products">Start Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Shopping Cart ({itemCount} items)</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => {
            const price = item.sale_price && item.sale_price < item.price ? item.sale_price : item.price;
            const lineTotal = price * item.quantity;

            return (
              <Card key={item.productId}>
                <CardContent className="flex gap-4 p-4">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-slate-100">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400">
                        <ShoppingBag className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          href={`/products/${item.slug}`}
                          className="font-semibold text-slate-900 hover:text-sky-700"
                        >
                          {item.name}
                        </Link>
                        {item.shipping_estimate && (
                          <p className="text-xs text-slate-500 mt-0.5">{item.shipping_estimate}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.productId)}
                        className="text-slate-400 hover:text-red-500 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="rounded-md border p-1.5 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="rounded-md border p-1.5 hover:bg-slate-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="font-semibold text-slate-900">{formatPrice(lineTotal, 'ZAR')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal ({itemCount} items)</span>
                <span className="font-medium">{formatPrice(cart.subtotal, 'ZAR')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Shipping</span>
                <span className="font-medium">{formatPrice(cart.shipping, 'ZAR')}</span>
              </div>
              <div className="flex justify-between border-t pt-4">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="text-xl font-bold">{formatPrice(cart.total, 'ZAR')}</span>
              </div>
              <Button asChild className="w-full" size="lg">
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/products" className="gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Continue Shopping
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
