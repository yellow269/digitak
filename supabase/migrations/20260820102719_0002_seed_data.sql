/*
# Everything Store — Seed Data

## Overview
Inserts demo categories, 10 clearly-marked fictional demo products (with fictional affiliate URLs pointing to https://example.com/...), and 5 demo blog posts. This data is for demonstration only and is marked as demo.

## Important Notes
1. All products use `https://example.com/affiliate/demo-...` URLs — these are fictional placeholders, NOT real Digistore24 links. Replace them via the admin dashboard with your real affiliate URLs.
2. Product names are prefixed with "[Demo]" to make clear they are sample data.
3. Categories cover the full requested taxonomy.
4. Blog posts are sample articles with markdown content.
5. This migration is idempotent: it uses ON CONFLICT DO NOTHING for categories, products (on slug), and blog posts.
*/

-- ===== Categories =====
INSERT INTO categories (name, slug, description, seo_title, seo_description, sort_order) VALUES
('AI & Technology', 'ai-and-technology', 'Artificial intelligence tools, machine learning platforms, and cutting-edge tech products.', 'AI & Technology Digital Products | Everything Store', 'Discover AI tools, machine learning platforms and tech products curated for South African creators.', 1),
('Make Money Online', 'make-money-online', 'Courses, systems and resources for earning income online.', 'Make Money Online Products | Everything Store', 'Explore vetted products and courses for building online income streams.', 2),
('Business', 'business', 'Business tools, templates and resources for entrepreneurs.', 'Business Digital Products | Everything Store', 'Business templates, tools and resources for entrepreneurs and small businesses.', 3),
('Marketing', 'marketing', 'Digital marketing courses, tools and templates.', 'Marketing Digital Products | Everything Store', 'Marketing courses, automation tools and templates to grow your audience.', 4),
('Software', 'software', 'Productivity software, SaaS tools and applications.', 'Software Digital Products | Everything Store', 'Productivity software, SaaS tools and applications for professionals.', 5),
('Personal Development', 'personal-development', 'Self-improvement courses, ebooks and programs.', 'Personal Development Products | Everything Store', 'Self-improvement courses, ebooks and coaching programs.', 6),
('Education', 'education', 'Online courses, learning platforms and educational resources.', 'Education Digital Products | Everything Store', 'Online courses and learning resources across many subjects.', 7),
('Health & Fitness', 'health-and-fitness', 'Fitness programs, nutrition guides and wellness products.', 'Health & Fitness Digital Products | Everything Store', 'Fitness programs, nutrition guides and wellness resources.', 8),
('Lifestyle', 'lifestyle', 'Lifestyle, hobbies and personal interest digital products.', 'Lifestyle Digital Products | Everything Store', 'Lifestyle and hobby digital products for everyday life.', 9),
('Finance', 'finance', 'Personal finance, investing and money management resources.', 'Finance Digital Products | Everything Store', 'Personal finance, investing and money management resources.', 10),
('Ebooks', 'ebooks', 'Digital books across every category.', 'Ebooks | Everything Store', 'Digital books and ebooks across every category.', 11),
('Courses', 'courses', 'Online courses and training programs.', 'Courses | Everything Store', 'Online courses and training programs from trusted creators.', 12),
('Templates', 'templates', 'Reusable templates for design, business and productivity.', 'Templates | Everything Store', 'Reusable templates for design, business and productivity.', 13),
('Other Digital Products', 'other-digital-products', 'Digital products that don''t fit elsewhere.', 'Other Digital Products | Everything Store', 'Other digital products and resources worth your time.', 14)
ON CONFLICT (slug) DO NOTHING;

