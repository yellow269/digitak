export const SITE_NAME = 'Everything Store';
export const SITE_TAGLINE = 'Everything you need, all in one place.';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://digitalvaultsa.co.za';

export const CURRENCY_SYMBOLS: Record<string, string> = {
  ZAR: 'R',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export const AFFILIATE_DISCLOSURE_SHORT =
  'This page contains affiliate links. If you purchase through one of our links, we may earn a commission at no additional cost to you.';

export const BLOG_CATEGORIES = [
  'AI Tools',
  'Online Business',
  'Software',
  'Marketing',
  'Productivity',
  'Digital Products',
  'Tutorials',
  'Reviews',
  'Comparisons',
];

export const PRODUCT_CATEGORIES = [
  'AI & Technology',
  'Make Money Online',
  'Business',
  'Marketing',
  'Software',
  'Personal Development',
  'Education',
  'Health & Fitness',
  'Lifestyle',
  'Finance',
  'Ebooks',
  'Courses',
  'Templates',
  'Electronics',
  'Fashion',
  'Home & Garden',
  'Sports & Outdoors',
  'Beauty & Personal Care',
  'Toys & Games',
  'Automotive',
  'Books',
  'Other',
];

export const PRODUCT_TYPES = [
  { value: 'affiliate', label: 'Affiliate' },
  { value: 'dropshipping', label: 'Dropshipping' },
  { value: 'digital', label: 'Digital' },
  { value: 'manual', label: 'Manual' },
] as const;

export const STOCK_STATUSES = [
  { value: 'in_stock', label: 'In Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'pre_order', label: 'Pre-Order' },
] as const;

export const ORDER_STATUSES = [
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'supplier_processing', label: 'Supplier Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
] as const;

export const SOUTH_AFRICAN_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

export const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || '';
export const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY || '';
export const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || '';
export const PAYFAST_SANDBOX = process.env.PAYFAST_SANDBOX === 'true';
export const PAYFAST_URL = PAYFAST_SANDBOX
  ? 'https://sandbox.payfast.co.za/eng/process'
  : 'https://www.payfast.co.za/eng/process';
export const PAYFAST_VALIDATE_URL = PAYFAST_SANDBOX
  ? 'https://sandbox.payfast.co.za/eng/query/validate'
  : 'https://www.payfast.co.za/eng/query/validate';
