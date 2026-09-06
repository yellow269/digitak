import type { ProductOption, ProductOptionValue, VariantStock } from './types';

export const ZALEMART_FEED_URL =
  'https://docs.google.com/spreadsheets/d/1RmUoY3_6-8O6jEtI83oml20dB43vxmOOXLrwNAn7lcs/export?format=csv';

export const ZALEMART_BASE_URL = 'https://www.zalemart.co.za/products';

const COLOUR_HEX_MAP: Record<string, string> = {
  black: '#000000',
  white: '#FFFFFF',
  red: '#FF0000',
  blue: '#0000FF',
  green: '#008000',
  yellow: '#FFFF00',
  orange: '#FFA500',
  purple: '#800080',
  pink: '#FFC0CB',
  brown: '#A52A2A',
  grey: '#808080',
  gray: '#808080',
  navy: '#000080',
  beige: '#F5F5DC',
  cream: '#FFFDD0',
  maroon: '#800000',
  teal: '#008080',
  cyan: '#00FFFF',
  lavender: '#E6E6FA',
  peach: '#FFDAB9',
  coral: '#FF7F50',
  burgundy: '#800020',
  charcoal: '#36454F',
  'charcoal black': '#36454F',
  gold: '#FFD700',
  silver: '#C0C0C0',
  ivory: '#FFFFF0',
  khaki: '#F0E68C',
  olive: '#808000',
  plum: '#8E4585',
  salmon: '#FA8072',
  tan: '#D2B48C',
  turquoise: '#40E0D0',
  wine: '#722F37',
  'light blue': '#ADD8E6',
  'dark blue': '#00008B',
  'light pink': '#FFB6C1',
  'dark green': '#006400',
  'dark red': '#8B0000',
  'light green': '#90EE90',
  'dark grey': '#A9A9A9',
  'dark gray': '#A9A9A9',
  'light grey': '#D3D3D3',
  'light gray': '#D3D3D3',
  'sky blue': '#87CEEB',
  'baby blue': '#89CFF0',
  'royal blue': '#4169E1',
  'hot pink': '#FF69B4',
  'dark purple': '#301551',
  'light purple': '#E6E6FA',
  'army green': '#4B5320',
  'forest green': '#228B22',
  'lime green': '#32CD32',
  'mint green': '#98FF98',
  'rose gold': '#B76E79',
  'dusty pink': '#DCAE96',
  'nude': '#E3BC9A',
  'off white': '#FAFAFA',
  'light wash blue': '#ADD8E6',
};

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
const SIZE_ORDER = [
  'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL',
];

function expandSizeRange(text: string): string[] | null {
  const cleaned = text.replace(/\s+/g, ' ').trim();

  // Range with dash: "XS-2XL" or "XS – 2XL"
  const rangeMatch = cleaned.match(/^(\S+)\s*[-–]\s*(\S+)$/);
  if (rangeMatch) {
    const start = rangeMatch[1].toUpperCase();
    const end = rangeMatch[2].toUpperCase();
    const startIdx = SIZE_ORDER.indexOf(start);
    const endIdx = SIZE_ORDER.indexOf(end);
    if (startIdx !== -1 && endIdx !== -1 && startIdx <= endIdx) {
      return SIZE_ORDER.slice(startIdx, endIdx + 1);
    }
    // Numeric range: "24-32" step by 2
    const numStart = parseInt(start);
    const numEnd = parseInt(end);
    if (!isNaN(numStart) && !isNaN(numEnd) && numStart <= numEnd) {
      const sizes: string[] = [];
      for (let n = numStart; n <= numEnd; n += 2) sizes.push(String(n));
      return sizes.length > 0 ? sizes : null;
    }
  }

  // Comma-separated: "24, 26, 28, 30"
  const parts = cleaned.split(/[,;/]\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts;

  return null;
}

function extractSizesFromDescription(description: string): string[] | null {
  if (!description) return null;
  const text = description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  const patterns = [
    /(?:available\s+)?sizes?\s*[:=]\s*(.+)/i,
    /(?:comes?\s+in|available\s+in|fit[s]?\s*[:=])\s*(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const sizeText = match[1].trim().replace(/[.;,]$/, '');
      const sizes = expandSizeRange(sizeText);
      if (sizes && sizes.length > 0) return sizes;
    }
  }

  return null;
}

function normalizeHandle(raw: string): string {
  // Strip trailing numeric suffixes like -1, -2, -3, -4 that Zalemart
  // uses for duplicate CSV rows of the same product.
  return raw.replace(/-\d+$/, '');
}

export function parseZalemartCsv(csvText: string): ZalemartProduct[] {
  const allRows = parseCsvRows(csvText);
  if (allRows.length < 2) return [];

  // First row is headers — skip it
  const dataRows = allRows.slice(1);

  const productMap = new Map<string, ZalemartProduct>();

  for (const row of dataRows) {
    if (row.length < 25) continue;

    const title = cleanTitle(row[0] || '');
    const handle = normalizeHandle((row[1] || '').trim());
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
      values: Array.from(values).map((name) => ({
        name,
        ...(type.toLowerCase() === 'colour' && COLOUR_HEX_MAP[name.toLowerCase()]
          ? { hex: COLOUR_HEX_MAP[name.toLowerCase()] }
          : {}),
      })),
    }));

    // Fallback: if no options from variant columns, extract sizes from description
    if (product.options.length === 0 && product.variants.length > 0) {
      const descSizes = extractSizesFromDescription(product.description);
      if (descSizes && descSizes.length > 0) {
        product.options = [{
          type: 'Size',
          values: descSizes.map((name) => ({ name })),
        }];
      }
    }
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
