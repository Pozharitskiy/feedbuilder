-- FeedBuilderly Supabase Schema
-- Run this SQL in your Supabase SQL Editor to create all required tables

-- Sessions table for Shopify OAuth
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_shop ON sessions(shop);

-- Feed cache table
CREATE TABLE IF NOT EXISTS feed_cache (
  id SERIAL PRIMARY KEY,
  shop TEXT NOT NULL,
  format TEXT NOT NULL,
  content TEXT NOT NULL,
  products_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop, format)
);

CREATE INDEX IF NOT EXISTS idx_feed_cache_shop_format ON feed_cache(shop, format);

-- Subscriptions table for billing
CREATE TABLE IF NOT EXISTS subscriptions (
  shop TEXT PRIMARY KEY,
  plan_name TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  charge_id TEXT,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies (allow service role full access)
CREATE POLICY "Enable all access for service role" ON sessions
  FOR ALL USING (true);

CREATE POLICY "Enable all access for service role" ON feed_cache
  FOR ALL USING (true);

CREATE POLICY "Enable all access for service role" ON subscriptions
  FOR ALL USING (true);

-- Create functions for initial setup (optional, for backward compatibility)
CREATE OR REPLACE FUNCTION create_sessions_table()
RETURNS void AS $$
BEGIN
  -- Table already exists from above
  NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_feed_cache_table()
RETURNS void AS $$
BEGIN
  -- Table already exists from above
  NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_subscriptions_table()
RETURNS void AS $$
BEGIN
  -- Table already exists from above
  NULL;
END;
$$ LANGUAGE plpgsql;

