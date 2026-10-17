import { NextResponse } from "next/server";

export async function GET() {
  // Em produção, esses alertas viriam do banco de dados (Turso)
  // com base nos resultados recentes (ex: certificados expirados, com erro, etc.)
  return NextResponse.json({ alerts: [] });
}
