-- ABUZ8 Life Hub — SaaS tables. Run ONCE in Cloudflare D1 console
-- (Pages → D1 → abuz8_waitlist → Console) or:
--   wrangler d1 execute abuz8_waitlist --file=functions/api/desk-schema.sql
-- Idempotent: every statement is IF NOT EXISTS. Safe to re-run.
-- ABUZ8 LLC — 2026 · support@abuz8ai.com

-- Already exists from waitlist_schema.sql; repeated here so this file is standalone.
CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  product TEXT,
  referrer TEXT,
  ip TEXT,
  country TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(email, product)
);
CREATE INDEX IF NOT EXISTS idx_waitlist_product ON waitlist(product);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist(created_at);

-- One row per login identity. Plan is derived from entitlements, not this table.
CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);

-- Single-use magic-link tokens. Swept on every auth request.
CREATE TABLE IF NOT EXISTS magic_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_magic_email ON magic_tokens(email);
CREATE INDEX IF NOT EXISTS idx_magic_expires ON magic_tokens(expires);

-- Their connected life: AI subs, calendars, contacts, social, money, systems.
CREATE TABLE IF NOT EXISTS connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  detail TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conn_email ON connections(email);

-- Paid hub access. Written ONLY by stripe-webhook (never by hand, never by the client).
CREATE TABLE IF NOT EXISTS entitlements (
  email TEXT PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'hub',
  status TEXT NOT NULL DEFAULT 'active',
  stripe_customer TEXT,
  stripe_sub TEXT,
  updated_at INTEGER NOT NULL
);

-- Nightly board snapshots written by /api/refresh (cron). The desk reads these;
-- the public boards keep their live endpoints. Never hand-edited.
CREATE TABLE IF NOT EXISTS snapshots (
  key TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  ts INTEGER NOT NULL
);
