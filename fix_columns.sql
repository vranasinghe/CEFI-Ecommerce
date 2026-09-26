-- Add missing columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_g INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INT DEFAULT 100;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
