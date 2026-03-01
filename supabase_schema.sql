
-- SQL Schema for Supabase Configuration

-- 1. App State Table (Used for full state synchronization)
CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert initial empty state if not exists
INSERT INTO app_state (id, content)
VALUES (1, '{}')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

-- Create public access policies
CREATE POLICY "Public Read App State" ON app_state FOR SELECT USING (true);
CREATE POLICY "Public All App State" ON app_state FOR ALL USING (true);

-- 2. Storage Bucket for Images
-- Note: You must create a bucket named 'reward-images' in the Supabase Storage dashboard
-- and set its access to 'Public'.

-- 3. Structured Tables (Optional, for future granular use)

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  roles TEXT[] NOT NULL,
  capabilities TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0,
  donatable_gold INTEGER DEFAULT 0,
  donatable_silver INTEGER DEFAULT 0,
  donatable_bronze INTEGER DEFAULT 0
);

-- Reward Items Table
CREATE TABLE IF NOT EXISTS reward_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cost INTEGER NOT NULL,
  stock INTEGER DEFAULT 0,
  category TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  amount INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  item_id UUID REFERENCES reward_items(id),
  status TEXT NOT NULL,
  total_cost INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Config Table (Single row)
CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  currency_name TEXT DEFAULT 'tampinhas',
  conversion_rate INTEGER DEFAULT 1,
  donation_limit INTEGER DEFAULT 500
);

-- Insert initial config
INSERT INTO config (id, currency_name, conversion_rate, donation_limit)
VALUES (1, 'tampinhas', 1, 500)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Create public access policies (for demo purposes, restrict in production)
CREATE POLICY "Public Read Users" ON users FOR SELECT USING (true);
CREATE POLICY "Public Read Wallets" ON wallets FOR SELECT USING (true);
CREATE POLICY "Public Read Items" ON reward_items FOR SELECT USING (true);
CREATE POLICY "Public Read Transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Public Read Orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Public Read Logs" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "Public Read Config" ON config FOR SELECT USING (true);

-- Allow all operations for now (for demo purposes)
CREATE POLICY "Public All Users" ON users FOR ALL USING (true);
CREATE POLICY "Public All Wallets" ON wallets FOR ALL USING (true);
CREATE POLICY "Public All Items" ON reward_items FOR ALL USING (true);
CREATE POLICY "Public All Transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Public All Orders" ON orders FOR ALL USING (true);
CREATE POLICY "Public All Logs" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Public All Config" ON config FOR ALL USING (true);
