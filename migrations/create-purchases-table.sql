-- ABUZ8 LLC — Cloudflare D1 Migration
-- Run: wrangler d1 execute abuz8_waitlist --file=migrations/create-purchases-table.sql
-- Purpose: Tracks Stripe purchases for auto-delivery and analytics

CREATE TABLE IF NOT EXISTS purchases (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT    NOT NULL,
  price_id    TEXT    NOT NULL DEFAULT '',
  session_id  TEXT    UNIQUE,
  product     TEXT    NOT NULL DEFAULT '',
  delivered   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_purchases_email     ON purchases(email);
CREATE INDEX IF NOT EXISTS idx_purchases_price_id  ON purchases(price_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created   ON purchases(created_at);

CREATE VIEW IF NOT EXISTS revenue_by_product AS
SELECT
  price_id,
  COUNT(*)       AS total_sales,
  SUM(delivered) AS delivered_count,
  MIN(created_at) AS first_sale,
  MAX(created_at) AS last_sale
FROM purchases
GROUP BY price_id
ORDER BY total_sales DESC;
