import { NextResponse } from "next/server";
import { initDb, query } from "@/lib/db";
import { parseSslLabsDetails } from "@/lib/utils";

function calcNextCheckAt(validityDays: number | null, status: string): string | null {
  const now = new Date();
  let daysToAdd: number;

  if (status === "expired" || status === "pending") {
    daysToAdd = 0; // verificar imediatamente
  } else if (status === "error" || status === "timeout") {
    daysToAdd = 1; // tentar de novo em 1 dia
  } else if (validityDays !== null && validityDays !== undefined) {
    if (validityDays <= 30) {
      daysToAdd = 1; // expirando em breve: verificar todo dia
    } else if (validityDays <= 90) {
      daysToAdd = 3; // validade média: verificar a cada 3 dias
    } else {
      daysToAdd = 7; // validade longa: verificar uma vez por semana (check de segurança)
    }
  } else {
    daysToAdd = 7;
  }

  const next = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return next.toISOString();
}

function mapCheckRow(row: any) {
  const parsed = parseSslLabsDetails(row.raw_response);
  return {
    domain: row.domain,
    grade: row.grade,
    status: row.status,
    validityDays: row.validity_days,
    expiryDate: row.expiry_date,
    issuer: row.issuer,
    totalValidityDays: row.total_validity_days,
    percentRemaining: row.percent_remaining,
    nextCheckAt: row.next_check_at,
    checkedAt: row.checked_at,
    rawResponse: row.raw_response,
    protocols: parsed.protocols,
    vulnerabilities: parsed.vulnerabilities,
  };
}

export async function GET(req: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain");

    if (domain) {
      // Buscar o check mais recente de um domínio específico
      const result = await query(
        `SELECT domain, grade, status, validity_days, expiry_date, issuer, total_validity_days, percent_remaining, next_check_at, raw_response, checked_at
         FROM certificate_checks
         WHERE domain = ?
         ORDER BY checked_at DESC
         LIMIT 1`,
        [domain]
      );
      const rows: any[] = result.rows as any[];
      if (rows.length === 0) {
        return NextResponse.json({ check: null });
      }
      return NextResponse.json({
        check: mapCheckRow(rows[0]),
      });
    }

    // Listagem geral
    const result = await query(`
      SELECT domain, grade, status, validity_days, expiry_date, issuer, total_validity_days, percent_remaining, next_check_at, raw_response, checked_at
      FROM certificate_checks
      ORDER BY checked_at DESC
      LIMIT 100
    `);
    const rows: any[] = result.rows as any[];
    const checks = rows.map(mapCheckRow);
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

    const nextCheckAt = calcNextCheckAt(validityDays ?? null, status);

    await query(
      `INSERT INTO certificate_checks
       (domain, grade, status, validity_days, expiry_date, issuer, total_validity_days, percent_remaining, next_check_at, raw_response)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        domain,
        grade ?? null,
        status,
        validityDays ?? null,
        expiryDate ?? null,
        issuer ?? null,
        totalValidityDays ?? null,
        percentRemaining ?? null,
        nextCheckAt,
        rawResponse ?? null,
      ]
    );

    return NextResponse.json({ success: true, nextCheckAt });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao salvar verificação", detail: error.message },
      { status: 500 }
    );
  }
}

