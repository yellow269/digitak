-- Migration: Add category hierarchy and new categories
-- Adds parent_id for subcategories, inserts 16 parent categories and all subcategories.

-- 1. Add parent_id column (nullable, self-referencing FK)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id) WHERE parent_id IS NOT NULL;

-- 2. Insert parent categories (ON CONFLICT DO NOTHING to preserve existing)
INSERT INTO categories (name, slug, description, sort_order) VALUES
('Clothing & Fashion', 'clothing-fashion', 'Clothing, shoes, accessories and fashion items for men, women and kids.', 1),
('Electronics & Technology', 'electronics-technology', 'Cell phones, computers, gadgets and tech accessories.', 2),
('Home & Living', 'home-living', 'Furniture, decor, kitchen, garden and home essentials.', 3),
('Beauty & Personal Care', 'beauty-personal-care', 'Skincare, haircare, makeup and personal grooming.', 4),
('Health & Wellness', 'health-wellness', 'Health supplements, fitness gear and wellness products.', 5),
('Sports & Fitness', 'sports-fitness', 'Gym equipment, sportswear and outdoor gear.', 6),
('Automotive', 'automotive', 'Car accessories, care products and motorbike gear.', 7),
('Pets', 'pets', 'Supplies, toys and grooming for dogs, cats and other pets.', 8),
('Baby & Kids', 'baby-kids', 'Baby products, kids toys, accessories and school supplies.', 9),
('Toys & Games', 'toys-games', 'Toys, board games, puzzles and entertainment for all ages.', 10),
('Travel', 'travel', 'Luggage, travel bags and accessories for your trips.', 11),
('Jewellery & Accessories', 'jewellery-accessories', 'Watches, necklaces, rings, bracelets and fashion accessories.', 12),
('Tools & DIY', 'tools-diy', 'Hand tools, power tools and DIY supplies.', 13),
('Office & Stationery', 'office-stationery', 'Office supplies, stationery and workspace essentials.', 14),
('Food & Beverage', 'food-beverage', 'Snacks, drinks, coffee and specialty food items.', 15),
('Digital Products', 'digital-products', 'Ebooks, courses, software, templates and digital resources.', 16)
ON CONFLICT (slug) DO NOTHING;

-- 3. Insert subcategories
-- Each block uses a subquery to resolve parent_id

-- Clothing & Fashion subcategories
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
('Men''s Clothing', 'mens-clothing', (SELECT id FROM categories WHERE slug = 'clothing-fashion'), 1),
('Women''s Clothing', 'womens-clothing', (SELECT id FROM categories WHERE slug = 'clothing-fashion'), 2),
('Kids'' Clothing', 'kids-clothing', (SELECT id FROM categories WHERE slug = 'clothing-fashion'), 3),
('Shoes & Footwear', 'shoes-footwear', (SELECT id FROM categories WHERE slug = 'clothing-fashion'), 4),
('Sportswear', 'clothing-sportswear', (SELECT id FROM categories WHERE slug = 'clothing-fashion'), 5),
('Underwear & Lingerie', 'underwear-lingerie', (SELECT id FROM categories WHERE slug = 'clothing-fashion'), 6),
('Jackets & Coats', 'jackets-coats', (SELECT id FROM categories WHERE slug = 'clothing-fashion'), 7),
('Dresses', 'dresses', (SELECT id FROM categories WHERE slug = 'clothing-fashion'), 8),
('Shirts & T-Shirts', 'shirts-t-shirts', (SELECT id FROM categories WHERE slug = 'clothing-fashion'), 9),
('Pants & Jeans', 'pants-jeans', (SELECT id FROM categories WHERE slug = 'clothing-fashion'), 10),
('Shorts', 'shorts', (SELECT id FROM categories WHERE slug = 'clothing-fashion'), 11),
('Activewear', 'clothing-activewear', (SELECT id FROM categories WHERE slug = 'clothing-fashion'), 12),
('Accessories', 'clothing-accessories', (SELECT id FROM categories WHERE slug = 'clothing-fashion'), 13),
('Bags & Handbags', 'bags-handbags', (SELECT id FROM categories WHERE slug = 'clothing-fashion'), 14),
('Jewellery & Watches', 'jewellery-watches', (SELECT id FROM categories WHERE slug = 'clothing-fashion'), 15),
('Sunglasses', 'sunglasses', (SELECT id FROM categories WHERE slug = 'clothing-fashion'), 16)
ON CONFLICT (slug) DO NOTHING;

