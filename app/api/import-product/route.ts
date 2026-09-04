import { NextRequest, NextResponse } from 'next/server';
import type { ProductOption, ProductOptionValue } from '@/lib/types';

export const dynamic = 'force-dynamic';

export interface ImportedProduct {
  name: string;
  description: string;
  short_description: string;
  images: string[];
  price: number | null;
  currency: string;
  sku: string | null;
  brand: string | null;
  category_suggestion: string | null;
  options: ProductOption[];
  supplier_url: string;
  seo_title: string | null;
  seo_description: string | null;
}

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#[0-9]+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMetaContent(html: string, pattern: string): string | null {
  const match = html.match(new RegExp(pattern, 'i'));
  if (match && match[1]) {
    const val = match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
    return val || null;
  }
  return null;
}

function extractJsonLdProducts(html: string): Record<string, unknown>[] {
  const products: Record<string, unknown>[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      if (data['@type'] === 'Product') {
        products.push(data);
      } else if (Array.isArray(data['@graph'])) {
        for (const item of data['@graph']) {
          if (item['@type'] === 'Product') products.push(item);
        }
      }
    } catch {}
  }
  return products;
}

function extractOptionsFromJsonLd(product: Record<string, unknown>): ProductOption[] {
  const options: ProductOption[] = [];
  const offers = product.offers;
  if (!offers) return options;

  let variants: Record<string, unknown>[] = [];
  if (Array.isArray(offers)) {
    variants = offers as Record<string, unknown>[];
  } else if (typeof offers === 'object' && offers !== null) {
    const o = offers as Record<string, unknown>;
    if (Array.isArray(o.offers)) {
      variants = o.offers as Record<string, unknown>[];
    } else {
      return options;
    }
  }

  if (variants.length < 2) return options;

  const optionMap = new Map<string, Set<string>>();

  for (const variant of variants) {
    const name = (variant.name as string) || '';
    if (name) {
      const parts = name.split(/\s*\/\s*|\s*-\s*/);
      for (let i = 0; i < parts.length; i++) {
        const key = `Option ${i + 1}`;
        if (!optionMap.has(key)) optionMap.set(key, new Set());
        optionMap.get(key)!.add(parts[i].trim());
      }
    }
    if (variant.color || variant.colour) {
      const color = ((variant.color || variant.colour) as string).trim();
      if (!optionMap.has('Colour')) optionMap.set('Colour', new Set());
      optionMap.get('Colour')!.add(color);
    }
    if (variant.size) {
      const size = (variant.size as string).trim();
      if (!optionMap.has('Size')) optionMap.set('Size', new Set());
      optionMap.get('Size')!.add(size);
    }
    if (variant.material) {
      const mat = (variant.material as string).trim();
      if (!optionMap.has('Material')) optionMap.set('Material', new Set());
      optionMap.get('Material')!.add(mat);
    }
  }

  for (const [type, values] of optionMap) {
    if (values.size >= 2) {
      const cleanType = type.startsWith('Option') ? 'Variant' : type;
      options.push({
        type: cleanType,
        values: Array.from(values).map((v) => ({ name: v })),
      });
    }
  }

  return options;
}

function extractOptionsFromHtml(html: string): ProductOption[] {
  const options: ProductOption[] = [];

  const selectRegex = /<select[^>]*(?:name|id|class)=["']([^"']*(?:color|colour|size|material|weight|storage|capacity|model|style|variant)[^"']*)["'][^>]*>([\s\S]*?)<\/select>/gi;
  let selectMatch;
  while ((selectMatch = selectRegex.exec(html)) !== null) {
    const label = selectMatch[1].toLowerCase();
    let type = 'Variant';
    if (label.includes('colour') || label.includes('color')) type = 'Colour';
    else if (label.includes('size')) type = 'Size';
    else if (label.includes('material')) type = 'Material';
    else if (label.includes('weight')) type = 'Weight';
    else if (label.includes('storage')) type = 'Storage';
    else if (label.includes('capacity')) type = 'Capacity';
    else if (label.includes('model')) type = 'Model';
    else if (label.includes('style')) type = 'Style';

    const optionRegex = /<option[^>]*>([^<]+)<\/option>/gi;
    let optMatch;
    const values: ProductOptionValue[] = [];
    while ((optMatch = optionRegex.exec(selectMatch[2])) !== null) {
      const val = optMatch[1].trim();
      if (val && !val.toLowerCase().includes('select') && !val.toLowerCase().includes('choose')) {
        values.push({ name: val });
      }
    }
    if (values.length >= 2) {
      options.push({ type, values });
    }
  }

  return options;
}

