export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  created_at: string;
};

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
