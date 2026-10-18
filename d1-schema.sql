CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL UNIQUE,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS certificate_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL,
  grade TEXT,
  status TEXT,
  validity_days INTEGER,
  expiry_date TEXT,
  issuer TEXT,
  total_validity_days INTEGER,
  percent_remaining INTEGER,
  next_check_at TEXT,
  raw_response TEXT,
  checked_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cert_checks_domain ON certificate_checks(domain);
CREATE INDEX IF NOT EXISTS idx_cert_checks_next_check ON certificate_checks(next_check_at);
