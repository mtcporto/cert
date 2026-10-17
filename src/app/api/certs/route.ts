import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const result = await db.execute(`
      SELECT domain, grade, status, validity_days, expiry_date, issuer, checked_at
      FROM certificate_checks
      ORDER BY checked_at DESC
      LIMIT 100
    `);
    const checks = result.rows.map((row: any) => ({
      domain: row.domain as string,
      grade: row.grade as string,
      status: row.status as string,
      validityDays: row.validity_days as number | null,
      expiryDate: row.expiry_date as string | null,
      issuer: row.issuer as string | null,
      checkedAt: row.checked_at as string,
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

    await db.execute(
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
