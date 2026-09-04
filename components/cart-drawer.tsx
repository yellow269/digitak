'use client';

import Link from 'next/link';
import { ShoppingCart, X, Plus, Minus, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { useCart, cartItemKey, formatOptionsLabel } from '@/hooks/use-cart';
import { formatPrice } from '@/lib/format';
import { useState } from 'react';

export function CartDrawer() {
  const { cart, removeItem, updateQuantity, itemCount } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="h-4 w-4" />
          {itemCount > 0 && (
            <Badge className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
              {itemCount}
            </Badge>
          )}
          <span className="sr-only">Shopping cart</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetTitle className="text-lg font-semibold">Shopping Cart ({itemCount})</SheetTitle>
        
        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <ShoppingBag className="h-16 w-16 text-slate-300" />
            <div>
              <p className="text-lg font-medium text-slate-900">Your cart is empty</p>
              <p className="text-sm text-slate-500">Add some products to get started</p>
            </div>
            <Button asChild onClick={() => setOpen(false)}>
              <Link href="/products">Browse Products</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y">
                {cart.items.map((item) => {
                  const price = item.sale_price && item.sale_price < item.price ? item.sale_price : item.price;
                  return (
                    <div key={cartItemKey(item)} className="flex gap-4 py-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <ShoppingBag className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col">
                        <Link
                          href={`/products/${item.slug}`}
                          onClick={() => setOpen(false)}
                          className="text-sm font-medium text-slate-900 hover:text-sky-700 line-clamp-1"
                        >
                          {item.name}
                        </Link>
                        <p className="text-sm text-slate-500">{formatPrice(price, 'ZAR')}</p>
                        {formatOptionsLabel(item.selected_options) && (
                          <p className="text-xs text-slate-400">{formatOptionsLabel(item.selected_options)}</p>
                        )}
                        <div className="mt-auto flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(cartItemKey(item), item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="rounded-md border p-1 hover:bg-slate-50 disabled:opacity-50"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(cartItemKey(item), item.quantity + 1)}
                            className="rounded-md border p-1 hover:bg-slate-50"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removeItem(cartItemKey(item))}
                            className="ml-auto text-slate-400 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">{formatPrice(cart.subtotal, 'ZAR')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Shipping</span>
                <span className="font-medium">{formatPrice(cart.shipping, 'ZAR')}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="font-bold text-lg">{formatPrice(cart.total, 'ZAR')}</span>
              </div>
              <Button asChild className="w-full" size="lg">
                <Link href="/checkout" onClick={() => setOpen(false)}>
                  Proceed to Checkout
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full" size="sm">
                <Link href="/cart" onClick={() => setOpen(false)}>
                  View Full Cart
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
