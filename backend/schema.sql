-- Supabase / Postgres Database Schema for Ceylon Eco Fresh Infinity (CEFI)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_description TEXT NOT NULL,
  full_description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  is_wholesale_only BOOLEAN DEFAULT FALSE,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  stock_quantity INT DEFAULT 100,
  weight_g INT DEFAULT 100,
  origin TEXT DEFAULT 'Sri Lanka (Ceylon)',
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Blog Posts Table
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  cover_image TEXT,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT DEFAULT 'CEFI Editorial Team',
  read_time_min INT DEFAULT 4,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Contact Messages Table
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Wholesale Quote Requests Table
CREATE TABLE IF NOT EXISTS quote_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  estimated_quantity TEXT NOT NULL,
  target_destination TEXT,
  additional_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Orders & Order Items Tables
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  country TEXT DEFAULT 'Sri Lanka',
  total_amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'Card / PayHere',
  order_status TEXT DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL
);
