import { NextResponse } from "next/server";

const SSL_LABS_API = "https://api.ssllabs.com/api/v3/analyze";

async function fetchWithRetry(
  url: string,
  retries = 5,
  initialDelay = 3000
): Promise<any> {
  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        if (response.status === 429) {
          delay = initialDelay * Math.pow(2, attempt + 1);
          throw new Error(`Rate Limited (429)`);
        }
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      return await response.json();
    } catch (error: any) {
      lastError = error;
      if (attempt < retries) {
        const waitTime = error.message?.includes("Rate Limited")
          ? delay
          : initialDelay * (attempt + 1);
        await new Promise((r) => setTimeout(r, waitTime));
      }
    }
  }

  throw lastError || new Error("Falha após múltiplas tentativas");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const host = searchParams.get("host");
  const startNew = searchParams.get("startNew") || "off";

  if (!host) {
    return NextResponse.json({ error: "host parameter is required" }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      host,
      all: "on",
    });
    if (startNew === "on") {
      params.set("startNew", "on");
    } else {
      params.set("fromCache", "on");
      params.set("maxAge", "24");
    }
    const url = `${SSL_LABS_API}?${params.toString()}`;
    const data = await fetchWithRetry(url);

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao analisar certificado", detail: error.message },
      { status: 502 }
    );
  }
}

