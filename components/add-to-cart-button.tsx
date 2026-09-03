'use client';

import Link from 'next/link';
import { ShoppingCart, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { toast } from 'sonner';
import type { Product, ColourOption } from '@/lib/types';

export function AddToCartButton({ product, isAffiliate, selectedColour }: { product: Product; isAffiliate: boolean; selectedColour?: ColourOption | null }) {
  const { addItem } = useCart();
  const displayPrice = product.selling_price || product.price;

  if (isAffiliate) {
    return (
      <div className="flex gap-2">
        <Button asChild size="lg" className="flex-1 gap-2 text-base">
          <Link href={`/go/${product.slug}`}>
            Get Deal
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  function handleAddToCart() {
    if (!displayPrice) return;
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image_url: product.image_url,
      price: product.price || displayPrice || 0,
      sale_price: product.sale_price,
      product_type: product.product_type || 'affiliate',
      shipping_estimate: product.shipping_estimate,
      supplier_shipping_cost: product.supplier_shipping_cost,
      stock_status: product.stock_status,
      selected_colour: selectedColour || null,
    });
    const colourLabel = selectedColour ? ` (${selectedColour.name})` : '';
    toast.success(`${product.name}${colourLabel} added to cart`);
  }

  function handleBuyNow() {
    handleAddToCart();
    window.location.href = '/checkout';
  }

  return (
    <div className="flex gap-2">
      <Button
        size="lg"
        className="flex-1 gap-2 text-base"
        onClick={handleAddToCart}
        disabled={product.stock_status === 'out_of_stock'}
      >
        <ShoppingCart className="h-4 w-4" />
        {product.stock_status === 'out_of_stock' ? 'Out of Stock' : 'Add to Cart'}
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="text-base"
        onClick={handleBuyNow}
        disabled={product.stock_status === 'out_of_stock'}
      >
        Buy Now
      </Button>
    </div>
  );
}
