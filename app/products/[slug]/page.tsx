import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Star, ShieldCheck, CheckCircle2, ArrowLeft, Link2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { createPublicSupabaseClient } from '@/lib/supabase/server';
import { PUBLIC_PRODUCT_COLUMNS } from '@/lib/queries';
import { formatPrice } from '@/lib/format';
import { AFFILIATE_DISCLOSURE_SHORT, SITE_NAME } from '@/lib/constants';
import type { Product } from '@/lib/types';
import { ProductActions } from '@/components/product-actions';

export const revalidate = 3600;

async function getProduct(slug: string): Promise<Product | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select(PUBLIC_PRODUCT_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) {
    console.error('[ProductPage] Error fetching product:', error.message);
    return null;
  }
  return data as Product | null;
}

async function getRelatedProducts(categoryId: string | null, currentId: string): Promise<Product[]> {
  if (!categoryId) return [];
  const supabase = createPublicSupabaseClient();
  const { data } = await supabase
    .from('products')
    .select(PUBLIC_PRODUCT_COLUMNS)
    .eq('status', 'published')
    .eq('category_id', categoryId)
    .neq('id', currentId)
    .limit(4);
  return (data as unknown as Product[]) || [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Product not found' };

  const title = product.seo_title || `${product.name} | ${SITE_NAME}`;
  const description = product.seo_description || product.short_description || '';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.image_url ? [{ url: product.image_url }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: product.image_url ? [product.image_url] : [],
    },
    alternates: { canonical: `/products/${product.slug}` },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const benefits: string[] = Array.isArray(product.benefits) ? product.benefits : [];
  const isAffiliate = product.product_type === 'affiliate';
  const isDropshipping = product.product_type === 'dropshipping';
  const displayPrice = product.selling_price || product.price;
  const isOnSale = product.sale_price && product.sale_price < (product.price || 0);
  const relatedProducts = await getRelatedProducts(product.category?.id || null, product.id);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.short_description || product.description || '',
    image: product.image_url,
    brand: { '@type': 'Brand', name: product.vendor_name || SITE_NAME },
    aggregateRating:
      product.rating > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.review_count,
          }
        : undefined,
    offers: displayPrice
      ? {
          '@type': 'Offer',
          price: isOnSale ? product.sale_price : displayPrice,
          priceCurrency: product.currency || 'ZAR',
          availability: product.stock_status === 'out_of_stock'
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
        }
      : undefined,
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-900">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-slate-900">Products</Link>
        {product.category && (
          <>
            <span>/</span>
            <Link href={`/category/${product.category.slug}`} className="hover:text-slate-900">
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-slate-900">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100 lg:sticky lg:top-24 lg:self-start">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Link2 className="h-16 w-16" />
            </div>
          )}
          {product.featured && (
            <Badge className="absolute left-3 top-3 bg-amber-500 hover:bg-amber-500">Featured</Badge>
          )}
          {isOnSale && (
            <Badge className="absolute right-3 top-3 bg-red-500 hover:bg-red-500">Sale</Badge>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {/* Category */}
          {product.category && (
            <Link
              href={`/category/${product.category.slug}`}
              className="text-xs font-semibold uppercase tracking-wider text-sky-600 hover:text-sky-700"
            >
              {product.category.name}
            </Link>
          )}

          {/* Title */}
          <h1 className="mt-1 text-2xl font-bold text-slate-900 lg:text-3xl">{product.name}</h1>

          {/* Rating */}
          {product.rating > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-slate-700">{product.rating.toFixed(1)}</span>
              <span className="text-sm text-slate-400">({product.review_count})</span>
            </div>
          )}

          {/* Price */}
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-slate-900">
              {formatPrice(isOnSale ? (product.sale_price ?? null) : (displayPrice ?? null), product.currency || 'ZAR')}
            </span>
            {isOnSale && product.price && (
              <span className="text-lg text-slate-400 line-through">
                {formatPrice(product.price, product.currency || 'ZAR')}
              </span>
            )}
          </div>

          {/* Condition / Badges */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">New</Badge>
            {isDropshipping && (
              <Badge variant="outline" className="gap-1 text-xs text-green-700 border-green-200 bg-green-50">
                <Truck className="h-3 w-3" />
                Delivered directly to your door
              </Badge>
            )}
          </div>

          {/* Short description */}
          {product.short_description && (
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{product.short_description}</p>
          )}

          {/* Divider */}
          <div className="mt-6 border-t border-slate-200" />

          {/* Options */}
          <div className="mt-6">
            <ProductActions product={product} isAffiliate={isAffiliate} />
          </div>

          {isAffiliate && (
            <p className="mt-3 text-xs text-slate-500">
              You will be redirected to the vendor&apos;s page. {AFFILIATE_DISCLOSURE_SHORT}
            </p>
          )}

          {/* Vendor */}
          {product.vendor_name && (
            <p className="mt-4 text-xs text-slate-400">
              Vendor: <span className="font-medium text-slate-600">{product.vendor_name}</span>
            </p>
          )}

          {/* Benefits */}
          {benefits.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Key benefits</h2>
              <ul className="mt-3 space-y-2">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Full description */}
      {product.description && (
        <div className="mt-16 max-w-3xl">
          <h2 className="text-xl font-bold text-slate-900">About this product</h2>
          <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {product.description}
          </div>
        </div>
      )}

      {/* Affiliate disclosure box */}
      {isAffiliate && (
        <Card className="mt-12 border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-6">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-900">Affiliate Disclosure</h3>
              <p className="mt-1 text-sm text-amber-800">{AFFILIATE_DISCLOSURE_SHORT}</p>
              <Link href="/affiliate-disclosure" className="mt-2 inline-block text-sm font-medium text-amber-900 underline">
                Read full disclosure
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Related Products</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((p) => (
              <div key={p.id}>
                <Link href={`/products/${p.slug}`}>
                  <Card className="overflow-hidden transition-all hover:shadow-lg">
                    <div className="relative aspect-[4/3] bg-slate-100">
                      {p.image_url ? (
                        <Image src={p.image_url} alt={p.name} fill sizes="25vw" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          <Link2 className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-slate-900 line-clamp-1 hover:text-sky-700">{p.name}</h3>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {formatPrice(p.selling_price || p.price, p.currency || 'ZAR')}
                      </p>
                    </div>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <Button asChild variant="ghost" className="gap-1">
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
            Back to products
          </Link>
        </Button>
      </div>
    </div>
  );
}
