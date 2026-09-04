export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  parent_id: string | null;
  created_at: string;
};

export type ProductType = 'affiliate' | 'dropshipping' | 'digital' | 'manual';
export type StockStatus = 'in_stock' | 'out_of_stock' | 'low_stock' | 'pre_order';

export type ColourOption = {
  name: string;
  hex: string;
};

export type ProductOptionValue = {
  name: string;
  hex?: string;
};

export type ProductOption = {
  type: string;
  values: ProductOptionValue[];
};

export type SelectedOptions = Record<string, ProductOptionValue>;

export type Product = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  benefits: string[];
  category_id: string | null;
  vendor_name: string | null;
  image_url: string | null;
  affiliate_url?: string;
  price: number | null;
  currency: string;
  rating: number;
  review_count: number;
  featured: boolean;
  status: string;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  
  // Dropshipping fields
  product_type?: ProductType;
  supplier_id?: string | null;
  supplier_sku?: string | null;
  supplier_cost?: number | null;
  supplier_shipping_cost?: number | null;
  markup_percentage?: number | null;
  markup_amount?: number | null;
  selling_price?: number | null;
  estimated_profit?: number | null;
  stock_status?: StockStatus;
  shipping_estimate?: string | null;
  supplier_url?: string | null;
  supplier_notes?: string | null;
  sale_price?: number | null;
  quantity_available?: number;
  colours?: ColourOption[];
  options?: ProductOption[];
  
  // Joined relation
  supplier?: Supplier | null;
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  category: string | null;
  author: string | null;
  tags: string[];
  related_products: string[];
  seo_title: string | null;
  seo_description: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AffiliateClick = {
  id: string;
  product_id: string | null;
  created_at: string;
  referrer: string | null;
  landing_page: string | null;
  device_type: string | null;
  country: string | null;
  session_id: string | null;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  read: boolean;
  created_at: string;
};

export type NewsletterSubscriber = {
  id: string;
  email: string;
  consent: boolean;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
};

// ============================================================
// SUPPLIER TYPES
// ============================================================
export type Supplier = {
  id: string;
  name: string;
  website: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  product_url: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SupplierProduct = {
  id: string;
  supplier_id: string;
  product_name: string;
  product_url: string | null;
  supplier_sku: string | null;
  supplier_cost: number | null;
  shipping_cost: number | null;
  description: string | null;
  image_url: string | null;
  category: string | null;
  imported: boolean;
  imported_product_id: string | null;
  markup_percentage: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
};

// ============================================================
// ORDER TYPES
// ============================================================
export type OrderStatus = 
  | 'pending_payment'
  | 'paid'
  | 'supplier_processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 'pending_payment' | 'paid' | 'failed' | 'refunded';
export type FulfillmentStatus = 'pending' | 'sent_to_supplier' | 'shipped' | 'delivered';

export type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  shipping_city: string;
  shipping_province: string;
  shipping_postal_code: string;
  shipping_country: string;
  payment_status: PaymentStatus;
  payment_method: string;
  payfast_payment_id: string | null;
  status: OrderStatus;
  subtotal: number;
  shipping_total: number;
  total: number;
  payment_fee: number;
  tracking_number: string | null;
  courier_name: string | null;
  tracking_url: string | null;
  supplier_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  supplier_id: string | null;
  supplier_sku: string | null;
  supplier_cost: number | null;
  supplier_shipping_cost: number | null;
  estimated_profit: number | null;
  fulfillment_status: FulfillmentStatus;
  supplier_notes: string | null;
  selected_colour: ColourOption | null;
  selected_options: SelectedOptions | null;
  created_at: string;
  product?: Product;
  supplier?: Supplier;
};

// ============================================================
// CART TYPES
// ============================================================
export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  image_url: string | null;
  price: number;
  sale_price?: number | null;
  quantity: number;
  product_type: ProductType;
  shipping_estimate?: string | null;
  supplier_shipping_cost?: number | null;
  stock_status?: StockStatus;
  selected_colour?: ColourOption | null;
  selected_options?: SelectedOptions | null;
};

export type Cart = {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
};

// ============================================================
// CHECKOUT TYPES
// ============================================================
export type CheckoutFormData = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
};

// ============================================================
// PROFIT TYPES
// ============================================================
export type ProfitSummary = {
  total_sales: number;
  product_costs: number;
  shipping_costs: number;
  payment_fees: number;
  estimated_profit: number;
  profit_margin: number;
  order_count: number;
};
