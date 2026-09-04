import type { ProductOption, ProductOptionValue, VariantStock } from './types';

export const ZALEMART_FEED_URL =
  'https://docs.google.com/spreadsheets/d/1RmUoY3_6-8O6jEtI83oml20dB43vxmOOXLrwNAn7lcs/export?format=csv';

export const ZALEMART_BASE_URL = 'https://www.zalemart.co.za/products';

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

/**
 * RFC 4180 compliant CSV parser that correctly handles:
 * - Quoted fields containing newlines (multiline descriptions)
 * - Escaped quotes ("")
 * - Commas inside quoted fields
 */
function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const ch = csvText[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < csvText.length && csvText[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
        i++;
      } else if (ch === '\r') {
        // Skip \r, handle \r\n
        i++;
      } else if (ch === '\n') {
        // End of row
        fields.push(current);
        current = '';
        // Skip empty trailing lines — must copy fields array (push is by reference)
        if (fields.length > 1 || fields[0] !== '') {
          rows.push([...fields]);
        }
        fields.length = 0;
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }

  // Push last field and row
  fields.push(current);
  if (fields.length > 1 || fields[0] !== '') {
    rows.push([...fields]);
  }

  return rows;
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
    .replace(/&#x27;/g, "'")
    .replace(/&#[0-9]+;/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(raw: string): string {
  return stripHtml(raw);
}

function safeNum(v: string | undefined): number {
  if (!v || v.trim() === '') return 0;
  const n = parseFloat(v.replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

/**
 * Parse Zalemart's Google Sheet CSV feed.
 *
 * Column layout (verified against actual feed data):
 *  [0]  Title
 *  [1]  URL Handle
 *  [2]  Description (HTML, may contain newlines inside quotes)
 *  [3]  Vendor
 *  [4]  Product Category (empty in practice)
 *  [5]  Type (product type: Pants, Dress, etc.)
 *  [6]  Tags
 *  [7]  Published on online store
 *  [8]  Status
 *  [9]  Type (duplicate header — this is the VARIANT SKU)
 *  [10] Barcode
 *  [11] Option 1 name
 *  [12] Option 1 value
 *  [13] (empty separator)
 *  [14] Option 2 name
 *  [15] Option 2 value
 *  [16] (empty separator)
 *  [17] Option 3 name
 *  [18] Option 3 value
 *  [19] (empty separator)
 *  [20] Price
 *  [21] Compare-at price
 *  [22] Cost per item
 *  [23] Inventory Quantity
 *  [24] Weight value (grams)
 *  [25] Weight unit for display
 *  [26] (empty separator)
 *  [27] Product Image
 */
export function parseZalemartCsv(csvText: string): ZalemartProduct[] {
  const allRows = parseCsvRows(csvText);
  if (allRows.length < 2) return [];

  // First row is headers — skip it
  const dataRows = allRows.slice(1);

  const productMap = new Map<string, ZalemartProduct>();

  for (const row of dataRows) {
    if (row.length < 25) continue;

    const title = cleanTitle(row[0] || '');
    const handle = (row[1] || '').trim();
    const description = row[2] || '';
    const vendor = (row[3] || '').trim();
    const productType = (row[5] || '').trim();
    const tags = (row[6] || '').trim();

    // Column 9 = SKU (duplicate "Type" header in the feed)
    const sku = (row[9] || '').trim();
    const barcode = (row[10] || '').trim() || null;

    const option1Name = (row[11] || '').trim() || null;
    const option1Value = (row[12] || '').trim() || null;
    const option2Name = (row[14] || '').trim() || null;
    const option2Value = (row[15] || '').trim() || null;
    const option3Name = (row[17] || '').trim() || null;
    const option3Value = (row[18] || '').trim() || null;

    const price = safeNum(row[20]);
    const compareAtPrice = safeNum(row[21]) || null;
    const cost = safeNum(row[22]);
    // Clamp negative stock to 0 (Zalemart uses negative values for oversold items)
    const rawStock = Math.round(safeNum(row[23]));
    const inventoryQuantity = rawStock < 0 ? 0 : rawStock;
    const weightGrams = safeNum(row[24]) || null;
    const imageUrl = (row[27] || '').trim() || null;

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
      if (cost > 0 && (existing.minCost === 0 || cost < existing.minCost)) {
        existing.minCost = cost;
      }
      if (cost > existing.maxCost) {
        existing.maxCost = cost;
      }
      if (imageUrl && !existing.imageUrl) {
        existing.imageUrl = imageUrl;
      }
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

/**
 * Build a variant_stock map from Zalemart variant data.
 * Key: "OptionType=Value:OptionType=Value" (sorted alphabetically)
 * Value: { stock, sku, price }
 */
export function buildVariantStock(variants: ZalemartVariant[]): VariantStock {
  const map: VariantStock = {};
  for (const v of variants) {
    const parts: string[] = [];
    if (v.option1Name && v.option1Value) parts.push(`${v.option1Name}=${v.option1Value}`);
    if (v.option2Name && v.option2Value) parts.push(`${v.option2Name}=${v.option2Value}`);
    if (v.option3Name && v.option3Value) parts.push(`${v.option3Name}=${v.option3Value}`);

    if (parts.length === 0) continue;

    const key = parts.sort().join(':');
    map[key] = {
      stock: v.inventoryQuantity,
      sku: v.sku,
      price: v.price || undefined,
    };
  }
  return map;
}