function detectCategory(name: string, description: string, brand: string | null): string | null {
  const text = `${name} ${description} ${brand || ''}`.toLowerCase();

  const categoryMap: Record<string, string[]> = {
    'Electronics': ['phone', 'laptop', 'tablet', 'headphone', 'earbuds', 'smartwatch', 'camera', 'speaker', 'charger', 'cable', 'bluetooth', 'wireless', 'usb', 'hdmi', 'monitor', 'keyboard', 'mouse', 'gpu', 'cpu', 'ram', 'ssd', 'hard drive', 'printer', 'router', 'modem'],
    'Fashion': ['shirt', 'pants', 'jeans', 'dress', 'jacket', 'coat', 'shoes', 'sneakers', 'boots', 'sandals', 'hat', 'cap', 'scarf', 'gloves', 'belt', 'watch', 'jewelry', 'necklace', 'bracelet', 'ring', 'earring', 'sunglasses', 'handbag', 'wallet', 'backpack'],
    'Health & Fitness': ['fitness', 'gym', 'workout', 'yoga', 'protein', 'vitamin', 'supplement', 'health', 'wellness', 'exercise', 'running', 'cycling', 'swimming', 'sports', 'athletic', 'muscle', 'weight loss', 'diet', 'nutrition', 'massage', 'physiotherapy'],
    'Home & Garden': ['furniture', 'chair', 'table', 'sofa', 'bed', 'mattress', 'pillow', 'blanket', 'curtain', 'rug', 'lamp', 'light', 'garden', 'plant', 'pot', 'tool', 'drill', 'saw', 'hammer', 'screwdriver', 'paint', 'decor', 'kitchen', 'appliance'],
    'Beauty & Personal Care': ['skincare', 'makeup', 'cosmetic', 'perfume', 'cologne', 'shampoo', 'conditioner', 'soap', 'lotion', 'cream', 'serum', 'moisturizer', 'sunscreen', 'razor', 'shaver', 'hair', 'nail', 'lip', 'face', 'body'],
    'Toys & Games': ['toy', 'game', 'puzzle', 'lego', 'doll', 'action figure', 'board game', 'video game', 'card game', 'plush', 'stuffed animal', 'remote control', 'drone', ' rc '],
    'Sports & Outdoors': ['camping', 'hiking', 'fishing', 'hunting', 'golf', 'tennis', 'basketball', 'football', 'soccer', 'baseball', 'cricket', 'rugby', 'surfing', 'skateboard', 'bicycle', 'bike', 'tent', 'sleeping bag', 'backpack', 'binoculars'],
    'Automotive': ['car', 'truck', 'suv', 'motorcycle', 'bike', 'auto', 'vehicle', 'engine', 'brake', 'tire', 'tyre', 'oil', 'filter', 'battery', 'light', 'bumper', 'seat cover', 'floor mat', 'dash cam'],
    'Books': ['book', 'novel', 'textbook', 'guide', 'manual', 'ebook', 'kindle', 'audiobook', 'fiction', 'non-fiction', 'biography', 'cookbook'],
    'Food & Beverage': ['coffee', 'tea', 'chocolate', 'snack', 'food', 'drink', 'beverage', 'organic', 'natural', 'spice', 'sauce', 'oil', 'vinegar'],
  };

  let bestMatch = 'Other';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(categoryMap)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }

  return bestScore >= 1 ? bestMatch : null;
}

