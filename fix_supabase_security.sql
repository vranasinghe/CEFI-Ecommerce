-- =========================================================================
-- CEFI E-Commerce: Supabase Security Fixes (RLS & Storage Policies)
-- Copy and paste this script into your Supabase Dashboard -> SQL Editor -> Run
-- =========================================================================

-- 1. Enable Row Level Security (RLS) on tables (Resolves Critical RLS Errors)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 2. Drop old / conflicting policies if they exist
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
DROP POLICY IF EXISTS "Allow All Products Access" ON public.products;
DROP POLICY IF EXISTS "Admin Full Access Products" ON public.products;
DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;
DROP POLICY IF EXISTS "Allow All Categories Access" ON public.categories;
DROP POLICY IF EXISTS "Admin Full Access Categories" ON public.categories;

-- 3. Products Table RLS Policies:
-- Allow anyone to view products on storefront
CREATE POLICY "Public Read Products"
ON public.products
FOR SELECT
TO public
USING (true);

-- Allow full insert/update/delete permissions for catalog management
CREATE POLICY "Admin Full Access Products"
ON public.products
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 4. Categories Table RLS Policies:
-- Allow anyone to view categories on storefront
CREATE POLICY "Public Read Categories"
ON public.categories
FOR SELECT
TO public
USING (true);

-- Allow full insert/update/delete permissions for category management
CREATE POLICY "Admin Full Access Categories"
ON public.categories
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 5. Fix Storage Policies for 'product-images' Bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Product Images" ON storage.objects;

-- Allow public read access to images in product-images bucket
CREATE POLICY "Public Read Product Images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Allow uploading images into product-images bucket
CREATE POLICY "Public Upload Product Images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'product-images');

-- Allow updating images in product-images bucket
CREATE POLICY "Public Update Product Images"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'product-images');

-- Allow deleting images in product-images bucket
CREATE POLICY "Public Delete Product Images"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'product-images');
