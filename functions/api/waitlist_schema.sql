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
