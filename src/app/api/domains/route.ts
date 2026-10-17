import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const result = await db.execute(
      "SELECT domain, is_active, created_at, updated_at FROM domains WHERE is_active = 1 ORDER BY created_at DESC"
    );
    const domains = result.rows.map((row: any) => ({
      domain: row.domain as string,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
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

    // Limpa e insere os domínios
    await db.execute("DELETE FROM domains");

    for (const domain of domains) {
      await db.execute(
        "INSERT INTO domains (domain, is_active) VALUES (?, 1)",
        [domain]
      );
    }

    const result = await db.execute(
      "SELECT domain FROM domains WHERE is_active = 1 ORDER BY created_at DESC"
    );
    const saved = result.rows.map((row: any) => row.domain as string);

    return NextResponse.json({ domains: saved });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao salvar domínios", detail: error.message },
      { status: 500 }
    );
  }
}