-- ===== Demo Products =====
INSERT INTO products (
  name, slug, short_description, description, benefits, category_id, vendor_name, image_url, affiliate_url,
  price, currency, rating, review_count, featured, status, seo_title, seo_description, created_at
)
VALUES
('[Demo] AI Copywriter Pro', 'demo-ai-copywriter-pro',
'AI-powered writing assistant for marketers and creators.',
'[Demo product] AI Copywriter Pro helps you generate blog posts, ad copy, emails and product descriptions in seconds. This is a fictional demo product for illustration only.',
'["Generate marketing copy in seconds","Supports 30+ languages","Built-in plagiarism checker","SEO mode included"]',
(SELECT id FROM categories WHERE slug = 'ai-and-technology'), 'DemoVendor Studios', 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=800',
'https://example.com/affiliate/demo-ai-copywriter-pro', 497.00, 'ZAR', 4.7, 128, true, 'published',
'AI Copywriter Pro — AI Writing Assistant | Everything Store', 'AI Copywriter Pro is a demo AI writing assistant for marketers. This is a demo product.', now() - interval '2 days')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  name, slug, short_description, description, benefits, category_id, vendor_name, image_url, affiliate_url,
  price, currency, rating, review_count, featured, status, seo_title, seo_description, created_at
)
VALUES
('[Demo] Affiliate Income Blueprint', 'demo-affiliate-income-blueprint',
'A step-by-step course on building affiliate income online.',
'[Demo product] Affiliate Income Blueprint walks you through setting up an affiliate website, choosing products, and driving traffic. This is a fictional demo product.',
'["8 video modules","Downloadable worksheets","Private community access","Lifetime updates"]',
(SELECT id FROM categories WHERE slug = 'make-money-online'), 'DemoVendor Academy', 'https://images.pexels.com/photos/4968391/pexels-photo-4968391.jpeg?auto=compress&cs=tinysrgb&w=800',
'https://example.com/affiliate/demo-affiliate-income-blueprint', 897.00, 'ZAR', 4.5, 86, true, 'published',
'Affiliate Income Blueprint — Online Income Course | Everything Store', 'Affiliate Income Blueprint is a demo course on building affiliate income. This is a demo product.', now() - interval '5 days')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  name, slug, short_description, description, benefits, category_id, vendor_name, image_url, affiliate_url,
  price, currency, rating, review_count, featured, status, seo_title, seo_description, created_at
)
VALUES
('[Demo] Business Plan Template Pack', 'demo-business-plan-template-pack',
'20 editable business plan templates for startups.',
'[Demo product] Business Plan Template Pack includes 20 professionally designed, fully editable templates for business plans, pitch decks and financial projections. This is a fictional demo product.',
'["20 editable templates","Works in Word, Google Docs and Pages","Financial projection sheets included","Step-by-step instructions"]',
(SELECT id FROM categories WHERE slug = 'business'), 'DemoVendor Templates', 'https://images.pexels.com/photos/669454/pexels-photo-669454.jpeg?auto=compress&cs=tinysrgb&w=800',
'https://example.com/affiliate/demo-business-plan-template-pack', 249.00, 'ZAR', 4.3, 54, false, 'published',
'Business Plan Template Pack | Everything Store', 'A demo pack of 20 editable business plan templates. This is a demo product.', now() - interval '8 days')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  name, slug, short_description, description, benefits, category_id, vendor_name, image_url, affiliate_url,
  price, currency, rating, review_count, featured, status, seo_title, seo_description, created_at
)
VALUES
('[Demo] Social Media Marketing Mastery', 'demo-social-media-marketing-mastery',
'Complete social media marketing course for small businesses.',
'[Demo product] Social Media Marketing Mastery teaches you how to grow audiences on Instagram, TikTok, LinkedIn and more. This is a fictional demo product.',
'["12 hours of video","Platform-specific playbooks","Content calendar templates","Monthly live Q&A"]',
(SELECT id FROM categories WHERE slug = 'marketing'), 'DemoVendor Academy', 'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=800',
'https://example.com/affiliate/demo-social-media-marketing-mastery', 697.00, 'ZAR', 4.6, 112, true, 'published',
'Social Media Marketing Mastery Course | Everything Store', 'A demo social media marketing course for small businesses. This is a demo product.', now() - interval '3 days')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  name, slug, short_description, description, benefits, category_id, vendor_name, image_url, affiliate_url,
  price, currency, rating, review_count, featured, status, seo_title, seo_description, created_at
)
VALUES
('[Demo] TaskFlow Project Management App', 'demo-taskflow-project-management-app',
'A sleek project management app for freelancers and small teams.',
'[Demo product] TaskFlow is a demo project management application with kanban boards, time tracking and team collaboration. This is a fictional demo product.',
'["Kanban, list and calendar views","Time tracking built in","Unlimited projects","Team collaboration"]',
(SELECT id FROM categories WHERE slug = 'software'), 'DemoVendor Apps', 'https://images.pexels.com/photos/3781338/pexels-photo-3781338.jpeg?auto=compress&cs=tinysrgb&w=800',
'https://example.com/affiliate/demo-taskflow-project-management-app', 149.00, 'ZAR', 4.4, 73, false, 'published',
'TaskFlow Project Management App | Everything Store', 'A demo project management app for freelancers and teams. This is a demo product.', now() - interval '10 days')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  name, slug, short_description, description, benefits, category_id, vendor_name, image_url, affiliate_url,
  price, currency, rating, review_count, featured, status, seo_title, seo_description, created_at
)
VALUES
('[Demo] Productivity Habits Ebook', 'demo-productivity-habits-ebook',
'A 180-page ebook on building habits that stick.',
'[Demo product] Productivity Habits is a demo ebook covering science-backed strategies for building lasting habits. This is a fictional demo product.',
'["180 pages","Printable habit trackers","Bonus audio version","Lifetime access"]',
(SELECT id FROM categories WHERE slug = 'personal-development'), 'DemoVendor Press', 'https://images.pexels.com/photos/3747139/pexels-photo-3747139.jpeg?auto=compress&cs=tinysrgb&w=800',
'https://example.com/affiliate/demo-productivity-habits-ebook', 97.00, 'ZAR', 4.2, 41, false, 'published',
'Productivity Habits Ebook | Everything Store', 'A demo ebook on building productive habits. This is a demo product.', now() - interval '14 days')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  name, slug, short_description, description, benefits, category_id, vendor_name, image_url, affiliate_url,
  price, currency, rating, review_count, featured, status, seo_title, seo_description, created_at
)
VALUES
('[Demo] Web Development Bootcamp 2026', 'demo-web-development-bootcamp-2026',
'Full-stack web development bootcamp for beginners.',
'[Demo product] Web Development Bootcamp 2026 takes you from zero to job-ready full-stack developer with 60+ hours of video. This is a fictional demo product.',
'["60+ hours of video","20 real-world projects","Mentor support","Certificate of completion"]',
(SELECT id FROM categories WHERE slug = 'education'), 'DemoVendor Academy', 'https://images.pexels.com/photos/270404/pexels-photo-270404.jpeg?auto=compress&cs=tinysrgb&w=800',
'https://example.com/affiliate/demo-web-development-bootcamp-2026', 1297.00, 'ZAR', 4.8, 203, true, 'published',
'Web Development Bootcamp 2026 | Everything Store', 'A demo full-stack web development bootcamp. This is a demo product.', now() - interval '1 days')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  name, slug, short_description, description, benefits, category_id, vendor_name, image_url, affiliate_url,
  price, currency, rating, review_count, featured, status, seo_title, seo_description, created_at
)
VALUES
('[Demo] 12-Week Home Fitness Program', 'demo-12-week-home-fitness-program',
'A complete home fitness program with no equipment needed.',
'[Demo product] 12-Week Home Fitness Program includes follow-along videos, meal plans and progress tracking. This is a fictional demo product.',
'["12 weeks of workouts","No equipment needed","Custom meal plans","Progress tracking app"]',
(SELECT id FROM categories WHERE slug = 'health-and-fitness'), 'DemoVendor Fitness', 'https://images.pexels.com/photos/4498362/pexels-photo-4498362.jpeg?auto=compress&cs=tinysrgb&w=800',
'https://example.com/affiliate/demo-12-week-home-fitness-program', 397.00, 'ZAR', 4.5, 67, false, 'published',
'12-Week Home Fitness Program | Everything Store', 'A demo 12-week home fitness program. This is a demo product.', now() - interval '6 days')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  name, slug, short_description, description, benefits, category_id, vendor_name, image_url, affiliate_url,
  price, currency, rating, review_count, featured, status, seo_title, seo_description, created_at
)
VALUES
('[Demo] Personal Finance Dashboard', 'demo-personal-finance-dashboard',
'A Notion-based personal finance dashboard template.',
'[Demo product] Personal Finance Dashboard is a Notion template for budgeting, tracking expenses and planning savings goals. This is a fictional demo product.',
'["Full Notion template","Budget, expenses and savings tracker","Net worth calculator","Video setup guide"]',
(SELECT id FROM categories WHERE slug = 'finance'), 'DemoVendor Templates', 'https://images.pexels.com/photos/4968391/pexels-photo-4968391.jpeg?auto=compress&cs=tinysrgb&w=800',
'https://example.com/affiliate/demo-personal-finance-dashboard', 79.00, 'ZAR', 4.1, 38, false, 'published',
'Personal Finance Dashboard Notion Template | Everything Store', 'A demo Notion personal finance dashboard template. This is a demo product.', now() - interval '11 days')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  name, slug, short_description, description, benefits, category_id, vendor_name, image_url, affiliate_url,
  price, currency, rating, review_count, featured, status, seo_title, seo_description, created_at
)
VALUES
('[Demo] Notion Productivity OS', 'demo-notion-productivity-os',
'An all-in-one Notion workspace for managing life and work.',
'[Demo product] Notion Productivity OS is a complete Notion template combining tasks, notes, goals and habits in one dashboard. This is a fictional demo product.',
'["All-in-one Notion template","Tasks, notes, goals and habits","Daily, weekly and monthly views","Setup video included"]',
(SELECT id FROM categories WHERE slug = 'templates'), 'DemoVendor Templates', 'https://images.pexels.com/photos/7681091/pexels-photo-7681091.jpeg?auto=compress&cs=tinysrgb&w=800',
'https://example.com/affiliate/demo-notion-productivity-os', 129.00, 'ZAR', 4.6, 95, true, 'published',
'Notion Productivity OS Template | Everything Store', 'A demo all-in-one Notion productivity template. This is a demo product.', now() - interval '4 days')
ON CONFLICT (slug) DO NOTHING;

