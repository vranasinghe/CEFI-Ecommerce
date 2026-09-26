-- =========================================================================
-- CEFI E-Commerce: Supabase Security Lock-down (RLS & Storage Policies)
-- Copy and paste this script into your Supabase Dashboard -> SQL Editor -> Run
--
-- Model: the browser (anon key, or a signed-in customer's token) may only
-- READ the catalogue. Every write goes through the Express API, which checks
-- the admin role and talks to Supabase with the SERVICE-ROLE key — that key
-- bypasses RLS, so no write policies are needed (or wanted) here.
--
-- BEFORE RUNNING: set SUPABASE_SERVICE_ROLE_KEY on the backend (Vercel ->
-- Project -> Settings -> Environment Variables) and redeploy. If the backend
-- is still on the anon key, admin saves will fail once this script runs.
--
-- Safe to re-run.
-- =========================================================================

-- 1. RLS on. With RLS off, the public anon key can write to the table.
ALTER TABLE public.products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 2. Remove every existing policy on the two catalogue tables (old versions of
--    this script let any signed-in customer insert/update/delete).
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies
                WHERE schemaname = 'public' AND tablename IN ('products', 'categories')) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. Read-only access for the storefront.
CREATE POLICY "Public Read Products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public Read Categories"
ON public.categories
FOR SELECT
TO anon, authenticated
USING (true);

-- 4. 'product-images' bucket: public for viewing, written only by the backend.
--    Only the product-image policies are dropped; other buckets are untouched.
UPDATE storage.buckets
SET public = true
WHERE id = 'product-images';

DROP POLICY IF EXISTS "Authenticated Upload Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- 5. Older tables from backend/schema.sql. The app never reads or writes these
--    from the browser, so turn RLS on and add NO policies: the public anon key
--    and signed-in customers get nothing; the backend's service-role key still
--    works. Skips any table that does not exist in your project.
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['contact_messages', 'newsletter_subscribers', 'quote_requests', 'order_items'] LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        END IF;
    END LOOP;
END $$;

-- 6. Verify: every table listed should show rowsecurity = true, and the only
--    policies listed should be the "Public Read" SELECT policies (plus the
--    storage "Public Access" one). There must be NO INSERT/UPDATE/DELETE
--    policy for authenticated or anon anywhere.
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('products', 'categories', 'contact_messages', 'newsletter_subscribers', 'quote_requests', 'order_items');

SELECT tablename, policyname, cmd, roles FROM pg_policies
WHERE (schemaname = 'public' AND tablename IN ('products', 'categories'))
   OR (schemaname = 'storage' AND tablename = 'objects');