-- Electronics & Technology subcategories
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
('Electronics', 'electronics', (SELECT id FROM categories WHERE slug = 'electronics-technology'), 1),
('Cell Phones & Accessories', 'cell-phones-accessories', (SELECT id FROM categories WHERE slug = 'electronics-technology'), 2),
('Computers & Accessories', 'computers-accessories', (SELECT id FROM categories WHERE slug = 'electronics-technology'), 3),
('Gaming', 'gaming', (SELECT id FROM categories WHERE slug = 'electronics-technology'), 4),
('Smart Home', 'smart-home', (SELECT id FROM categories WHERE slug = 'electronics-technology'), 5),
('Wearables & Smartwatches', 'wearables-smartwatches', (SELECT id FROM categories WHERE slug = 'electronics-technology'), 6),
('Audio & Headphones', 'audio-headphones', (SELECT id FROM categories WHERE slug = 'electronics-technology'), 7),
('Cameras & Accessories', 'cameras-accessories', (SELECT id FROM categories WHERE slug = 'electronics-technology'), 8)
ON CONFLICT (slug) DO NOTHING;

-- Home & Living subcategories
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
('Furniture', 'furniture', (SELECT id FROM categories WHERE slug = 'home-living'), 1),
('Home Decor', 'home-decor', (SELECT id FROM categories WHERE slug = 'home-living'), 2),
('Bedding & Bath', 'bedding-bath', (SELECT id FROM categories WHERE slug = 'home-living'), 3),
('Kitchen & Dining', 'kitchen-dining', (SELECT id FROM categories WHERE slug = 'home-living'), 4),
('Storage & Organization', 'storage-organization', (SELECT id FROM categories WHERE slug = 'home-living'), 5),
('Garden & Outdoor', 'garden-outdoor', (SELECT id FROM categories WHERE slug = 'home-living'), 6),
('Lighting', 'lighting', (SELECT id FROM categories WHERE slug = 'home-living'), 7)
ON CONFLICT (slug) DO NOTHING;

-- Beauty & Personal Care subcategories
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
('Skincare', 'skincare', (SELECT id FROM categories WHERE slug = 'beauty-personal-care'), 1),
('Hair Care', 'hair-care', (SELECT id FROM categories WHERE slug = 'beauty-personal-care'), 2),
('Makeup', 'makeup', (SELECT id FROM categories WHERE slug = 'beauty-personal-care'), 3),
('Personal Care', 'personal-care', (SELECT id FROM categories WHERE slug = 'beauty-personal-care'), 4)
ON CONFLICT (slug) DO NOTHING;

-- Sports & Fitness subcategories
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
('Gym Equipment', 'gym-equipment', (SELECT id FROM categories WHERE slug = 'sports-fitness'), 1),
('Fitness Accessories', 'fitness-accessories', (SELECT id FROM categories WHERE slug = 'sports-fitness'), 2),
('Outdoor & Camping', 'outdoor-camping', (SELECT id FROM categories WHERE slug = 'sports-fitness'), 3),
('Cycling', 'cycling', (SELECT id FROM categories WHERE slug = 'sports-fitness'), 4),
('Running', 'running', (SELECT id FROM categories WHERE slug = 'sports-fitness'), 5)
ON CONFLICT (slug) DO NOTHING;

-- Pets subcategories
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
('Pet Supplies', 'pet-supplies', (SELECT id FROM categories WHERE slug = 'pets'), 1),
('Dog Supplies', 'dog-supplies', (SELECT id FROM categories WHERE slug = 'pets'), 2),
('Cat Supplies', 'cat-supplies', (SELECT id FROM categories WHERE slug = 'pets'), 3),
('Pet Toys', 'pet-toys', (SELECT id FROM categories WHERE slug = 'pets'), 4),
('Pet Grooming', 'pet-grooming', (SELECT id FROM categories WHERE slug = 'pets'), 5)
ON CONFLICT (slug) DO NOTHING;

-- Automotive subcategories
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
('Car Accessories', 'car-accessories', (SELECT id FROM categories WHERE slug = 'automotive'), 1),
('Car Care', 'car-care', (SELECT id FROM categories WHERE slug = 'automotive'), 2),
('Automotive Tools', 'automotive-tools', (SELECT id FROM categories WHERE slug = 'automotive'), 3),
('Motorbike Accessories', 'motorbike-accessories', (SELECT id FROM categories WHERE slug = 'automotive'), 4)
ON CONFLICT (slug) DO NOTHING;

-- Baby & Kids subcategories
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
('Baby Products', 'baby-products', (SELECT id FROM categories WHERE slug = 'baby-kids'), 1),
('Kids'' Toys', 'kids-toys', (SELECT id FROM categories WHERE slug = 'baby-kids'), 2),
('Kids'' Accessories', 'kids-accessories', (SELECT id FROM categories WHERE slug = 'baby-kids'), 3),
('School Supplies', 'school-supplies', (SELECT id FROM categories WHERE slug = 'baby-kids'), 4)
ON CONFLICT (slug) DO NOTHING;

