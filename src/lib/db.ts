import { createClient } from "@libsql/client";

export function createDbClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  // Se não houver variáveis de Turso, usa SQLite local (desenvolvimento)
  if (!url || !authToken) {
    const { createClient: createLocalClient } = require("@libsql/client");
    return createLocalClient({
      url: process.env.DATABASE_URL || "file:./local.db",
    });
  }

  return createClient({ url, authToken });
}

export const db = createDbClient();

export async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
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
      raw_response TEXT,
      checked_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_cert_checks_domain ON certificate_checks(domain);
    CREATE INDEX IF NOT EXISTS idx_cert_checks_checked_at ON certificate_checks(checked_at);
  `);
}

export type DbClient = ReturnType<typeof createDbClient>;
