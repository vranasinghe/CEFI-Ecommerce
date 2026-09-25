-- Create Products Table
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  full_description TEXT,
  price NUMERIC DEFAULT 0.00,
  category_slug TEXT,
  category_name TEXT,
  origin TEXT,
  weight TEXT,
  is_wholesale_only BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  images TEXT[] DEFAULT '{}',
  variants JSONB DEFAULT '{"type": [], "size": []}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Categories Table
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Categories
INSERT INTO categories (name, slug, description) VALUES
('Tea', 'tea', 'Premium Ceylon Teas'),
('Herbal', 'herbal', 'Natural Herbal Remedies'),
('Spices', 'spices', 'Authentic Ceylon Spices'),
('Fruits', 'fruits', 'Fresh & Dried Fruits'),
('Vegetables', 'vegetables', 'Organic Vegetables');

-- Create storage bucket for images (if you haven't created it manually)
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT DO NOTHING;

-- Security: Enable Row Level Security (RLS) on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to product-images bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'product-images' );

-- No insert/update/delete policies on purpose: only the backend writes images,
-- using the service-role key (which bypasses RLS) after checking admin role.
-- A policy "TO authenticated" would let any signed-up customer replace them.

-- Catalogue tables: public read, no browser writes (see fix_supabase_security.sql).
ALTER TABLE products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Products"   ON products   FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read Categories" ON categories FOR SELECT TO anon, authenticated USING (true);