function extractPriceFromText(html: string): { price: number | null; currency: string } {
  const pricePatterns = [
    /R\s*(\d{1,6}(?:[.,]\d{1,2})?)/,
    /ZAR\s*(\d{1,6}(?:[.,]\d{1,2})?)/,
    /\$\s*(\d{1,6}(?:[.,]\d{1,2})?)/,
    /USD\s*(\d{1,6}(?:[.,]\d{1,2})?)/,
    /€\s*(\d{1,6}(?:[.,]\d{1,2})?)/,
    /£\s*(\d{1,6}(?:[.,]\d{1,2})?)/,
  ];

  const currencies = ['ZAR', 'ZAR', 'USD', 'USD', 'EUR', 'GBP'];

  for (let i = 0; i < pricePatterns.length; i++) {
    const match = html.match(pricePatterns[i]);
    if (match) {
      const priceStr = match[1].replace(',', '.');
      const price = parseFloat(priceStr);
      if (price > 0 && price < 1000000) {
        return { price, currency: currencies[i] };
      }
    }
  }

  return { price: null, currency: 'ZAR' };
}

async function tryShopifyJson(url: string): Promise<ImportedProduct | null> {
  try {
    const jsonUrl = url.endsWith('.json') ? url : `${url.replace(/\/$/, '')}.json`;
    const res = await fetch(jsonUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EverythingStore/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const product = data.product;
    if (!product || !product.title) return null;

    const images: string[] = [];
    if (product.images && Array.isArray(product.images)) {
      for (const img of product.images) {
        if (img.src) images.push(img.src);
      }
    }
    if (product.image && product.image.src) {
      if (!images.includes(product.image.src)) images.unshift(product.image.src);
    }

    const options: ProductOption[] = [];
    if (product.options && Array.isArray(product.options)) {
      for (const opt of product.options) {
        if (opt.name && opt.values && opt.values.length >= 2) {
          options.push({
            type: opt.name,
            values: opt.values.map((v: string) => ({ name: v })),
          });
        }
      }
    }

    const firstVariant = product.variants?.[0];
    const price = firstVariant?.price ? parseFloat(firstVariant.price) : null;
    const sku = firstVariant?.sku || null;

    const description = stripHtml(product.body_html || '');
    const shortDesc = description.substring(0, 200).trim();

    return {
      name: product.title,
      description,
      short_description: shortDesc,
      images,
      price,
      currency: 'ZAR',
      sku,
      brand: product.vendor || null,
      category_suggestion: product.product_type || null,
      options,
      supplier_url: url,
      seo_title: product.title,
      seo_description: shortDesc,
    };
  } catch {
    return null;
  }
}

function extractFromJsonLd(html: string, url: string): ImportedProduct | null {
  const products = extractJsonLdProducts(html);
  if (products.length === 0) return null;

  const product = products[0];
  const name = (product.name as string) || '';
  if (!name) return null;

  let description = '';
  if (typeof product.description === 'string') {
    description = stripHtml(product.description);
  }

  const images: string[] = [];
  if (typeof product.image === 'string') {
    images.push(product.image);
  } else if (Array.isArray(product.image)) {
    for (const img of product.image) {
      if (typeof img === 'string') images.push(img);
    }
  }

  let price: number | null = null;
  let currency = 'ZAR';
  const offers = product.offers;
  if (offers) {
    const offerObj = Array.isArray(offers) ? offers[0] : offers;
    if (typeof offerObj === 'object' && offerObj !== null) {
      if (offerObj.price) {
        price = parseFloat(String(offerObj.price));
      }
      if (offerObj.priceCurrency) {
        currency = String(offerObj.priceCurrency);
      }
    }
  }

  const sku = (product.sku as string) || null;
  let brand: string | null = null;
  if (product.brand && typeof product.brand === 'object') {
    brand = (product.brand as Record<string, unknown>).name as string || null;
  }

  const category = (product.category as string) || null;

  const options = extractOptionsFromJsonLd(product);

  const shortDesc = description.substring(0, 200).trim();

  return {
    name,
    description,
    short_description: shortDesc,
    images,
    price,
    currency,
    sku,
    brand,
    category_suggestion: category,
    options,
    supplier_url: url,
    seo_title: name,
    seo_description: shortDesc,
  };
}

function extractFromHtml(html: string, url: string, warnings: string[]): ImportedProduct | null {
  const ogTitle = extractMetaContent(html, '<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"\']*)["\']') ||
    extractMetaContent(html, '<meta[^>]*content=["\']([^"\']*)["\'][^>]*property=["\']og:title["\']');
  const ogDesc = extractMetaContent(html, '<meta[^>]*property=["\']og:description["\'][^>]*content=["\']([^"\']*)["\']') ||
    extractMetaContent(html, '<meta[^>]*content=["\']([^"\']*)["\'][^>]*property=["\']og:description["\']');
  const ogImage = extractMetaContent(html, '<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']*)["\']') ||
    extractMetaContent(html, '<meta[^>]*content=["\']([^"\']*)["\'][^>]*property=["\']og:image["\']');

  const titleTag = extractMetaContent(html, '<title[^>]*>([^<]+)</title>');
  const metaDesc = extractMetaContent(html, '<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\']') ||
    extractMetaContent(html, '<meta[^>]*content=["\']([^"\']*)["\'][^>]*name=["\']description["\']');

  const name = ogTitle || titleTag || '';
  if (!name) return null;

  const description = stripHtml(ogDesc || metaDesc || '');
  const shortDesc = description.substring(0, 200).trim();

  const images: string[] = [];
  if (ogImage) images.push(ogImage);

  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const src = imgMatch[1];
    if (src && !images.includes(src) && !src.includes('logo') && !src.includes('icon') && !src.includes('avatar') && !src.includes('sprite') && !src.includes('banner') && !src.includes('pixel') && !src.includes('tracking') && !src.includes('1x1') && !src.includes('badge') && src.length > 10) {
      const fullSrc = src.startsWith('//') ? `https:${src}` : src.startsWith('/') ? `${new URL(url).origin}${src}` : src;
      if (!images.includes(fullSrc)) images.push(fullSrc);
    }
  }

  const { price, currency } = extractPriceFromText(html);

  const options = extractOptionsFromHtml(html);

  const categorySuggestion = detectCategory(name, description, null);
  if (!categorySuggestion) {
    warnings.push('Could not determine product category. Please select one manually.');
  }

  return {
    name,
    description,
    short_description: shortDesc,
    images: images.slice(0, 20),
    price,
    currency,
    sku: null,
    brand: null,
    category_suggestion: categorySuggestion,
    options,
    supplier_url: url,
    seo_title: name,
    seo_description: shortDesc,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || !isValidUrl(url)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid URL starting with http:// or https://' }, { status: 400 });
    }

    const warnings: string[] = [];

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Unable to fetch the page (HTTP ${response.status}). The website may be blocking automated requests.`,
      });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return NextResponse.json({
        success: false,
        error: 'The URL does not point to an HTML page. Please check the URL.',
      });
    }

    const html = await response.text();

    const shopifyData = await tryShopifyJson(url);
    if (shopifyData) {
      return NextResponse.json({ success: true, data: shopifyData, warnings });
    }

    const jsonLdData = extractFromJsonLd(html, url);
    if (jsonLdData) {
      return NextResponse.json({ success: true, data: jsonLdData, warnings });
    }

    const htmlData = extractFromHtml(html, url, warnings);
    if (htmlData) {
      warnings.push('Extracted from basic HTML. Some fields may be incomplete — please review and fill in missing details.');
      return NextResponse.json({ success: true, data: htmlData, warnings });
    }

    return NextResponse.json({
      success: false,
      error: 'Unable to automatically extract product data from this URL. Please check the URL or enter the product details manually.',
    });
  } catch (err) {
    console.error('[ImportProduct] Error:', err);
    return NextResponse.json({
      success: false,
      error: 'An error occurred while fetching the product. Please try again or enter the details manually.',
    });
  }
}
