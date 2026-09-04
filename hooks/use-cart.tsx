'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { CartItem, Cart, SelectedOptions } from '@/lib/types';

const CART_KEY = 'everything-store-cart';

function calculateCart(items: CartItem[]): Cart {
  const subtotal = items.reduce((sum, item) => {
    const price = item.sale_price && item.sale_price < item.price ? item.sale_price : item.price;
    return sum + price * item.quantity;
  }, 0);

  const shipping = items.reduce((sum, item) => {
    return sum + (item.supplier_shipping_cost || 0) * item.quantity;
  }, 0);

  return {
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    shipping: Math.round(shipping * 100) / 100,
    total: Math.round((subtotal + shipping) * 100) / 100,
  };
}

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CART_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore invalid data
  }
  return [];
}

function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // Storage full or unavailable
  }
}

type CartContextType = {
  cart: Cart;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (itemKey: string) => void;
  updateQuantity: (itemKey: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
};

const CartContext = createContext<CartContextType | null>(null);

export function cartItemKey(item: {
  productId: string;
  selected_colour?: { name: string } | null;
  selected_options?: SelectedOptions | null;
}): string {
  if (item.selected_options && Object.keys(item.selected_options).length > 0) {
    const sorted = Object.keys(item.selected_options).sort();
    const parts = sorted.map((k) => `${k}=${item.selected_options![k].name}`);
    return `${item.productId}:${parts.join(':')}`;
  }
  if (item.selected_colour) {
    return `${item.productId}:Colour=${item.selected_colour.name}`;
  }
  return `${item.productId}:`;
}

export function formatOptionsLabel(options: SelectedOptions | null | undefined): string {
  if (!options || Object.keys(options).length === 0) return '';
  return Object.entries(options)
    .map(([type, val]) => `${type}: ${val.name}`)
    .join(', ');
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(loadCart());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveCart(items);
  }, [items, mounted]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    const qty = item.quantity || 1;
    const key = cartItemKey(item);
    setItems((prev) => {
      const existing = prev.find((i) => cartItemKey(i) === key);
      if (existing) {
        return prev.map((i) =>
          cartItemKey(i) === key
            ? { ...i, quantity: Math.min(i.quantity + qty, 99) }
            : i
        );
      }
      return [...prev, { ...item, quantity: qty }];
    });
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => cartItemKey(i) !== key));
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((i) =>
        cartItemKey(i) === key ? { ...i, quantity: Math.min(quantity, 99) } : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const cart = calculateCart(items);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addItem, removeItem, updateQuantity, clearCart, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    return {
      cart: { items: [], subtotal: 0, shipping: 0, total: 0 },
      addItem: () => {},
      removeItem: () => {},
      updateQuantity: () => {},
      clearCart: () => {},
      itemCount: 0,
    };
  }
  return context;
}
