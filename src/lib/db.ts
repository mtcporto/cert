import { createClient, type Client } from "@libsql/client";

// ============================================================
// Storage em memória para desenvolvimento local (fallback)
// Em produção (Vercel + Turso), usa libsql client real
// ============================================================
const memoryDomains: Map<
  string,
  { domain: string; isActive: boolean; createdAt: string; updatedAt: string }
> = new Map();
const memoryChecks: Array<any> = [];

function mockExecute(sql: string, params?: any[]) {
  const s = sql.trim().replace(/\s+/g, " ").toUpperCase();

  if (s.startsWith("CREATE TABLE") || s.startsWith("CREATE INDEX")) {
    return { rows: [], rowsAffected: 0 };
  }

  if (s.startsWith("DELETE FROM DOMAINS")) {
    memoryDomains.clear();
    return { rows: [], rowsAffected: 0 };
  }

  if (s.startsWith("INSERT INTO DOMAINS")) {
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

  if (s.includes("FROM DOMAINS") && s.includes("IS_ACTIVE")) {
    const rows = Array.from(memoryDomains.values()).map((d) => ({
      domain: d.domain,
      is_active: d.isActive ? 1 : 0,
      created_at: d.createdAt,
      updated_at: d.updatedAt,
    }));
    return { rows, rowsAffected: rows.length };
  }

  if (s.startsWith("INSERT INTO CERTIFICATE_CHECKS")) {
    const check = {
      domain: params?.[0],
      grade: params?.[1],
      status: params?.[2],
      validity_days: params?.[3],
      expiry_date: params?.[4],
      issuer: params?.[5],
      total_validity_days: params?.[6],
      percent_remaining: params?.[7],
      next_check_at: params?.[8],
      raw_response: params?.[9],
      checked_at: new Date().toISOString(),
    };
    memoryChecks.push(check);
    return { rows: [], rowsAffected: 1 };
  }

  if (s.includes("FROM CERTIFICATE_CHECKS")) {
    const domainMatch = s.match(/WHERE\s+DOMAIN\s*=\s*\?/i);
    if (domainMatch) {
      const domainParam = params?.[0];
      const filtered = memoryChecks.filter((c) => c.domain === domainParam);
      const limitMatch = s.match(/LIMIT\s+(\d+)/i);
      const limit = limitMatch ? parseInt(limitMatch[1]) : 1;
      const rows = filtered
        .slice()
        .reverse()
        .slice(0, limit)
        .map((c) => ({ ...c }));
      return { rows, rowsAffected: rows.length };
    }

    // Caso seja busca do último check por domínio (GROUP BY domain)
    if (s.includes("GROUP BY DOMAIN")) {
      const latestByDomain = new Map<string, any>();
      for (const c of memoryChecks) {
        latestByDomain.set(c.domain, { ...c });
      }
      const rows = Array.from(latestByDomain.values()).reverse();
      return { rows, rowsAffected: rows.length };
    }

    const limitMatch = s.match(/LIMIT\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 100;
    const rows = memoryChecks
      .slice()
      .reverse()
      .slice(0, limit)
      .map((c) => ({ ...c }));
    return { rows, rowsAffected: rows.length };
  }

  return { rows: [], rowsAffected: 0 };
}

let cachedTursoClient: Client | null = null;
let initPromise: Promise<void> | null = null;

function getTursoClient(): Client | null {
  if (cachedTursoClient) return cachedTursoClient;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url && authToken) {
    cachedTursoClient = createClient({ url, authToken });
    return cachedTursoClient;
  }
  return null;
}

function createDbClient() {
  const tursoClient = getTursoClient();

  if (tursoClient) {
    return {
      execute: async (sql: string, params?: any[]) => {
        try {
          return await tursoClient.execute({ sql, args: params ?? [] });
        } catch (error) {
          console.error("Turso error, falling back to memory:", error);
          return mockExecute(sql, params);
        }
      },
    };
  }

  return {
    execute: async (sql: string, params?: any[]) => mockExecute(sql, params),
  };
}

export async function initDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const turso = getTursoClient();
    if (turso) {
      try {
        await turso.batch(
          [
            `CREATE TABLE IF NOT EXISTS domains (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              domain TEXT NOT NULL UNIQUE,
              is_active INTEGER DEFAULT 1,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS certificate_checks (
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
            )`,
            `CREATE INDEX IF NOT EXISTS idx_cert_checks_domain ON certificate_checks(domain)`,
            `CREATE INDEX IF NOT EXISTS idx_cert_checks_next_check ON certificate_checks(next_check_at)`,
            `CREATE INDEX IF NOT EXISTS idx_cert_checks_checked_at ON certificate_checks(checked_at)`,
          ],
          "write"
        );
        return;
      } catch (err) {
        console.error("Failed batch initDb on Turso:", err);
        initPromise = null;
      }
    }
  })();

  return initPromise;
}

export async function query(sql: string, params?: any[]) {
  const db = createDbClient();
  return db.execute(sql, params);
}

export type DbClient = ReturnType<typeof createDbClient>;

