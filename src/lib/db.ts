import { createClient } from "@libsql/client";

// ============================================================
// Storage em memória para desenvolvimento local (fallback)
// Em produção (Vercel + Turso), usa libsql client real
// ============================================================
let memoryDomains: Map<string, { domain: string; isActive: boolean; createdAt: string; updatedAt: string }> = new Map();
let memoryChecks: Array<any> = [];

function mockExecute(sql: string, params?: any[]) {
  const s = sql.trim().replace(/\s+/g, " ").toUpperCase();

  if (s.startsWith("CREATE TABLE") || s.startsWith("CREATE INDEX")) {
    return { rows: [], rowsAffected: 0 };
  }

  if (s.startsWith("DELETE FROM domains")) {
    memoryDomains.clear();
    return { rows: [], rowsAffected: 0 };
  }

  if (s.startsWith("INSERT INTO domains")) {
    const domain = params?.[0];
    if (domain) {
      const now = new Date().toISOString();
      memoryDomains.set(String(domain), {
        domain: String(domain),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { rows: [], rowsAffected: 1 };
  }

  if (s.includes("FROM domains") && s.includes("is_active")) {
    const rows = Array.from(memoryDomains.values()).map((d) => ({
      domain: d.domain,
      is_active: d.isActive ? 1 : 0,
      created_at: d.createdAt,
      updated_at: d.updatedAt,
    }));
    return { rows, rowsAffected: rows.length };
  }

  if (s.startsWith("INSERT INTO certificate_checks")) {
    const check = {
      domain: params?.[0],
      grade: params?.[1],
      status: params?.[2],
      validity_days: params?.[3],
      expiry_date: params?.[4],
      issuer: params?.[5],
      total_validity_days: params?.[6],
      percent_remaining: params?.[7],
      raw_response: params?.[8],
      checked_at: new Date().toISOString(),
    };
    memoryChecks.push(check);
    return { rows: [], rowsAffected: 1 };
  }

  if (s.includes("FROM certificate_checks")) {
    const limitMatch = s.match(/LIMIT\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 100;
    const rows = memoryChecks
      .slice()
      .reverse()
      .slice(0, limit)
      .map((c) => ({
        domain: c.domain,
        grade: c.grade,
        status: c.status,
        validity_days: c.validity_days,
        expiry_date: c.expiry_date,
        issuer: c.issuer,
        checked_at: c.checked_at,
      }));
    return { rows, rowsAffected: rows.length };
  }

  return { rows: [], rowsAffected: 0 };
}

function createDbClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url && authToken) {
    return createClient({ url, authToken });
  }

  return {
    execute: async (sql: string, params?: any[]) => mockExecute(sql, params),
  } as any;
}

export async function initDb() {
  const db = createDbClient();

  // Cada statement executado separadamente (libsql não aceita múltiplos)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
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
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_cert_checks_domain ON certificate_checks(domain)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_cert_checks_checked_at ON certificate_checks(checked_at)
  `);
}

export async function query(sql: string, params?: any[]) {
  const db = createDbClient();
  return db.execute(sql, params);
}

export type DbClient = ReturnType<typeof createDbClient>;
