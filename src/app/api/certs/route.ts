import { NextResponse } from "next/server";
import { initDb, query } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const result = await query(`
      SELECT domain, grade, status, validity_days, expiry_date, issuer, checked_at
      FROM certificate_checks
      ORDER BY checked_at DESC
      LIMIT 100
    `);
    const rows: any[] = result.rows as any[];
    const checks = rows.map((row) => ({
      domain: row.domain,
      grade: row.grade,
      status: row.status,
      validityDays: row.validity_days,
      expiryDate: row.expiry_date,
      issuer: row.issuer,
      checkedAt: row.checked_at,
    }));
    return NextResponse.json({ checks });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao buscar verificações", detail: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await initDb();
    const body = await req.json();
    const {
      domain,
      grade,
      status,
      validityDays,
      expiryDate,
      issuer,
      totalValidityDays,
      percentRemaining,
      rawResponse,
    } = body;

    if (!domain) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }

    await query(
      `INSERT INTO certificate_checks
       (domain, grade, status, validity_days, expiry_date, issuer, total_validity_days, percent_remaining, raw_response)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        domain,
        grade ?? null,
        status,
        validityDays ?? null,
        expiryDate ?? null,
        issuer ?? null,
        totalValidityDays ?? null,
        percentRemaining ?? null,
        rawResponse ?? null,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao salvar verificação", detail: error.message },
      { status: 500 }
    );
  }
}
