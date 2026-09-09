/**
 * Shipping calculator — pure calculation logic (no server imports).
 *
 * Supports three modes:
 * 1. per_product — each product's supplier_shipping_cost is used (DEFAULT, dropshipping)
 * 2. flat_rate — single shipping fee for all orders
 * 3. per_province — different rates per South African province
 */

import type { CartItem } from '@/lib/types';

export type ShippingConfig = {
  mode: 'per_product' | 'flat_rate' | 'per_province';
  /** Flat rate applied to every order (ZAR) — used by flat_rate mode */
  flat_rate: number;
  /** Minimum order subtotal for free shipping (0 = disabled) */
  free_shipping_minimum: number;
  /** Per-province rates: { [province]: rate } */
  province_rates: Record<string, number>;
};

export type ShippingResult = {
  shipping: number;
  method: string;
  breakdown: { label: string; amount: number }[];
};

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  mode: 'per_product',
  flat_rate: 0,
  free_shipping_minimum: 0,
  province_rates: {},
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
    case 'per_product': {
      // Each product's supplier_shipping_cost × quantity
      let totalShipping = 0;
      for (const item of items) {
        const rate = item.supplier_shipping_cost || 0;
        const itemShipping = rate * item.quantity;
        totalShipping += itemShipping;
        if (itemShipping > 0) {
          breakdown.push({ label: `${item.name} shipping`, amount: itemShipping });
        }
      }
      if (totalShipping === 0) {
        breakdown.push({ label: 'No shipping charges', amount: 0 });
      }
      return {
        shipping: totalShipping,
        method: 'Per-product shipping',
        breakdown,
      };
    }

    case 'flat_rate': {
      const rate = config.flat_rate || 0;
      return {
        shipping: rate,
        method: 'Flat rate',
        breakdown: [{ label: 'Flat rate shipping', amount: rate }],
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
      // Fallback: if no province rate set, use per_product for each item
      let totalShipping = 0;
      for (const item of items) {
        const rate = item.supplier_shipping_cost || 0;
        const itemShipping = rate * item.quantity;
        totalShipping += itemShipping;
        if (itemShipping > 0) {
          breakdown.push({ label: `${item.name} shipping`, amount: itemShipping });
        }
      }
      if (totalShipping === 0) {
        breakdown.push({ label: 'No shipping charges', amount: 0 });
      }
      return {
        shipping: totalShipping,
        method: 'Product-based shipping',
        breakdown,
      };
    }

    default: {
      // Unknown mode — fall back to per_product
      let totalShipping = 0;
      for (const item of items) {
        const rate = item.supplier_shipping_cost || 0;
        const itemShipping = rate * item.quantity;
        totalShipping += itemShipping;
      }
      return {
        shipping: totalShipping,
        method: 'Product-based shipping',
        breakdown: [{ label: 'Shipping', amount: totalShipping }],
      };
    }
  }
}

/**
 * Client-side alias (same logic, no DB access).
 */
export const calculateShippingClient = calculateShipping;
