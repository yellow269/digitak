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
    'Clothing & Fashion': ['shirt', 'pants', 'jeans', 'dress', 'jacket', 'coat', 'shoes', 'sneakers', 'boots', 'sandals', 'hat', 'cap', 'scarf', 'gloves', 'belt', 'watch', 'jewelry', 'necklace', 'bracelet', 'ring', 'earring', 'sunglasses', 'handbag', 'wallet', 'backpack', 'hoodie', 'sweater', 'polo', 'blazer', 'skirt', 'leggings', 'socks', 'underwear', 'lingerie', 'swimwear', 'bikini', 'tie', 'cufflinks', 'brooch', 'anklet', 'pendant', 'cuff', 'headband', 'hair clip', 'bow tie', 'waistcoat', 'cardigan', 'vest'],
    'Electronics & Technology': ['phone', 'laptop', 'tablet', 'headphone', 'earbuds', 'smartwatch', 'camera', 'speaker', 'charger', 'cable', 'bluetooth', 'wireless', 'usb', 'hdmi', 'monitor', 'keyboard', 'mouse', 'gpu', 'cpu', 'ram', 'ssd', 'hard drive', 'printer', 'router', 'modem', 'microphone', 'webcam', 'projector', 'power bank', 'screen protector', 'phone case', 'earphone', 'amplifier', 'turntable', 'vcr', 'dvd', 'gaming console', 'playstation', 'xbox', 'nintendo', 'steam deck', 'smart home', 'alexa', 'google home', 'nest', 'ring doorbell', 'smart plug', 'smart bulb', 'fitness tracker', 'vr headset', 'drone', 'action camera', 'dashcam', 'gps', 'antenna', 'satellite', '3d printer', 'scanner', 'graphic tablet'],
    'Home & Living': ['furniture', 'chair', 'table', 'sofa', 'bed', 'mattress', 'pillow', 'blanket', 'curtain', 'rug', 'lamp', 'light', 'garden', 'plant', 'pot', 'kitchen', 'appliance', 'microwave', 'oven', 'toaster', 'blender', 'coffee maker', 'kettle', 'refrigerator', 'washing machine', 'dishwasher', 'vacuum', 'fan', 'air conditioner', 'heater', 'dehumidifier', 'humidifier', 'air purifier', 'wardrobe', 'cabinet', 'shelf', 'bookcase', 'desk', 'stool', 'bench', 'ottoman', 'cushion', 'throw', 'vase', 'candle', 'mirror', 'clock', 'picture frame', 'wall art', 'decoration', 'storage bin', 'hanger', 'organizer', 'broom', 'mop', 'bucket', 'trash can', 'recycling bin', 'shower head', 'faucet', 'towel rack', 'soap dispenser'],
    'Beauty & Personal Care': ['skincare', 'makeup', 'cosmetic', 'perfume', 'cologne', 'shampoo', 'conditioner', 'soap', 'lotion', 'cream', 'serum', 'moisturizer', 'sunscreen', 'razor', 'shaver', 'hair', 'nail', 'lip', 'face', 'body', 'deodorant', 'antiperspirant', 'cotton buds', 'cotton pad', 'makeup brush', 'beauty blender', 'eyelash', 'eyebrow', 'foundation', 'concealer', 'mascara', 'eyeliner', 'blush', 'bronzer', 'highlighter', 'eyeshadow', 'lipstick', 'lip gloss', 'lip liner', 'nail polish', 'nail remover', 'hair dryer', 'hair straightener', 'curling iron', 'hair clipper', 'beard trimmer', 'epilator', 'wax kit', 'facial cleanser', 'toner', 'exfoliator', 'face mask', 'eye cream', 'hand cream', 'foot cream', 'body wash', 'bath bomb', 'bubble bath'],
    'Health & Wellness': ['fitness', 'gym', 'workout', 'yoga', 'protein', 'vitamin', 'supplement', 'health', 'wellness', 'exercise', 'running', 'cycling', 'swimming', 'sports', 'athletic', 'muscle', 'weight loss', 'diet', 'nutrition', 'massage', 'physiotherapy', 'blood pressure monitor', 'thermometer', 'scale', 'weighing', 'first aid', 'bandage', 'antiseptic', 'pain relief', 'aromatherapy', 'essential oil', 'diffuser', 'herbal', 'organic', 'natural remedy', 'homeopathy', 'acupuncture', 'meditation', 'mindfulness', 'sleep aid', 'melatonin', 'probiotic', 'omega', 'fish oil', 'collagen', 'biotin', 'zinc', 'iron', 'calcium', 'magnesium', 'multivitamin', 'antioxidant', 'superfood', 'detox', 'cleansing'],
    'Sports & Fitness': ['camping', 'hiking', 'fishing', 'hunting', 'golf', 'tennis', 'basketball', 'football', 'soccer', 'baseball', 'cricket', 'rugby', 'surfing', 'skateboard', 'bicycle', 'bike', 'tent', 'sleeping bag', 'binoculars', 'dumbbell', 'barbell', 'kettlebell', 'resistance band', 'yoga mat', 'foam roller', 'jump rope', 'pull up bar', 'weight bench', 'treadmill', 'elliptical', 'rowing machine', 'exercise bike', 'punching bag', 'boxing gloves', 'mma gloves', 'swimming goggles', 'swimming cap', 'surfboard', 'paddleboard', 'kayak', 'canoe', 'snorkel', 'scuba', 'ski', 'snowboard', 'ice skate', 'roller skate', 'inline skate', 'archery', 'dart', 'billiard', 'ping pong', 'badminton', 'squash', 'volleyball', 'hockey stick', 'lacrosse'],
    'Automotive': ['car', 'truck', 'suv', 'motorcycle', 'bike', 'auto', 'vehicle', 'engine', 'brake', 'tire', 'tyre', 'oil', 'filter', 'battery', 'light', 'bumper', 'seat cover', 'floor mat', 'dash cam', 'car mount', 'phone holder', 'steering wheel', 'gear shift', 'exhaust', 'muffler', 'spark plug', 'alternator', 'starter', 'radiator', 'water pump', 'timing belt', 'clutch', 'transmission', 'differential', 'suspension', 'shock absorber', 'wheel bearing', 'hub cap', 'wheel alignment', 'car wash', 'car polish', 'car wax', 'car vacuum', 'car air freshener', 'car alarm', 'immobilizer', 'gps tracker', 'motorcycle helmet', 'motorcycle jacket', 'motorcycle gloves', 'motorcycle boots'],
    'Pets': ['pet', 'dog', 'cat', 'bird', 'fish', 'hamster', 'guinea pig', 'rabbit', 'turtle', 'reptile', 'aquarium', 'pet food', 'dog food', 'cat food', 'pet toy', 'dog toy', 'cat toy', 'pet bed', 'dog bed', 'cat bed', 'pet carrier', 'dog crate', 'cat litter', 'pet grooming', 'dog shampoo', 'cat shampoo', 'pet brush', 'pet nail clipper', 'pet leash', 'dog leash', 'cat harness', 'pet collar', 'dog collar', 'cat collar', 'pet bowl', 'dog bowl', 'cat bowl', 'pet fountain', 'pet feeder', 'automatic feeder', 'pet gate', 'pet door', 'pet camera', 'pet tracker', 'pet stain remover', 'pet odor remover', 'pet insurance'],
    'Baby & Kids': ['baby', 'toddler', 'infant', 'newborn', 'stroller', 'car seat', 'crib', 'cot', 'bassinet', 'high chair', 'baby monitor', 'pacifier', 'bottle', 'breast pump', 'diaper', 'nappy', 'baby wipes', 'baby lotion', 'baby shampoo', 'baby powder', 'teething', 'rattle', 'baby gym', 'play mat', 'baby carrier', 'sling', 'wrap', 'baby bath', 'hooded towel', 'bib', 'baby spoon', 'baby cup', 'sippy cup', 'baby food', 'formula', 'crib mattress', 'changing table', 'nursery', 'kids room', 'child proof', 'safety gate', 'outlet cover', 'baby gate', 'playpen', 'pack n play', 'bouncer', 'swing', 'rocker'],
    'Toys & Games': ['toy', 'game', 'puzzle', 'lego', 'doll', 'action figure', 'board game', 'video game', 'card game', 'plush', 'stuffed animal', 'remote control', ' rc ', 'transformer', 'hot wheels', 'matchbox', 'barbie', 'nerf', 'play-doh', 'slime', 'fidget', ' Rubik', 'jigsaw', 'trivia', 'monopoly', 'scrabble', 'chess', 'checkers', 'domino', 'uno', 'playing card', 'dice', 'building block', 'magnetic tile', 'marble run', 'train set', 'dollhouse', 'play kitchen', 'toy car', 'toy train', 'toy airplane', 'toy soldier', 'toy weapon', 'superhero', 'disney', 'pokemon', 'mario'],
    'Travel': ['luggage', 'suitcase', 'travel bag', 'carry on', 'duffel', 'backpack travel', 'toiletry', 'passport holder', 'luggage tag', 'luggage lock', 'packing cube', 'travel pillow', 'eye mask', 'ear plug', 'travel adapter', 'power converter', 'travel mug', 'water bottle', 'collapsible', 'foldable', 'travel umbrella', 'travel towel', 'microfiber towel', 'neck wallet', 'money belt', 'fanny pack', 'crossbody bag', 'anti-theft', 'rfid blocking', 'luggage scale', 'digital scale travel', 'garment bag', 'shoe bag', 'laundry bag', 'travel organizer', 'cable organizer', 'tech pouch'],
    'Jewellery & Accessories': ['necklace', 'pendant', 'chain', 'choker', 'collar', 'ring', 'engagement ring', 'wedding band', 'promise ring', 'bracelet', 'bangle', 'charm bracelet', 'anklet', 'earring', 'stud', 'hoop', 'drop earring', 'clip-on', 'watch', 'smartwatch', 'pocket watch', 'cufflink', 'tie clip', 'lapel pin', 'brooch', 'hair accessory', 'hair pin', 'hair clip', 'hair band', 'headband', 'tiara', 'crown', 'scarf', 'shawl', 'wrap', 'glove', 'beret', 'beanie', 'fedora', 'sun hat', 'visor', 'belt', 'suspenders', 'bow tie', 'tie'],
    'Tools & DIY': ['drill', 'saw', 'hammer', 'screwdriver', 'wrench', 'plier', 'tape measure', 'level', 'socket', 'ratchet', 'clamp', 'vise', 'workbench', 'tool box', 'tool set', 'tool kit', 'power drill', 'circular saw', 'jigsaw', 'reciprocating saw', 'angle grinder', 'sander', 'polisher', 'router', 'planer', 'lathe', 'compressor', 'generator', 'inverter', 'welder', 'soldering iron', 'heat gun', 'glue gun', 'hot glue', 'caulk gun', 'paint sprayer', 'paint roller', 'paint brush', 'paint tray', 'sandpaper', 'wire brush', 'chisel', 'file', 'rasp', 'hacksaw', 'pipe wrench', 'adjustable wrench', 'torque wrench', 'allen key', 'hex key', 'spirit level', 'laser level', 'stud finder', 'multimeter', 'voltage tester', 'cable tester'],
    'Office & Stationery': ['pen', 'pencil', 'marker', 'highlighter', 'crayon', 'colored pencil', 'notebook', 'paper', 'sticky note', 'post-it', 'binder', 'folder', 'file', 'stapler', 'staple', 'paper clip', 'binder clip', 'rubber band', 'tape', 'scissors', 'ruler', 'eraser', 'sharpener', 'correction fluid', 'correction tape', 'whiteboard', 'chalkboard', 'cork board', 'desk', 'office chair', 'ergonomic', 'monitor stand', 'laptop stand', 'keyboard tray', 'mouse pad', 'desk lamp', 'desk organizer', 'pen holder', 'letter tray', 'mail sorter', 'label maker', 'label', 'envelope', 'rubber stamp', 'ink pad', 'calculator', 'shredder', 'laminator', 'paper cutter', 'hole punch'],
    'Food & Beverage': ['coffee', 'tea', 'chocolate', 'snack', 'food', 'drink', 'beverage', 'organic', 'natural', 'spice', 'sauce', 'oil', 'vinegar', 'honey', 'jam', 'peanut butter', 'nutella', 'cereal', 'oat', 'granola', 'energy bar', 'protein bar', 'dried fruit', 'nuts', 'seeds', 'popcorn', 'chips', 'crisp', 'biscuit', 'cookie', 'cracker', 'pretzel', 'jerky', 'biltong', 'dried meat', 'candy', 'sweet', 'gum', 'mint', 'lozenge', 'juice', 'smoothie', 'kombucha', 'energy drink', 'sports drink', 'water', 'sparkling water', 'soda', 'soft drink', 'wine', 'beer', 'spirits', 'whisky', 'vodka', 'gin', 'rum', 'tequila', 'champagne'],
    'Digital Products': ['ebook', 'kindle', 'audiobook', 'course', 'online course', 'software', 'saas', 'app', 'template', 'theme', 'plugin', 'digital download', 'membership', 'subscription', 'tutorial', 'masterclass', 'webinar', 'podcast', 'youtube', 'online learning', 'e-learning', 'mooc', 'certification', 'training', 'workshop', 'coaching', 'mentoring', 'consulting', 'digital art', 'stock photo', 'stock video', 'music', 'sound effect', 'font', 'icon', 'illustration', 'svg', 'psd', 'ai file', 'figma', 'canva', 'notion template', 'excel template', 'word template', 'powerpoint template', 'google sheets', 'airtable', 'zapier', 'automation', 'chatbot', 'ai tool'],
  };

  let bestMatch = null;
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