-- Toys & Games subcategories
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
('Action Figures', 'action-figures', (SELECT id FROM categories WHERE slug = 'toys-games'), 1),
('Board Games', 'board-games', (SELECT id FROM categories WHERE slug = 'toys-games'), 2),
('Puzzles', 'puzzles', (SELECT id FROM categories WHERE slug = 'toys-games'), 3),
('Building Toys', 'building-toys', (SELECT id FROM categories WHERE slug = 'toys-games'), 4),
('Outdoor Toys', 'outdoor-toys', (SELECT id FROM categories WHERE slug = 'toys-games'), 5)
ON CONFLICT (slug) DO NOTHING;

-- Travel subcategories
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
('Luggage & Travel Bags', 'luggage-travel-bags', (SELECT id FROM categories WHERE slug = 'travel'), 1),
('Travel Accessories', 'travel-accessories', (SELECT id FROM categories WHERE slug = 'travel'), 2)
ON CONFLICT (slug) DO NOTHING;

-- Jewellery & Accessories subcategories
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
('Necklaces & Pendants', 'necklaces-pendants', (SELECT id FROM categories WHERE slug = 'jewellery-accessories'), 1),
('Rings', 'jewellery-rings', (SELECT id FROM categories WHERE slug = 'jewellery-accessories'), 2),
('Bracelets', 'bracelets', (SELECT id FROM categories WHERE slug = 'jewellery-accessories'), 3),
('Earrings', 'earrings', (SELECT id FROM categories WHERE slug = 'jewellery-accessories'), 4),
('Watches', 'watches', (SELECT id FROM categories WHERE slug = 'jewellery-accessories'), 5)
ON CONFLICT (slug) DO NOTHING;

-- Tools & DIY subcategories
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
('Hand Tools', 'hand-tools', (SELECT id FROM categories WHERE slug = 'tools-diy'), 1),
('Power Tools', 'power-tools', (SELECT id FROM categories WHERE slug = 'tools-diy'), 2),
('Painting & Decorating', 'painting-decorating', (SELECT id FROM categories WHERE slug = 'tools-diy'), 3),
('Plumbing', 'plumbing', (SELECT id FROM categories WHERE slug = 'tools-diy'), 4),
('Electrical', 'electrical', (SELECT id FROM categories WHERE slug = 'tools-diy'), 5)
ON CONFLICT (slug) DO NOTHING;

-- Office & Stationery subcategories
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
('Pens & Pencils', 'pens-pencils', (SELECT id FROM categories WHERE slug = 'office-stationery'), 1),
('Notebooks & Paper', 'notebooks-paper', (SELECT id FROM categories WHERE slug = 'office-stationery'), 2),
('Desk Accessories', 'desk-accessories', (SELECT id FROM categories WHERE slug = 'office-stationery'), 3),
('Filing & Organization', 'filing-organization', (SELECT id FROM categories WHERE slug = 'office-stationery'), 4)
ON CONFLICT (slug) DO NOTHING;

-- Food & Beverage subcategories
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
('Snacks', 'snacks', (SELECT id FROM categories WHERE slug = 'food-beverage'), 1),
('Coffee & Tea', 'coffee-tea', (SELECT id FROM categories WHERE slug = 'food-beverage'), 2),
('Drinks', 'drinks', (SELECT id FROM categories WHERE slug = 'food-beverage'), 3),
('Condiments & Sauces', 'condiments-sauces', (SELECT id FROM categories WHERE slug = 'food-beverage'), 4)
ON CONFLICT (slug) DO NOTHING;

-- Digital Products subcategories
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
('Ebooks', 'digital-ebooks', (SELECT id FROM categories WHERE slug = 'digital-products'), 1),
('Online Courses', 'digital-courses', (SELECT id FROM categories WHERE slug = 'digital-products'), 2),
('Software & Apps', 'digital-software', (SELECT id FROM categories WHERE slug = 'digital-products'), 3),
('Templates & Themes', 'digital-templates', (SELECT id FROM categories WHERE slug = 'digital-products'), 4),
('Marketing Resources', 'digital-marketing', (SELECT id FROM categories WHERE slug = 'digital-products'), 5),
('Personal Development', 'digital-personal-development', (SELECT id FROM categories WHERE slug = 'digital-products'), 6),
('Education Resources', 'digital-education', (SELECT id FROM categories WHERE slug = 'digital-products'), 7)
ON CONFLICT (slug) DO NOTHING;
