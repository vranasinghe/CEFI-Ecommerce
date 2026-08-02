-- Disable RLS on the tables so your backend can freely insert/update/delete products
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
