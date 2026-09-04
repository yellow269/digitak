import type { ProductOption, ProductOptionValue } from './types';

export const ZALEMART_FEED_URL =
  'https://docs.google.com/spreadsheets/d/1RmUoY3_6-8O6jEtI83oml20dB43vxmOOXLrwNAn7lcs/export?format=csv';

export const ZALEMART_BASE_URL = 'https://www.zalemart.co.za/products';

// Map Zalemart product types to our category slugs
const TYPE_TO_CATEGORY: Record<string, string> = {
  dress: 'dresses',
  dresses: 'dresses',
  jacket: 'jackets-coats',
  jackets: 'jackets-coats',
  jersey: 'shirts-t-shirts',
  'ladies leggings': 'pants-jeans',
  pants: 'pants-jeans',
  shirts: 'shirts-t-shirts',
  shoes: 'shoes-footwear',
  skirt: 'dresses',
  'sports bras': 'clothing-activewear',
  tops: 'shirts-t-shirts',
  handbags: 'bags-handbags',
};

export type ZalemartVariant = {
  sku: string;
  barcode: string | null;
  option1Name: string | null;
  option1Value: string | null;
  option2Name: string | null;
  option2Value: string | null;
  option3Name: string | null;
  option3Value: string | null;
  price: number;
  compareAtPrice: number | null;
  cost: number;
  inventoryQuantity: number;
  weightGrams: number | null;
  imageUrl: string | null;
};

export type ZalemartProduct = {
  title: string;
  handle: string;
  description: string;
  vendor: string;
  productType: string;
  tags: string;
  variants: ZalemartVariant[];
  imageUrl: string | null;
  totalStock: number;
  minCost: number;
  maxCost: number;
  options: ProductOption[];
};

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

function safeNum(v: string | undefined): number {
  if (!v || v.trim() === '') return 0;
  const n = parseFloat(v.replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
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

export function parseZalemartCsv(csvText: string): ZalemartProduct[] {
  const lines = csvText.split('\n');
  if (lines.length < 2) return [];

  const productMap = new Map<string, ZalemartProduct>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCsvLine(line);
    if (fields.length < 23) continue;

    const title = fields[0]?.trim() || '';
    const handle = fields[1]?.trim() || '';
    const description = fields[2]?.trim() || '';
    const vendor = fields[3]?.trim() || '';
    const productType = fields[5]?.trim() || '';
    const tags = fields[6]?.trim() || '';
    // fields[9] is the duplicate "Type" column = SKU
    const sku = fields[9]?.trim() || '';
    const barcode = fields[10]?.trim() || null;
    const option1Name = fields[11]?.trim() || null;
    const option1Value = fields[12]?.trim() || null;
    const option2Name = fields[14]?.trim() || null;
    const option2Value = fields[15]?.trim() || null;
    const option3Name = fields[17]?.trim() || null;
    const option3Value = fields[18]?.trim() || null;
    const price = safeNum(fields[20]);
    const compareAtPrice = safeNum(fields[21]) || null;
    const cost = safeNum(fields[22]);
    const inventoryQuantity = Math.round(safeNum(fields[23]));
    const weightGrams = safeNum(fields[24]) || null;
    const imageUrl = fields[27]?.trim() || null;

    if (!handle || !title) continue;

    const variant: ZalemartVariant = {
      sku,
      barcode,
      option1Name,
      option1Value,
      option2Name,
      option2Value,
      option3Name,
      option3Value,
      price,
      compareAtPrice,
      cost,
      inventoryQuantity,
      weightGrams,
      imageUrl,
    };

    if (productMap.has(handle)) {
      const existing = productMap.get(handle)!;
      existing.variants.push(variant);
      existing.totalStock += inventoryQuantity;
      if (cost > 0 && (existing.minCost === 0 || cost < existing.minCost)) existing.minCost = cost;
      if (cost > existing.maxCost) existing.maxCost = cost;
      if (imageUrl && !existing.imageUrl) existing.imageUrl = imageUrl;
    } else {
      productMap.set(handle, {
        title,
        handle,
        description,
        vendor,
        productType,
        tags,
        variants: [variant],
        imageUrl,
        totalStock: inventoryQuantity,
        minCost: cost,
        maxCost: cost,
        options: [],
      });
    }
  }

  // Build options from variants
  for (const product of productMap.values()) {
    const optionsMap = new Map<string, Set<string>>();
    for (const v of product.variants) {
      if (v.option1Name && v.option1Value) {
        if (!optionsMap.has(v.option1Name)) optionsMap.set(v.option1Name, new Set());
        optionsMap.get(v.option1Name)!.add(v.option1Value);
      }
      if (v.option2Name && v.option2Value) {
        if (!optionsMap.has(v.option2Name)) optionsMap.set(v.option2Name, new Set());
        optionsMap.get(v.option2Name)!.add(v.option2Value);
      }
      if (v.option3Name && v.option3Value) {
        if (!optionsMap.has(v.option3Name)) optionsMap.set(v.option3Name, new Set());
        optionsMap.get(v.option3Name)!.add(v.option3Value);
      }
    }
    product.options = Array.from(optionsMap.entries()).map(([type, values]) => ({
      type,
      values: Array.from(values).map((name) => ({ name })),
    }));
  }

  return Array.from(productMap.values());
}

export function mapZalemartTypeToCategoryId(
  productType: string,
  categoryMap: Record<string, string>
): string | null {
  const key = productType.toLowerCase().trim();
  const slug = TYPE_TO_CATEGORY[key];
  if (slug && categoryMap[slug]) return categoryMap[slug];
  return null;
}

export function calculateSellingPrice(
  cost: number,
  markupPercentage: number = 40,
  markupAmount: number = 0
): number {
  const base = cost;
  const markup = base * (markupPercentage / 100) + markupAmount;
  return Math.round((base + markup) * 100) / 100;
}
