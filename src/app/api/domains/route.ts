import { NextResponse } from "next/server";
import { initDb, query } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const result = await query(
      "SELECT domain, is_active, created_at, updated_at FROM domains WHERE is_active = 1 ORDER BY created_at DESC"
    );
    const rows: any[] = result.rows as any[];
    const domains = rows.map((row) => ({
      domain: row.domain,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    return NextResponse.json({ domains });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao buscar domínios", detail: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await initDb();
    const body = await req.json();
    const { domains } = body;

    if (!Array.isArray(domains)) {
      return NextResponse.json(
        { error: "Expected an array of domains" },
        { status: 400 }
      );
    }

    const uniqueDomains = Array.from(
      new Set(
        domains
          .map((d: any) => String(d).trim().toLowerCase())
          .filter(Boolean)
      )
    );

    await query("DELETE FROM domains");

    await Promise.all(
      uniqueDomains.map((domain) =>
        query("INSERT INTO domains (domain, is_active) VALUES (?, 1)", [domain])
      )
    );

    return NextResponse.json({ domains: uniqueDomains });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao salvar domínios", detail: error.message },
      { status: 500 }
    );
  }
}

