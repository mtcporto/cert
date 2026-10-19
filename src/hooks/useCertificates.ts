"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { CertificateResult } from "@/types";
import {
  formatDaysRemaining,
  parseSslLabsDetails,
  parseIssuerName,
  classifyCertificateStatus,
  resolveWorstGrade,
} from "@/lib/utils";

const DEFAULT_DOMAINS: string[] = [
  "vivajoaopessoa.com",
  "kindredveil.com",
  "imobiliariapenaareia.com.br",
  "nuvemmarketing.com",
  "ride4x4.com",
];

const LOCAL_STORAGE_DOMAINS_KEY = "certmonitor_domains";

// Backend: Cloudflare Worker com D1
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://cert-ssl-api-d1.mosaicoworkers.workers.dev";

function makePendingResult(domain: string, statusText = "Aguardando análise"): CertificateResult {
  return {
    domain,
    grade: "⏳",
    status: "pending",
    statusText,
    icon: "clock",
    statusClass: "",
    validity: "Verificando...",
    checkedAt: new Date().toISOString(),
  };
}

function isCacheValid(check: any): boolean {
  const nextCheck = check?.nextCheckAt ?? check?.next_check_at;
  const status = check?.status;
  if (!nextCheck || status === "pending") return false;
  const now = Date.now();
  const next = new Date(nextCheck).getTime();
  return !Number.isNaN(next) && next > now;
}

