-- ═══════════════════════════════════════════════
-- DEHOT — Supabase Table Creation Script
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- Users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  name text NOT NULL,
  password text NOT NULL,
  avatar text,
  bio text,
  city text,
  district text,
  region text,
  role text DEFAULT 'BOTH',
  latitude float8,
  longitude float8,
  "fcmToken" text,
  "isVerified" bool DEFAULT false,
  "isActive" bool DEFAULT true,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  icon text,
  color text,
  "sortOrder" int DEFAULT 0
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  "categoryId" uuid REFERENCES categories(id),
  "sellerId" uuid REFERENCES users(id),
  "basePrice" float8 NOT NULL,
  unit text NOT NULL,
  "availableQty" int NOT NULL,
  "isOrganic" bool DEFAULT false,
  "isFresh" bool DEFAULT false,
  location text,
  district text,
  region text,
  status text DEFAULT 'ACTIVE',
  "viewCount" int DEFAULT 0,
  "clickCount" int DEFAULT 0,
  "isVip" bool DEFAULT false,
  "vipUntil" timestamptz,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- Product Images
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" uuid REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  "isMain" bool DEFAULT false,
  "sortOrder" int DEFAULT 0
);

-- Wholesale Tiers
CREATE TABLE IF NOT EXISTS wholesale_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" uuid REFERENCES products(id) ON DELETE CASCADE,
  "minQty" int NOT NULL,
  "maxQty" int,
  price float8 NOT NULL
);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid REFERENCES users(id) ON DELETE CASCADE,
  "productId" uuid REFERENCES products(id) ON DELETE CASCADE,
  "createdAt" timestamptz DEFAULT now(),
  UNIQUE("userId", "productId")
);

-- Chats
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "buyerId" uuid REFERENCES users(id),
  "sellerId" uuid REFERENCES users(id),
  "productId" uuid REFERENCES products(id),
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "chatId" uuid REFERENCES chats(id) ON DELETE CASCADE,
  "senderId" uuid REFERENCES users(id),
  text text NOT NULL,
  "isRead" bool DEFAULT false,
  "createdAt" timestamptz DEFAULT now()
);

-- Banners
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  subtitle text,
  "imageUrl" text,
  "linkType" text DEFAULT 'none',
  "linkValue" text,
  "isActive" bool DEFAULT true,
  "sortOrder" int DEFAULT 0,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- Product Views
CREATE TABLE IF NOT EXISTS product_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" uuid REFERENCES products(id) ON DELETE CASCADE,
  "viewerKey" text NOT NULL,
  "createdAt" timestamptz DEFAULT now(),
  UNIQUE("productId", "viewerKey")
);

-- Disable RLS on all tables (backend handles auth)
ALTER TABLE users          DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories     DISABLE ROW LEVEL SECURITY;
ALTER TABLE products       DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_tiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE favorites      DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats          DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages       DISABLE ROW LEVEL SECURITY;
ALTER TABLE banners        DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_views  DISABLE ROW LEVEL SECURITY;