-- ===== Demo Blog Posts =====
INSERT INTO blog_posts (title, slug, excerpt, content, featured_image, category, author, tags, related_products, seo_title, seo_description, published, published_at, created_at)
VALUES
('10 AI Tools Worth Trying in 2026', '10-ai-tools-worth-trying-in-2026',
'A curated look at ten AI tools shaping productivity and creativity in 2026.',
'# 10 AI Tools Worth Trying in 2026

AI is moving fast. Here are ten tools worth exploring this year.

## 1. AI Writing Assistants
Tools that help you draft marketing copy, emails and blog posts faster.

## 2. Image Generators
Generate custom visuals for your content without a designer.

## 3. Transcription Tools
Turn audio and video into accurate text automatically.

> This article contains affiliate links. Everything Store may earn a commission if you purchase through one of our links.',
'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1200',
'AI Tools', 'Everything Store Team', '["ai","tools","2026"]', '[]',
'10 AI Tools Worth Trying in 2026 | Everything Store', 'A curated look at ten AI tools shaping productivity and creativity in 2026.',
true, now() - interval '2 days', now() - interval '2 days')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (title, slug, excerpt, content, featured_image, category, author, tags, related_products, seo_title, seo_description, published, published_at, created_at)
VALUES
('Best Digital Products for Online Entrepreneurs', 'best-digital-products-for-online-entrepreneurs',
'Our picks for the most useful digital products for people building an online business.',
'# Best Digital Products for Online Entrepreneurs

Building an online business is easier with the right tools. Here are categories worth investing in.

## Courses
A good course can save you months of trial and error.

## Templates
Templates give you a head start on documents and systems.

## Software
The right software automates busywork so you can focus on growth.

> This article contains affiliate links. Everything Store may earn a commission if you purchase through one of our links.',
'https://images.pexels.com/photos/4968391/pexels-photo-4968391.jpeg?auto=compress&cs=tinysrgb&w=1200',
'Online Business', 'Everything Store Team', '["digital products","entrepreneurs"]', '[]',
'Best Digital Products for Online Entrepreneurs | Everything Store', 'Our picks for useful digital products for online entrepreneurs.',
true, now() - interval '5 days', now() - interval '5 days')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (title, slug, excerpt, content, featured_image, category, author, tags, related_products, seo_title, seo_description, published, published_at, created_at)
VALUES
('Best AI Tools for Small Businesses', 'best-ai-tools-for-small-businesses',
'Affordable AI tools that help small businesses do more with less.',
'# Best AI Tools for Small Businesses

Small businesses can benefit enormously from AI. Here are tools that punch above their weight.

## Customer Support
AI chatbots can handle common questions 24/7.

## Marketing
Generate campaigns and social posts in minutes.

## Operations
Automate scheduling, invoicing and reporting.

> This article contains affiliate links. Everything Store may earn a commission if you purchase through one of our links.',
'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1200',
'AI Tools', 'Everything Store Team', '["ai","small business"]', '[]',
'Best AI Tools for Small Businesses | Everything Store', 'Affordable AI tools that help small businesses do more with less.',
true, now() - interval '7 days', now() - interval '7 days')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (title, slug, excerpt, content, featured_image, category, author, tags, related_products, seo_title, seo_description, published, published_at, created_at)
VALUES
('How to Choose the Right Online Course', 'how-to-choose-the-right-online-course',
'A practical framework for picking an online course that is actually worth your time and money.',
'# How to Choose the Right Online Course

Not all courses are created equal. Here is how to evaluate one before you buy.

## Check the Instructor
Look for real-world experience and verifiable results.

## Read Reviews
Pay attention to detailed reviews, not just star ratings.

## Look for a Guarantee
A money-back guarantee shows the creator stands behind the course.

> This article contains affiliate links. Everything Store may earn a commission if you purchase through one of our links.',
'https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?auto=compress&cs=tinysrgb&w=1200',
'Tutorials', 'Everything Store Team', '["courses","education"]', '[]',
'How to Choose the Right Online Course | Everything Store', 'A practical framework for picking a worthwhile online course.',
true, now() - interval '9 days', now() - interval '9 days')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (title, slug, excerpt, content, featured_image, category, author, tags, related_products, seo_title, seo_description, published, published_at, created_at)
VALUES
('Best Software Tools for Freelancers', 'best-software-tools-for-freelancers',
'Essential software tools every freelancer should consider in 2026.',
'# Best Software Tools for Freelancers

Freelancing means wearing many hats. The right software makes each hat lighter.

## Project Management
Keep clients and deadlines organized.

## Invoicing
Get paid on time with professional invoices.

## Time Tracking
Know exactly how long tasks take so you can price your work.

> This article contains affiliate links. Everything Store may earn a commission if you purchase through one of our links.',
'https://images.pexels.com/photos/3781338/pexels-photo-3781338.jpeg?auto=compress&cs=tinysrgb&w=1200',
'Software', 'Everything Store Team', '["software","freelancers"]', '[]',
'Best Software Tools for Freelancers | Everything Store', 'Essential software tools every freelancer should consider.',
true, now() - interval '12 days', now() - interval '12 days')
ON CONFLICT (slug) DO NOTHING;
