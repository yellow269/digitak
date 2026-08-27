'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Star, ShoppingCart, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/format';
import { useCart } from '@/hooks/use-cart';
import type { Product } from '@/lib/types';
import { toast } from 'sonner';

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const displayPrice = product.selling_price || product.price;
  const isOnSale = product.sale_price && product.sale_price < (product.price || 0);

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
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
      stock_status: product.stock_status,
    });
    
    toast.success(`${product.name} added to cart`);
  }

  // For affiliate products, keep the "Get Deal" link
  const isAffiliate = product.product_type === 'affiliate';

  return (
    <Card className="group overflow-hidden flex flex-col transition-all hover:shadow-lg">
      <Link href={`/products/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <Tag className="h-10 w-10" />
          </div>
        )}
        {product.featured && (
          <Badge className="absolute left-2 top-2 bg-amber-500 hover:bg-amber-500">Featured</Badge>
        )}
        {isOnSale && (
          <Badge className="absolute right-2 top-2 bg-red-500 hover:bg-red-500">Sale</Badge>
        )}
        {product.stock_status === 'out_of_stock' && (
          <Badge variant="secondary" className="absolute right-2 top-2">Out of Stock</Badge>
        )}
      </Link>

      <CardContent className="flex flex-1 flex-col p-4">
        {product.category && (
          <Link
            href={`/category/${product.category.slug}`}
            className="mb-1 text-xs font-medium text-sky-600 hover:text-sky-700"
          >
            {product.category.name}
          </Link>
        )}
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-semibold text-slate-900 leading-snug hover:text-sky-700 transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>
        {product.short_description && (
          <p className="mt-1 text-sm text-slate-500 line-clamp-2">{product.short_description}</p>
        )}

        <div className="mt-2 flex items-center gap-2">
          {product.rating > 0 && (
            <div className="flex items-center gap-0.5">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium text-slate-600">{product.rating.toFixed(1)}</span>
              {product.review_count > 0 && (
                <span className="text-xs text-slate-400">({product.review_count})</span>
              )}
            </div>
          )}
        </div>

        <div className="mt-auto pt-3 flex items-center justify-between">
          <div>
            {isOnSale && (
              <span className="text-sm text-slate-400 line-through mr-2">
                {formatPrice(product.price, product.currency || 'ZAR')}
              </span>
            )}
            <span className="text-lg font-bold text-slate-900">
              {formatPrice(isOnSale ? (product.sale_price ?? null) : (displayPrice ?? null), product.currency || 'ZAR')}
            </span>
          </div>
          {product.shipping_estimate && (
            <span className="text-xs text-slate-500">{product.shipping_estimate}</span>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 p-4 pt-0">
        {isAffiliate ? (
          <Button asChild className="flex-1">
            <Link href={`/go/${product.slug}`}>
              Get Deal
            </Link>
          </Button>
        ) : (
          <Button
            className="flex-1 gap-1"
            onClick={handleAddToCart}
            disabled={product.stock_status === 'out_of_stock'}
          >
            <ShoppingCart className="h-4 w-4" />
            {product.stock_status === 'out_of_stock' ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