function ensureIsoUtc(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString();
  if (dateStr.includes("T")) return dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`;
  return `${dateStr.replace(" ", "T")}Z`;
}

function mapCachedCheckToResult(check: any): CertificateResult {
  const validityDays: number | undefined =
    check.validityDays ?? check.validity_days ?? undefined;
  const expiryDate: string | undefined =
    check.expiryDate ?? check.expiry_date ?? undefined;
  const totalValidityDays: number | undefined =
    check.totalValidityDays ?? check.total_validity_days ?? undefined;
  const percentRemaining: number | undefined =
    check.percentRemaining ?? check.percent_remaining ?? undefined;
  const checkedAt: string = ensureIsoUtc(check.checkedAt ?? check.checked_at);
  const nextCheckAt: string | undefined =
    check.nextCheckAt ?? check.next_check_at ?? undefined;
  const rawResponse = check.rawResponse ?? check.raw_response;

  const parsedDetails = parseSslLabsDetails(rawResponse, check.domain);

  let protocols: string[] = [];
  if (Array.isArray(check.protocols)) {
    protocols = check.protocols;
  } else if (typeof check.protocols === "string") {
    try {
      protocols = JSON.parse(check.protocols);
    } catch {
      protocols = [];
    }
  }
  if (protocols.length === 0 && parsedDetails.protocols.length > 0) {
    protocols = parsedDetails.protocols;
  }

  let vulnerabilities: string[] = [];
  if (Array.isArray(check.vulnerabilities)) {
    vulnerabilities = check.vulnerabilities;
  } else if (typeof check.vulnerabilities === "string") {
    try {
      vulnerabilities = JSON.parse(check.vulnerabilities);
    } catch {
      vulnerabilities = [];
    }
  }
  if (vulnerabilities.length === 0 && parsedDetails.vulnerabilities.length > 0) {
    vulnerabilities = parsedDetails.vulnerabilities;
  }

  // Recalcular dias restantes em tempo real caso tenhamos expiryDate
  let currentValidityDays = validityDays;
  if (expiryDate) {
    const expiryTs = new Date(expiryDate).getTime();
    if (!Number.isNaN(expiryTs)) {
      currentValidityDays = Math.floor((expiryTs - Date.now()) / (1000 * 60 * 60 * 24));
    }
  }

  const classification = classifyCertificateStatus({
    rawStatus: check.status,
    grade: check.grade,
    validityDays: currentValidityDays,
    vulnerabilities,
  });
  const status = classification.status;
  const statusText = classification.statusText;

  return {
    domain: check.domain,
    grade: (check.grade || "N/A") as CertificateResult["grade"],
    status,
    statusText,
    icon: status === "valid" ? "check-circle" : "alert-circle",
    statusClass: "",
    validity:
      currentValidityDays !== undefined && currentValidityDays !== null
        ? formatDaysRemaining(currentValidityDays)
        : "N/A",
    validityDays: currentValidityDays ?? undefined,
    expiryDate,
    issuer: check.issuer ?? undefined,
    totalValidityDays: totalValidityDays ?? undefined,
    percentRemaining: percentRemaining ?? undefined,
    protocols,
    vulnerabilities,
    securityChecks: check.securityChecks ?? parsedDetails.securityChecks,
    certDetails: check.certDetails ?? parsedDetails.certDetails,
    endpoints: check.endpoints ?? parsedDetails.endpoints,
    cipherSuites: check.cipherSuites ?? parsedDetails.cipherSuites,
    serverSignature: check.serverSignature ?? parsedDetails.serverSignature,
    alpnProtocols: check.alpnProtocols ?? parsedDetails.alpnProtocols,
    hsts: check.hsts ?? parsedDetails.hsts,
    checkedAt,
    nextCheckAt,
    cached: true,
  };
}

export function useCertificates() {
  const [results, setResults] = useState<CertificateResult[]>([]);
  const [domains, setDomainsState] = useState<string[]>(DEFAULT_DOMAINS);
  const [domainsLoaded, setDomainsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const hasInitialRun = useRef(false);

  const loadDomains = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/domains`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.domains) && data.domains.length > 0) {
          const domainsList = data.domains
            .map((d: any) => (typeof d === "string" ? d : d.domain))
            .filter(Boolean);
          if (domainsList.length > 0) {
            setDomainsState(domainsList);
            try {
              localStorage.setItem(LOCAL_STORAGE_DOMAINS_KEY, JSON.stringify(domainsList));
            } catch {
              // ignore storage errors
            }
            setDomainsLoaded(true);
            return;
          }
        }
      }
    } catch {
      // fallback para localStorage ou defaults
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_DOMAINS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDomainsState(parsed);
        }
      }
    } catch {
      // ignore
    }
    setDomainsLoaded(true);
  }, []);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  const analyzeDomain = useCallback(
    async (
      domain: string,
      options?: { force?: boolean; onProgress?: (msg: string) => void }
    ): Promise<CertificateResult> => {
      const maxPolls = 6;
      const pollDelayMs = 8000;

      try {
        let data: any = null;

        for (let poll = 0; poll < maxPolls; poll++) {
          const startNewParam = poll === 0 && options?.force ? "&startNew=on" : "";
          const res = await fetch(
            `${API_BASE}/analyze?host=${encodeURIComponent(domain)}${startNewParam}`
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}: Falha na análise`);
          data = await res.json();

          if (data.status === "READY" || data.status === "ERROR") {
            break;
          }

          // Se já temos certs retornados durante IN_PROGRESS e um endpoint com grade, podemos usar
          const hasCertsAndGrade =
            Array.isArray(data.certs) &&
            data.certs.length > 0 &&
            data.endpoints?.[0]?.grade;
          if (hasCertsAndGrade) {
            break;
          }

          if (poll < maxPolls - 1) {
            const progressMsg =
              data.status === "DNS"
                ? "Resolvendo DNS..."
                : `Analisando SSL (${poll + 1}/${maxPolls})...`;
            options?.onProgress?.(progressMsg);
            await new Promise((r) => setTimeout(r, pollDelayMs));
          }
        }

        const endpoints = Array.isArray(data?.endpoints) ? data.endpoints : [];
        const grades = endpoints.map((e: any) => e.grade).filter(Boolean);
        const worstGrade = resolveWorstGrade(grades);
        const grade = (worstGrade !== "N/A" ? worstGrade : endpoints[0]?.grade || "N/A") as CertificateResult["grade"];
        const status = data?.status;

        let validityDays: number | undefined;
        let expiryDate: string | undefined;
        let issuer: string | undefined;
        let totalValidityDays: number | undefined;
        let percentRemaining: number | undefined;

        const mainCert =
          data?.certs?.find(
            (c: any) =>
              c.commonNames?.includes(domain) || c.altNames?.includes(domain)
          ) || data?.certs?.[0];

        if (mainCert?.notAfter) {
          const expiryTs = mainCert.notAfter;
          const now = Date.now();
          validityDays = Math.floor((expiryTs - now) / (1000 * 60 * 60 * 24));
          expiryDate = new Date(expiryTs).toISOString();
          issuer = parseIssuerName(mainCert) || "Desconhecido";

          if (mainCert.notBefore) {
            const start = new Date(mainCert.notBefore).getTime();
            const end = new Date(mainCert.notAfter).getTime();
            totalValidityDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
            if (totalValidityDays && totalValidityDays > 0) {
              percentRemaining = Math.max(
                0,
                Math.min(100, Math.round((validityDays / totalValidityDays) * 100))
              );
            }
          }
        }

        const parsedDetails = parseSslLabsDetails(data, domain);

        const classification = classifyCertificateStatus({
          rawStatus: status,
          grade,
          validityDays,
          vulnerabilities: parsedDetails.vulnerabilities,
        });
        const certStatus = classification.status;
        const statusText = classification.statusText;

        const result: CertificateResult = {
          domain,
          grade: grade === "N/A" && certStatus === "timeout" ? "⏳" : grade,
          status: certStatus,
          statusText,
          icon: certStatus === "valid" ? "check-circle" : "alert-circle",
          statusClass: "",
          validity:
            validityDays !== undefined
              ? formatDaysRemaining(validityDays)
              : certStatus === "timeout"
                ? "Em processamento"
                : "Indisponível",
          validityDays,
          expiryDate,
          issuer: issuer || parsedDetails.certDetails?.issuerSubject,
          totalValidityDays,
          percentRemaining,
          protocols: parsedDetails.protocols,
          vulnerabilities: parsedDetails.vulnerabilities,
          securityChecks: parsedDetails.securityChecks,
          certDetails: parsedDetails.certDetails,
          endpoints: parsedDetails.endpoints,
          cipherSuites: parsedDetails.cipherSuites,
          serverSignature: parsedDetails.serverSignature,
          alpnProtocols: parsedDetails.alpnProtocols,
          hsts: parsedDetails.hsts,
          checkedAt: new Date().toISOString(),
          cached: false,
        };

        // Gravação agora é realizada automaticamente pelo Worker no endpoint /analyze
        return result;
      } catch (err: any) {
        return {
          domain,
          grade: "N/A",
          status: "error",
          statusText: "Erro na verificação",
          icon: "alert-circle",
          statusClass: "",
          validity: err.message || "Falha desconhecida",
          protocols: [],
          vulnerabilities: [],
          checkedAt: new Date().toISOString(),
          cached: false,
          error: err.message,
        };
      }
    },
    []
  );

  const runAnalysis = useCallback(
    async (options?: { force?: boolean; targetDomains?: string[] }) => {
      const listToRun = options?.targetDomains ?? domains;
      if (listToRun.length === 0) {
        setResults([]);
        return;
      }

      const force = Boolean(options?.force);

      setIsLoading(true);
      setError(null);
      setActiveDomain(null);

      // 1. DEFINIR PLACEHOLDERS IMEDIATAMENTE
      setResults((prev) => {
        const prevMap = new Map(prev.map((r) => [r.domain, r]));
        return listToRun.map((d) => {
          if (!force && prevMap.has(d) && prevMap.get(d)!.status !== "pending") {
            return prevMap.get(d)!;
          }
          return makePendingResult(d);
        });
      });

      const validCachedByDomain = new Map<string, CertificateResult>();

      // 2. BUSCAR CACHE NO CLOUDFLARE D1 EM UM ÚNICO REQUEST LEVE (/certs/summary)
      if (!force) {
        try {
          const res = await fetch(`${API_BASE}/certs/summary`);
          if (res.ok) {
            const data: any = await res.json();
            const checks: any[] = Array.isArray(data.checks) ? data.checks : [];
            const checksMap = new Map<string, any>(checks.map((c) => [c.domain, c]));

            for (const domain of listToRun) {
              const check = checksMap.get(domain);
              if (check && isCacheValid(check)) {
                const mapped = mapCachedCheckToResult(check);
                validCachedByDomain.set(domain, mapped);
              }
            }

            if (validCachedByDomain.size > 0) {
              setResults((prev) =>
                prev.map((r) => validCachedByDomain.get(r.domain) || r)
              );
            }
          }
        } catch {
          // ignore erro de rede e continua para verificação se necessário
        }
      }

      // 3. DOMÍNIOS QUE PRECISAM DE VERIFICAÇÃO
      const domainsToCheck = listToRun.filter(
        (d) => !validCachedByDomain.has(d)
      );

      if (domainsToCheck.length === 0) {
        setIsLoading(false);
        setActiveDomain(null);
        return;
      }

      // 4. VERIFICA EM BACKGROUND
      const batchSize = 3;
      const queue = [...domainsToCheck];
      const active = new Set<string>();

      const processQueue = async () => {
        const workers = Array.from(
          { length: Math.min(batchSize, queue.length) },
          async () => {
            while (queue.length > 0) {
              const domain = queue.shift();
              if (!domain) break;

              active.add(domain);
              setActiveDomain(domain);

              try {
                const result = await analyzeDomain(domain, {
                  force: false,
                  onProgress: (msg) => {
                    setResults((prev) =>
                      prev.map((r) =>
                        r.domain === domain
                          ? { ...r, statusText: msg, validity: msg }
                          : r
                      )
                    );
                  },
                });
                setResults((prev) => {
                  const exists = prev.find((r) => r.domain === domain);
                  if (exists) {
                    return prev.map((r) => (r.domain === domain ? result : r));
                  }
                  return [...prev, result];
                });
              } catch {
                // erro já tratado dentro de analyzeDomain
              } finally {
                active.delete(domain);
              }

              if (queue.length > 0) {
                await new Promise((r) => setTimeout(r, 1500));
              }
            }
          }
        );

        await Promise.all(workers);
        setIsLoading(false);
        setActiveDomain(null);
      };

      await processQueue();
    },
    [domains, analyzeDomain]
  );

  // Salvar domínios no backend D1 de forma autenticada e atômica
  const setDomains = useCallback(
    async (newDomains: string[], adminToken?: string) => {
      const cleaned = Array.from(
        new Set(newDomains.map((d) => d.trim().toLowerCase()).filter(Boolean))
      );
      if (cleaned.length === 0 && newDomains.length > 0) {
        throw new Error("Nenhum domínio válido para salvar.");
      }

      // Persistir no backend Cloudflare D1
      const token =
        adminToken ||
        (typeof window !== "undefined"
          ? sessionStorage.getItem("certmonitor_admin_token") || ""
          : "");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token.trim()}`;
      }

      const res = await fetch(`${API_BASE}/domains`, {
        method: "POST",
        headers,
        body: JSON.stringify({ domains: cleaned }),
      });

      if (!res.ok) {
        let msg = `Erro HTTP ${res.status} ao salvar domínios`;
        try {
          const body = await res.json();
          if (body.error) msg = body.error;
        } catch {
          // ignore
        }
        if (res.status === 401) {
          msg = "Acesso não autorizado: token de administrador inválido ou ausente.";
        }
        throw new Error(msg);
      }

      // Atualiza estado local e cache somente após sucesso confirmado no D1
      setDomainsState(cleaned);
      try {
        localStorage.setItem(LOCAL_STORAGE_DOMAINS_KEY, JSON.stringify(cleaned));
      } catch {
        // ignore
      }

      // Dispara análise para a nova lista
      runAnalysis({ force: false, targetDomains: cleaned });
    },
    [runAnalysis]
  );

  // Reverificar um único domínio sob demanda
  const refreshDomain = useCallback(
    async (domain: string) => {
      setActiveDomain(domain);
      setResults((prev) =>
        prev.map((r) =>
          r.domain === domain ? makePendingResult(domain, "Reverificando...") : r
        )
      );
      const updated = await analyzeDomain(domain, {
        force: false,
        onProgress: (msg) => {
          setResults((prev) =>
            prev.map((r) =>
              r.domain === domain ? { ...r, statusText: msg, validity: msg } : r
            )
          );
        },
      });
      setResults((prev) =>
        prev.map((r) => (r.domain === domain ? updated : r))
      );
      setActiveDomain(null);
      return updated;
    },
    [analyzeDomain]
  );

  // Dispara a verificação inicial após carregar os domínios
  useEffect(() => {
    if (domainsLoaded && domains.length > 0 && !hasInitialRun.current) {
      hasInitialRun.current = true;
      runAnalysis({ force: false, targetDomains: domains });
    }
  }, [domainsLoaded, domains, runAnalysis]);

  // Carregar detalhes completos de um domínio sob demanda (com ciphers, raw_response, etc.)
  const loadDomainDetails = useCallback(async (domain: string) => {
    try {
      const res = await fetch(`${API_BASE}/certs/${encodeURIComponent(domain)}`);
      if (res.ok) {
        const data: any = await res.json();
        if (data.check) {
          const mapped = mapCachedCheckToResult(data.check);
          setResults((prev) =>
            prev.map((r) => (r.domain === domain ? mapped : r))
          );
          return mapped;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const refresh = useCallback(() => {
    runAnalysis({ force: true });
  }, [runAnalysis]);

  return {
    results,
    domains,
    setDomains,
    isLoading,
    error,
    activeDomain,
    refresh,
    refreshDomain,
    loadDomains,
    loadDomainDetails,
  };
}

