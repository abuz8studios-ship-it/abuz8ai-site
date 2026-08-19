CREATE TABLE IF NOT EXISTS signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool TEXT NOT NULL,
  email TEXT NOT NULL,
  meta TEXT,
  ip TEXT,
  ua TEXT,
  ts TEXT NOT NULL,
  UNIQUE(tool, email)
);
CREATE INDEX IF NOT EXISTS idx_signups_email ON signups(email);
CREATE INDEX IF NOT EXISTS idx_signups_tool ON signups(tool);
CREATE INDEX IF NOT EXISTS idx_signups_ts ON signups(ts);
