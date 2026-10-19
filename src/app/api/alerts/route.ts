import { NextResponse } from "next/server";
import { initDb, query } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const result = await query(`
      SELECT domain, grade, status, validity_days, checked_at
      FROM certificate_checks
      ORDER BY checked_at DESC
      LIMIT 100
    `);
    const rows: any[] = result.rows as any[];
    const seen = new Set<string>();
    const alerts: Array<{
      id: string;
      domain: string;
      type: "error" | "warning" | "info";
      message: string;
    }> = [];

    for (const row of rows) {
      if (seen.has(row.domain)) continue;
      seen.add(row.domain);

      if (row.status === "expired" || (row.validity_days !== null && row.validity_days < 0)) {
        alerts.push({
          id: `expired-${row.domain}`,
          domain: row.domain,
          type: "error",
          message: "Certificado SSL expirado! Renovação imediata necessária.",
        });
      } else if (
        row.status === "expiring_soon" ||
        (row.validity_days !== null && row.validity_days <= 30)
      ) {
        alerts.push({
          id: `expiring-${row.domain}`,
          domain: row.domain,
          type: "warning",
          message: `Certificado expira em ${row.validity_days} dia(s).`,
        });
      } else if (row.status === "error") {
        alerts.push({
          id: `error-${row.domain}`,
          domain: row.domain,
          type: "error",
          message: "Falha na validação do certificado SSL.",
        });
      }
    }

    return NextResponse.json({ alerts });
  } catch {
    return NextResponse.json({ alerts: [] });
  }
}

