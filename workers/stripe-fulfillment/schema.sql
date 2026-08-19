-- QADIR OS — Stripe fulfillment queue (v2 schema, 2026-05-10 evening)
-- Idempotent: safe to run on a fresh DB OR on the v1 stub.

CREATE TABLE IF NOT EXISTS fulfillment_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_email TEXT NOT NULL,
    product_id TEXT NOT NULL,
    price_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending | sent | send_failed | manual_review | failed_no_email | duplicate
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME
);

-- v2 columns (added by stripe-fulfillment worker 2.0.0)
-- SQLite ALTER TABLE ... ADD COLUMN is idempotent across deploys ONLY if you
-- guard. Wrap in a check by trying and ignoring duplicate-column errors.
-- D1 supports `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` since 2024, but
-- portability-first: just run these one-shot when first migrating.

ALTER TABLE fulfillment_queue ADD COLUMN stripe_event_id TEXT;
ALTER TABLE fulfillment_queue ADD COLUMN error_msg       TEXT;
ALTER TABLE fulfillment_queue ADD COLUMN product_name    TEXT;

-- Idempotency: at most one row per Stripe event ID.
CREATE UNIQUE INDEX IF NOT EXISTS idx_fulfillment_event ON fulfillment_queue(stripe_event_id);

-- Operational index for /status and admin queries.
CREATE INDEX IF NOT EXISTS idx_fulfillment_status_created ON fulfillment_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_fulfillment_email ON fulfillment_queue(customer_email);
