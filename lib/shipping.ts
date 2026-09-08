/**
 * Shipping calculator — pure calculation logic (no server imports).
 *
 * Supports three modes:
 * 1. flat_rate — single shipping fee for all orders
 * 2. per_supplier — each supplier has its own shipping rate
 * 3. per_province — different rates per South African province
 */

import type { CartItem } from '@/lib/types';

export type ShippingConfig = {
  mode: 'flat_rate' | 'per_supplier' | 'per_province';
  /** Flat rate applied to every order (ZAR) */
  flat_rate: number;
  /** Minimum order subtotal for free shipping (0 = disabled) */
  free_shipping_minimum: number;
  /** Per-supplier rates: { [supplierId]: rate } */
  supplier_rates: Record<string, number>;
  /** Per-province rates: { [province]: rate } */
  province_rates: Record<string, number>;
  /** If true, products with supplier_shipping_cost = 0 get free shipping */
  exclude_free_shipping_products: boolean;
};

export type ShippingResult = {
  shipping: number;
  method: string;
  breakdown: { label: string; amount: number }[];
};

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  mode: 'flat_rate',
  flat_rate: 0,
  free_shipping_minimum: 0,
  supplier_rates: {},
  province_rates: {},
  exclude_free_shipping_products: false,
};

/**
 * Calculate shipping for a cart.
 *
 * @param items - Cart items
 * @param province - Customer's province (for per_province mode)
 * @param subtotal - Cart subtotal (for free shipping minimum check)
 * @param config - Shipping configuration
 */
export function calculateShipping(
  items: CartItem[],
  province: string | null,
  subtotal: number,
  config: ShippingConfig
): ShippingResult {
  const breakdown: { label: string; amount: number }[] = [];

  // Check free shipping minimum
  if (config.free_shipping_minimum > 0 && subtotal >= config.free_shipping_minimum) {
    return {
      shipping: 0,
      method: 'Free shipping (minimum met)',
      breakdown: [{ label: 'Free shipping', amount: 0 }],
    };
  }

  switch (config.mode) {
    case 'flat_rate': {
      const rate = config.flat_rate || 0;
      return {
        shipping: rate,
        method: 'Flat rate',
        breakdown: [{ label: 'Flat rate shipping', amount: rate }],
      };
    }

    case 'per_supplier': {
      const supplierTotals = new Map<string, { rate: number; count: number }>();

      for (const item of items) {
        const sid = item.productId.split('-')[0];
        const existing = supplierTotals.get(sid) || { rate: 0, count: 0 };
        const itemRate = config.supplier_rates[sid] ?? (item.supplier_shipping_cost || 0);
        existing.rate = itemRate;
        existing.count += item.quantity;
        supplierTotals.set(sid, existing);
      }

      let totalShipping = 0;
      for (const [sid, data] of supplierTotals) {
        totalShipping += data.rate;
        breakdown.push({ label: `Shipping (${sid})`, amount: data.rate });
      }

      return {
        shipping: totalShipping,
        method: 'Per-supplier',
        breakdown,
      };
    }

    case 'per_province': {
      if (province && config.province_rates[province] !== undefined) {
        const rate = config.province_rates[province];
        return {
          shipping: rate,
          method: `Shipping to ${province}`,
          breakdown: [{ label: `Shipping to ${province}`, amount: rate }],
        };
      }
      const fallbackRate = config.flat_rate || 0;
      return {
        shipping: fallbackRate,
        method: 'Standard shipping',
        breakdown: [{ label: 'Standard shipping', amount: fallbackRate }],
      };
    }

    default: {
      let totalShipping = 0;
      for (const item of items) {
        const itemShipping = (item.supplier_shipping_cost || 0) * item.quantity;
        if (itemShipping > 0) {
          totalShipping += itemShipping;
          breakdown.push({ label: `${item.name} shipping`, amount: itemShipping });
        }
      }
      return {
        shipping: totalShipping,
        method: 'Product-based',
        breakdown,
      };
    }
  }
}

/**
 * Client-side alias (same logic, no DB access).
 */
export const calculateShippingClient = calculateShipping;
