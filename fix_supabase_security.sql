-- =========================================================================
-- CEFI E-Commerce: Supabase Security Fixes (RLS & Storage Policies)
-- Copy and paste this script into your Supabase Dashboard -> SQL Editor -> Run
-- =========================================================================

-- 1. Remove all old/conflicting policies automatically
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', pol.policyname);
    END LOOP;

    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.categories', pol.policyname);
    END LOOP;

    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- 2. Enable Row Level Security (RLS) on tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 3. Products Table RLS Policies:
-- Public can read products
CREATE POLICY "Public Read Products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (true);

-- Authenticated users (logged-in admins) can insert/update/delete products
CREATE POLICY "Authenticated Insert Products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated Update Products"
ON public.products
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated Delete Products"
ON public.products
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 4. Categories Table RLS Policies:
-- Public can read categories
CREATE POLICY "Public Read Categories"
ON public.categories
FOR SELECT
TO anon, authenticated
USING (true);

-- Authenticated users (logged-in admins) can insert/update/delete categories
CREATE POLICY "Authenticated Insert Categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated Update Categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated Delete Categories"
ON public.categories
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 5. Storage Policies for 'product-images' Bucket
UPDATE storage.buckets 
SET public = true 
WHERE id = 'product-images';

CREATE POLICY "Authenticated Upload Product Images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated Update Product Images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated Delete Product Images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);


