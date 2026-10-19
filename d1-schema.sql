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
CREATE INDEX IF NOT EXISTS idx_cert_checks_domain_id ON certificate_checks(domain, id DESC);
CREATE INDEX IF NOT EXISTS idx_cert_checks_domain_checked ON certificate_checks(domain, checked_at DESC);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  dedup_key TEXT NOT NULL UNIQUE,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_domain ON events(domain);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);


